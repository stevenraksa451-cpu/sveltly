// app/api/calendar/reorganize-day/route.ts
// Calcule (sans rien écrire) le plan de réarrangement d'une journée entière —
// pour le bouton "Réorganiser ma journée" de /calendar. Toujours un aperçu :
// l'application réelle passe par /api/calendar/apply-arrangement, une fois
// l'utilisateur ayant confirmé quels déplacements il accepte.
import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { resolveDayArrangement, ArrangeableEvent } from '@/lib/scheduling'

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

  const { date } = await req.json()
  if (!date) return NextResponse.json({ error: 'date manquante' }, { status: 400 })

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

  const { data: rows } = await supabase
    .from('calendar_events')
    .select('id, title, start_time, end_time, priority, origin, has_attendees, locked')
    .eq('user_id', user.id)
    .eq('date', date)

  const events: ArrangeableEvent[] = (rows || []).map((r: any) => ({
    id: r.id,
    date,
    startTime: r.start_time.slice(0, 5),
    endTime: r.end_time.slice(0, 5),
    priority: r.priority || 'normal',
    origin: r.origin || 'inflo',
    hasAttendees: r.has_attendees ?? false,
    locked: r.locked ?? false,
  }))

  const titleById = new Map((rows || []).map((r: any) => [r.id, r.title as string]))
  const arrangement = resolveDayArrangement(events, prefs)

  // Seuls les événements réellement affectés (déplacés, ou à risque de ne
  // pouvoir l'être) intéressent l'aperçu — ceux qui restent à leur horaire
  // d'origine sans conflit n'ont rien à montrer à l'utilisateur.
  const moves = arrangement
    .filter(m => m.moved || m.atRisk)
    .map(m => ({ ...m, title: titleById.get(m.id) || '' }))

  return NextResponse.json({ moves, hasConflicts: moves.length > 0 })
}
