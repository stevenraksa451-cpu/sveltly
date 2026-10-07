// hooks/useCalendarEvents.ts
import useSWR from 'swr'
import { supabase } from '@/lib/supabase'
import { CalendarEvent } from '@/types'

async function fetchCalendarEvents(): Promise<CalendarEvent[]> {
  // getSession() (pas getUser()) : même raison que hooks/useTasks.ts — pas
  // d'aller-retour réseau pour un id déjà disponible localement.
  const { data: { session } } = await supabase.auth.getSession()
  const user = session?.user
  if (!user) throw new Error('Non authentifié')

  const { data, error } = await supabase
    .from('calendar_events')
    .select('*')
    .eq('user_id', user.id)
    .order('date', { ascending: true })

  if (error) throw error

  return (data || []).map((e: any) => ({
    id: e.id,
    title: e.title,
    date: e.date,
    startTime: e.start_time?.slice(0, 5) || '09:00',
    endTime: e.end_time?.slice(0, 5) || '10:00',
    description: e.description,
    fromEmailId: e.from_email_id,
    color: e.color || '#1A73E8',
    // Repli 'normal'/'inflo'/false : colonnes ajoutées après coup (voir
    // lib/scheduling.ts) — un événement créé avant leur existence doit rester
    // flexible et de priorité normale, jamais traité comme fixe par erreur.
    priority: e.priority || 'normal',
    origin: e.origin || 'inflo',
    hasAttendees: e.has_attendees ?? false,
    locked: e.locked ?? false,
  }))
}

export function useCalendarEvents() {
  const { data, error, isLoading, mutate } = useSWR('calendar-events', fetchCalendarEvents, {
    revalidateOnFocus: false,
    dedupingInterval: 30000,
  })

  return {
    events: data || [],
    loading: isLoading,
    error,
    refresh: mutate,
  }
}
