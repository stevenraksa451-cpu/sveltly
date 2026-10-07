// app/api/calendar/apply-arrangement/route.ts
// Point d'écriture UNIQUE pour tout plan de réarrangement de journée (voir
// lib/scheduling.ts) — utilisé par les 3 points d'intégration (création
// manuelle, création depuis un email, bouton "Réorganiser ma journée").
// N'écrit QUE ce que l'utilisateur a explicitement confirmé côté client :
// cette route ne recalcule rien, elle applique le plan tel qu'approuvé.
// Supabase reste la source de vérité ; la copie vers Google Calendar est
// toujours best-effort et ne fait jamais échouer la requête (voir
// google_sync_pending, qui garde une trace d'un échec pour une resynchro
// ultérieure plutôt que de la faire disparaître silencieusement).
import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { isFixedEvent } from '@/lib/scheduling'
import { createGoogleCalendarEvent, updateGoogleCalendarEvent } from '@/lib/google-calendar-sync'

interface MoveInput { id: string; startTime: string; endTime: string }
interface NewEventInput {
  title: string
  date: string
  startTime: string
  endTime: string
  description?: string
  color?: string
  priority?: string
  sourceEmailId?: string
}

export async function POST(req: NextRequest) {
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

  const { moves, newEvent } = (await req.json()) as { moves?: MoveInput[]; newEvent?: NewEventInput }

  const { data: profile } = await supabase.from('profiles').select('plan, timezone').eq('id', user.id).single()
  const timeZone = profile?.timezone || 'Europe/Paris'

  // Synchronisation Google réservée au forfait Pro (même règle que partout
  // ailleurs dans le code — voir /api/calendar/events).
  const { data: calendarAccount } = profile?.plan === 'pro'
    ? await supabase
        .from('calendar_accounts')
        .select('id, access_token, refresh_token')
        .eq('user_id', user.id)
        .eq('is_connected', true)
        .maybeSingle()
    : { data: null }

  const updated: any[] = []
  const syncWarnings: string[] = []

  if (Array.isArray(moves) && moves.length > 0) {
    const ids = moves.map(m => m.id)
    const { data: rows } = await supabase
      .from('calendar_events')
      .select('id, title, description, date, google_event_id, origin, has_attendees, locked')
      .eq('user_id', user.id)
      .in('id', ids)

    const rowById = new Map((rows || []).map((r: any) => [r.id, r]))

    for (const move of moves) {
      const row = rowById.get(move.id)
      if (!row) continue

      // Re-vérifié côté serveur, jamais déduit du seul payload client (qui
      // pourrait être obsolète si l'événement a changé entre temps, ou
      // altéré) — voir isFixedEvent dans lib/scheduling.ts.
      if (isFixedEvent({ origin: row.origin || 'inflo', hasAttendees: row.has_attendees ?? false, locked: row.locked ?? false })) {
        syncWarnings.push(`"${row.title}" est verrouillé ou non modifiable — non déplacé.`)
        continue
      }

      const { data: savedRow, error: updateError } = await supabase
        .from('calendar_events')
        .update({ start_time: move.startTime, end_time: move.endTime })
        .eq('id', move.id)
        .eq('user_id', user.id)
        .select()
        .single()

      if (updateError || !savedRow) {
        syncWarnings.push(`"${row.title}" n'a pas pu être déplacé.`)
        continue
      }

      let googleSyncPending = false
      if (row.google_event_id && calendarAccount?.access_token) {
        const ok = await updateGoogleCalendarEvent(supabase, calendarAccount, row.google_event_id, {
          title: row.title,
          description: row.description || '',
          date: row.date,
          startTime: move.startTime,
          endTime: move.endTime,
          timeZone,
        })
        googleSyncPending = !ok
        if (!ok) {
          syncWarnings.push(`"${row.title}" déplacé dans Sveltly, mais la synchronisation vers Google a échoué — nouvelle tentative à la prochaine synchro.`)
        }
      }

      await supabase.from('calendar_events').update({ google_sync_pending: googleSyncPending }).eq('id', move.id)
      updated.push({ ...savedRow, google_sync_pending: googleSyncPending })
    }
  }

  let insertedEvent: any = null
  if (newEvent) {
    const payload = {
      user_id: user.id,
      title: newEvent.title,
      date: newEvent.date,
      start_time: newEvent.startTime,
      end_time: newEvent.endTime,
      description: newEvent.description || '',
      color: newEvent.color || '#1A73E8',
      priority: newEvent.priority || 'normal',
      from_email_id: newEvent.sourceEmailId || null,
    }

    // upsert (pas insert) uniquement quand l'événement vient d'un email
    // précis (contrainte unique user_id,from_email_id — voir
    // supabase-schema.sql) : un double-clic ou une requête rejouée confirme
    // alors l'événement déjà créé plutôt que d'échouer sur la contrainte.
    const { data: inserted, error: insertError } = newEvent.sourceEmailId
      ? await supabase.from('calendar_events').upsert(payload, { onConflict: 'user_id,from_email_id' }).select().single()
      : await supabase.from('calendar_events').insert(payload).select().single()

    if (insertError || !inserted) {
      syncWarnings.push('La création du nouvel événement a échoué.')
    } else {
      insertedEvent = inserted
      if (calendarAccount?.access_token) {
        const googleEventId = await createGoogleCalendarEvent(supabase, calendarAccount, {
          title: newEvent.title,
          description: newEvent.description || '',
          date: newEvent.date,
          startTime: newEvent.startTime,
          endTime: newEvent.endTime,
          timeZone,
        })
        if (googleEventId) {
          await supabase.from('calendar_events').update({ google_event_id: googleEventId }).eq('id', inserted.id)
          insertedEvent.google_event_id = googleEventId
        } else {
          syncWarnings.push(`"${newEvent.title}" créé dans Sveltly, mais la synchronisation vers Google a échoué.`)
        }
      }
    }
  }

  return NextResponse.json({ updated, newEvent: insertedEvent, syncWarnings })
}
