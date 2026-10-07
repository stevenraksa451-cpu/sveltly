// app/api/calendar/events/route.ts
// Création/suppression d'un événement calendrier créé manuellement (bouton
// "Ajouter" de /calendar), avec copie best-effort vers le vrai Google Calendar
// si l'utilisateur l'a connecté — même logique que la planification
// automatique par l'IA (app/api/emails/route.ts), via lib/google-calendar-sync.
// Route dédiée (plutôt qu'un insert/delete Supabase direct côté client) car la
// synchronisation Google nécessite le déchiffrement du token, qui ne doit
// jamais se faire côté navigateur.
import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { createGoogleCalendarEvent, deleteGoogleCalendarEvent } from '@/lib/google-calendar-sync'
import { resolveScheduling, ArrangeableEvent } from '@/lib/scheduling'
import { Priority } from '@/types'

function getUserClient(req: NextRequest) {
  const accessToken = req.headers.get('authorization')?.replace('Bearer ', '')
  if (!accessToken) return null
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    { global: { headers: { Authorization: `Bearer ${accessToken}` } } }
  )
}

export async function POST(req: NextRequest) {
  const supabase = getUserClient(req)
  if (!supabase) return NextResponse.json({ error: 'Non autorisé' }, { status: 401 })

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Non autorisé' }, { status: 401 })

  const { title, date, startTime, endTime, description, color, priority, force } = await req.json()
  if (!title || !date || !startTime || !endTime) {
    return NextResponse.json({ error: 'Champs manquants' }, { status: 400 })
  }
  const eventPriority: Priority = priority === 'urgent' || priority === 'important' ? priority : 'normal'

  // Détection de conflit (priority-aware — voir lib/scheduling.ts), sauf si
  // l'utilisateur a déjà choisi de forcer l'horaire demandé (bouton "Garder
  // quand même" côté formulaire, après avoir vu le conflit une première fois).
  if (!force) {
    const { data: profile } = await supabase
      .from('profiles')
      .select('work_start, work_end, buffer_minutes, default_event_duration')
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

    const result = resolveScheduling(date, startTime, endTime, eventPriority, existingEvents, prefs)

    if (result.status !== 'clear') {
      // Rien n'est écrit tant que l'utilisateur n'a pas choisi — voir le
      // panneau de conflit dans EventList.tsx.
      return NextResponse.json({
        conflict: true,
        status: result.status,
        requested: { date, startTime: result.startTime, endTime: result.endTime },
        conflicts: result.conflicts,
        alternative: result.alternative,
        displaced: result.displaced.map(m => ({ ...m, title: titleById.get(m.id) || '' })),
        atRiskOthers: result.atRiskOthers.map(m => ({ ...m, title: titleById.get(m.id) || '' })),
        pendingEvent: { title, date, startTime, endTime, description, color, priority: eventPriority },
      })
    }
  }

  const { data: inserted, error: insertError } = await supabase
    .from('calendar_events')
    .insert({
      user_id: user.id,
      title,
      date,
      start_time: startTime,
      end_time: endTime,
      description: description || '',
      color: color || '#1A73E8',
      priority: eventPriority,
    })
    .select()
    .single()

  if (insertError || !inserted) {
    return NextResponse.json({ error: insertError?.message || 'Création impossible' }, { status: 500 })
  }

  // Synchronisation Google Calendar réservée au forfait Pro (voir
  // /api/calendar/connect) — l'événement reste créé côté Sveltly dans tous les
  // cas, seule la copie vers Google est conditionnée au forfait.
  const { data: profile } = await supabase.from('profiles').select('plan, timezone').eq('id', user.id).single()

  // RLS ("Users manage own calendar accounts") laisse l'utilisateur lire sa
  // propre ligne avec ce même client — pas besoin du service role ici.
  const { data: calendarAccount } = profile?.plan === 'pro'
    ? await supabase
        .from('calendar_accounts')
        .select('id, access_token, refresh_token')
        .eq('user_id', user.id)
        .eq('is_connected', true)
        .maybeSingle()
    : { data: null }

  if (calendarAccount?.access_token) {
    const googleEventId = await createGoogleCalendarEvent(supabase, calendarAccount, {
      title,
      description: description || '',
      date,
      startTime,
      endTime,
      timeZone: profile?.timezone || 'Europe/Paris',
    })
    if (googleEventId) {
      await supabase.from('calendar_events').update({ google_event_id: googleEventId }).eq('id', inserted.id)
      inserted.google_event_id = googleEventId
    }
  }

  return NextResponse.json({ event: inserted })
}

export async function DELETE(req: NextRequest) {
  const supabase = getUserClient(req)
  if (!supabase) return NextResponse.json({ error: 'Non autorisé' }, { status: 401 })

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Non autorisé' }, { status: 401 })

  const id = req.nextUrl.searchParams.get('id')
  if (!id) return NextResponse.json({ error: 'id manquant' }, { status: 400 })

  // Lu avant suppression pour récupérer le google_event_id — RLS garantit que
  // l'utilisateur ne peut lire/supprimer que ses propres événements.
  const { data: existing } = await supabase
    .from('calendar_events')
    .select('id, google_event_id')
    .eq('id', id)
    .eq('user_id', user.id)
    .maybeSingle()

  const { error: deleteError } = await supabase
    .from('calendar_events')
    .delete()
    .eq('id', id)
    .eq('user_id', user.id)

  if (deleteError) {
    return NextResponse.json({ error: deleteError.message }, { status: 500 })
  }

  if (existing?.google_event_id) {
    const { data: profile } = await supabase.from('profiles').select('plan').eq('id', user.id).single()

    if (profile?.plan === 'pro') {
      const { data: calendarAccount } = await supabase
        .from('calendar_accounts')
        .select('id, access_token, refresh_token')
        .eq('user_id', user.id)
        .eq('is_connected', true)
        .maybeSingle()

      if (calendarAccount?.access_token) {
        await deleteGoogleCalendarEvent(supabase, calendarAccount, existing.google_event_id)
      }
    }
  }

  return NextResponse.json({ success: true })
}
