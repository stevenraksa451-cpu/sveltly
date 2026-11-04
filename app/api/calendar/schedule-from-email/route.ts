// app/api/calendar/schedule-from-email/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { resolveScheduling, ArrangeableEvent } from '@/lib/scheduling'
import { Priority } from '@/types'
import { createGoogleCalendarEvent, updateGoogleCalendarEvent } from '@/lib/google-calendar-sync'

// Copie l’événement vers le vrai Google Calendar, comme le font déjà
// /api/calendar/events, /api/calendar/apply-arrangement et la planification
// automatique de /api/emails.
//
// Cette route était la SEULE des sept qui écrit un événement à ne jamais
// pousser vers Google. Conséquence visible pour un abonné Pro : « Ajouter à
// l’agenda » sans conflit laissait l’événement dans Sveltly uniquement,
// alors que le même geste AVEC conflit passait par apply-arrangement et
// arrivait bien dans Google. Même action, deux résultats — et comme
// /api/calendar/import ne fait que descendre de Google, l’événement ne
// remontait jamais ensuite.
//
// ⚠️ L’écriture locale est un upsert sur (user_id, from_email_id) : sur un
// double-clic ou une requête rejouée, la ligne EXISTE déjà et porte son
// google_event_id (l’upsert ne touche pas cette colonne, absente de la
// charge). Recréer aveuglément déposerait un doublon dans l’agenda de
// l’utilisateur — on met donc à jour quand l’identifiant est là.
//
// Best-effort, comme partout ailleurs : Supabase reste la source de vérité,
// un échec Google ne doit jamais faire échouer la création locale.
async function pousserVersGoogle(
  supabase: any,
  userId: string,
  ligne: any,
  plan: string | null | undefined,
  timezone: string | null | undefined
) {
  if (plan !== 'pro' || !ligne) return ligne

  const { data: compte } = await supabase
    .from('calendar_accounts')
    .select('id, access_token, refresh_token')
    .eq('user_id', userId)
    .eq('is_connected', true)
    .maybeSingle()

  if (!compte?.access_token) return ligne

  const charge = {
    title: ligne.title,
    description: ligne.description || '',
    date: ligne.date,
    startTime: String(ligne.start_time).slice(0, 5),
    endTime: String(ligne.end_time).slice(0, 5),
    timeZone: timezone || 'Europe/Paris',
  }

  if (ligne.google_event_id) {
    await updateGoogleCalendarEvent(supabase, compte, ligne.google_event_id, charge)
    return ligne
  }

  const googleEventId = await createGoogleCalendarEvent(supabase, compte, charge)
  if (googleEventId) {
    await supabase.from('calendar_events').update({ google_event_id: googleEventId }).eq('id', ligne.id)
    ligne.google_event_id = googleEventId
  }
  return ligne
}

