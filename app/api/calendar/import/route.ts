// app/api/calendar/import/route.ts
// Sens inverse de la synchronisation : importe dans calendar_events les
// événements créés directement dans le vrai Google Calendar (pas depuis
// Sveltly), pour qu'ils apparaissent aussi dans l'agenda Sveltly. Les événements
// que Sveltly a lui-même poussés vers Google (déjà en base avec google_event_id)
// sont ignorés pour ne pas créer de doublon. Best-effort, ne bloque jamais le
// chargement de l'agenda : une erreur ici est silencieuse côté client.
import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { decryptToken, encryptToken } from '@/lib/token-crypto'

async function refreshAccessToken(refreshToken: string): Promise<string | null> {
  try {
    const res = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        client_id: process.env.GOOGLE_CLIENT_ID!,
        client_secret: process.env.GOOGLE_CLIENT_SECRET!,
        refresh_token: refreshToken,
        grant_type: 'refresh_token',
      }),
    })
    const data = await res.json()
    return data.access_token || null
  } catch {
    return null
  }
}

export async function GET(req: NextRequest) {
  const accessToken = req.headers.get('authorization')?.replace('Bearer ', '')
  if (!accessToken) return NextResponse.json({ error: 'Non autorisé' }, { status: 401 })

  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    { global: { headers: { Authorization: `Bearer ${accessToken}` } } }
  )

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Non autorisé' }, { status: 401 })

  // Fonctionnalité Pro — voir /api/calendar/connect. Un compte redescendu en
  // Gratuit après avoir connecté son calendrier ne doit pas continuer à
  // bénéficier de la synchronisation.
  const { data: profile } = await supabase.from('profiles').select('plan').eq('id', user.id).single()
  if (profile?.plan !== 'pro') return NextResponse.json({ imported: 0 })

  const { data: account } = await supabase
    .from('calendar_accounts')
    .select('id, access_token, refresh_token')
    .eq('user_id', user.id)
    .eq('is_connected', true)
    .maybeSingle()

  if (!account?.access_token) return NextResponse.json({ imported: 0 })

  // Fenêtre raisonnable : 30 jours passés → 1 an à venir, pour éviter
  // d'importer tout l'historique du calendrier Google de l'utilisateur.
  const timeMin = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString()
  const timeMax = new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString()

  let token = decryptToken(account.access_token)!

  async function fetchGoogleEvents(t: string, pageToken?: string) {
    const params = new URLSearchParams({
      timeMin, timeMax, singleEvents: 'true', orderBy: 'startTime', maxResults: '250',
    })
    if (pageToken) params.set('pageToken', pageToken)
    return fetch(`https://www.googleapis.com/calendar/v3/calendars/primary/events?${params.toString()}`, {
      headers: { Authorization: `Bearer ${t}` },
    })
  }

  // maxResults plafonne chaque page à 250 — sans pagination, un calendrier
  // chargé (réunions récurrentes sur la fenêtre de 13 mois) perdait
  // silencieusement tout ce qui dépassait la première page. Plafond de pages
  // en garde-fou, même esprit que MAX_HISTORY_PAGES dans api/emails.
  const MAX_IMPORT_PAGES = 10
  const googleEvents: any[] = []
  let pageToken: string | undefined
  let pageCount = 0

  do {
    let res = await fetchGoogleEvents(token, pageToken)

    if (res.status === 401 && account.refresh_token) {
      const refreshTokenPlain = decryptToken(account.refresh_token)
      const newToken = refreshTokenPlain ? await refreshAccessToken(refreshTokenPlain) : null
      if (newToken) {
        await supabase.from('calendar_accounts').update({ access_token: encryptToken(newToken) }).eq('id', account.id)
        token = newToken
        res = await fetchGoogleEvents(token, pageToken)
      }
    }

    if (!res.ok) {
      console.error('❌ Erreur lecture Google Calendar:', res.status)
      if (googleEvents.length === 0) return NextResponse.json({ imported: 0 })
      break
    }

    const data = await res.json()
    googleEvents.push(...(data.items || []))
    pageToken = data.nextPageToken
    pageCount++
  } while (pageToken && pageCount < MAX_IMPORT_PAGES)

  if (googleEvents.length === 0) return NextResponse.json({ imported: 0 })

  const { data: known } = await supabase
    .from('calendar_events')
    .select('google_event_id')
    .eq('user_id', user.id)
    .not('google_event_id', 'is', null)

  const knownIds = new Set((known || []).map((r: any) => r.google_event_id))

  const toInsert = googleEvents
    .filter(ev => ev.id && !knownIds.has(ev.id) && ev.status !== 'cancelled')
    .map(ev => {
      const isAllDay = !!ev.start?.date && !ev.start?.dateTime
      const date = isAllDay ? ev.start.date : ev.start.dateTime.slice(0, 10)
      const startTime = isAllDay ? '00:00' : ev.start.dateTime.slice(11, 16)
      const endTime = isAllDay ? '23:59' : (ev.end?.dateTime ? ev.end.dateTime.slice(11, 16) : startTime)
      return {
        user_id: user.id,
        title: ev.summary || '(Sans titre)',
        date,
        start_time: startTime,
        end_time: endTime,
        description: ev.description || '',
        color: '#1A73E8',
        google_event_id: ev.id,
        // 'google_import' : créé directement dans Google, pas par Sveltly — le
        // réarrangement de journée (voir lib/scheduling.ts) ne le déplace
        // jamais. hasAttendees pour la même raison (une réunion avec invités
        // ne doit jamais être déplacée unilatéralement par Sveltly).
        origin: 'google_import',
        has_attendees: Array.isArray(ev.attendees) && ev.attendees.length > 0,
      }
    })

  if (toInsert.length === 0) return NextResponse.json({ imported: 0 })

  const { error: insertError } = await supabase.from('calendar_events').insert(toInsert)
  if (insertError) {
    console.error('❌ Erreur import événements Google Calendar:', insertError.message)
    return NextResponse.json({ imported: 0 })
  }

  return NextResponse.json({ imported: toInsert.length })
}