export async function POST(req: NextRequest) {
  const { title, date, startTime, endTime, sourceSubject, sourceEmailId, priority, forceSlot } = await req.json()
  const eventPriority: Priority = priority === 'urgent' || priority === 'important' ? priority : 'normal'

  if (!date || !startTime) {
    return NextResponse.json({ error: 'Données d’événement manquantes' }, { status: 400 })
  }

  const authHeader = req.headers.get('authorization')
  const accessToken = authHeader?.replace('Bearer ', '')
  if (!accessToken) return NextResponse.json({ error: 'Non autorisé' }, { status: 401 })

  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    { global: { headers: { Authorization: `Bearer ${accessToken}` } } }
  )

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Non autorisé' }, { status: 401 })

  const { data: profile } = await supabase
    .from('profiles')
    .select('work_start, work_end, buffer_minutes, default_event_duration, plan, timezone')
    .eq('id', user.id)
    .single()

  const prefs = {
    workStart: profile?.work_start?.slice(0, 5) || '09:00',
    workEnd: profile?.work_end?.slice(0, 5) || '18:00',
    bufferMinutes: profile?.buffer_minutes ?? 15,
    defaultDurationMinutes: profile?.default_event_duration ?? 30,
  }

  const { data: existingRows } = await supabase
    .from('calendar_events')
    .select('id, title, date, start_time, end_time, priority, origin, has_attendees, locked')
    .eq('user_id', user.id)
    .eq('date', date)

  const existingEvents: ArrangeableEvent[] = (existingRows || []).map(e => ({
    id: e.id,
    date: e.date,
    startTime: e.start_time.slice(0, 5),
    endTime: e.end_time.slice(0, 5),
    priority: e.priority || 'normal',
    origin: e.origin || 'inflo',
    hasAttendees: e.has_attendees ?? false,
    locked: e.locked ?? false,
  }))
  const titleById = new Map((existingRows || []).map(e => [e.id, e.title as string]))

  // --- Créneau déjà confirmé par l'utilisateur (alternative acceptée, ou "garder quand même") ---
  if (forceSlot) {
    // upsert (pas insert) : calendar_events a une contrainte unique
    // (user_id, from_email_id) — un double-clic ou une requête rejouée sur
    // le même email renvoyait une erreur 500 générique au lieu de
    // simplement confirmer l'événement déjà créé.
    const { data: created, error } = await supabase
      .from('calendar_events')
      .upsert({
        user_id: user.id,
        title: title || sourceSubject,
        date,
        start_time: forceSlot.startTime,
        end_time: forceSlot.endTime,
        description: sourceSubject ? `Détecté depuis l’email : ${sourceSubject}` : null,
        from_email_id: sourceEmailId || null,
        color: '#1A73E8',
        priority: eventPriority,
      }, { onConflict: 'user_id,from_email_id' })
      .select()
      .single()

    if (error) return NextResponse.json({ error: 'Erreur lors de la création' }, { status: 500 })
    const evenement = await pousserVersGoogle(supabase, user.id, created, profile?.plan, profile?.timezone)
    return NextResponse.json({ status: 'created', event: evenement })
  }

  // --- Sinon, calcule s'il y a conflit (priority-aware — voir lib/scheduling.ts) ---
  const result = resolveScheduling(date, startTime, endTime || null, eventPriority, existingEvents, prefs)

  if (result.status === 'clear') {
    const { data: created, error } = await supabase
      .from('calendar_events')
      .upsert({
        user_id: user.id,
        title: title || sourceSubject,
        date,
        start_time: result.startTime,
        end_time: result.endTime,
        description: sourceSubject ? `Détecté depuis l’email : ${sourceSubject}` : null,
        from_email_id: sourceEmailId || null,
        color: '#1A73E8',
        priority: eventPriority,
      }, { onConflict: 'user_id,from_email_id' })
      .select()
      .single()

    if (error) return NextResponse.json({ error: 'Erreur lors de la création' }, { status: 500 })
    const evenement = await pousserVersGoogle(supabase, user.id, created, profile?.plan, profile?.timezone)
    return NextResponse.json({ status: 'created', event: evenement })
  }

  // Pas d'écriture tant que l'utilisateur n'a pas choisi — voir le panneau de
  // conflit dans InboxSidePanel.tsx. `pendingEvent` permet au frontend de
  // renvoyer exactement ces informations à /api/calendar/apply-arrangement
  // une fois le choix fait (accepter le créneau alternatif, ou réorganiser).
  return NextResponse.json({
    status: result.status,
    requested: { date, startTime: result.startTime, endTime: result.endTime },
    conflicts: result.conflicts,
    alternative: result.alternative,
    displaced: result.displaced.map(m => ({ ...m, title: titleById.get(m.id) || '' })),
    atRiskOthers: result.atRiskOthers.map(m => ({ ...m, title: titleById.get(m.id) || '' })),
    pendingEvent: {
      title: title || sourceSubject,
      date,
      startTime: result.startTime,
      endTime: result.endTime,
      description: sourceSubject ? `Détecté depuis l’email : ${sourceSubject}` : null,
      color: '#1A73E8',
      priority: eventPriority,
      sourceEmailId: sourceEmailId || null,
    },
  })
}
