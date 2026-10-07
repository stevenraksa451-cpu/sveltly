// hooks/useTasks.ts
import { useState } from 'react'
import useSWR from 'swr'
import { supabase } from '@/lib/supabase'

// Au-delà de cette ancienneté, une tâche terminée n'est plus chargée par
// défaut — sans cette limite, /tasks rapatriait l'historique complet des
// tâches terminées depuis la création du compte à CHAQUE visite (toujours
// plus volumineux avec le temps, donc toujours plus lent), alors que
// l'écrasante majorité de cet historique n'est jamais consultée une fois
// la tâche cochée. Les tâches actives (completed=false) ne sont, elles,
// jamais concernées par cette limite — seul l'historique des terminées.
const ARCHIVE_THRESHOLD_DAYS = 30

function archiveCutoffIso(): string {
  const d = new Date()
  d.setDate(d.getDate() - ARCHIVE_THRESHOLD_DAYS)
  return d.toISOString()
}

// Code Postgres "colonne inexistante" — tant que la migration ajoutant
// completed_at (supabase/migrations/20261001000000_tasks_completed_at.sql)
// n'a pas été appliquée à la base, on se replie sur l'ancien comportement
// (tout charger) plutôt que de casser la page Tâches entièrement.
const UNDEFINED_COLUMN = '42703'

async function fetchTasks() {
  // getSession() (pas getUser()) : évite un aller-retour réseau rien que
  // pour obtenir l'id déjà présent dans la session locale — ce hook tourne
  // en parallèle de useEmails/useCalendarEvents sur plusieurs pages à la
  // fois (dashboard, palette de recherche...), chaque appel getUser() s'y
  // additionnait inutilement.
  const { data: { session } } = await supabase.auth.getSession()
  const user = session?.user
  if (!user) throw new Error('Non authentifié')

  // Tâches actives + terminées récemment (< 30 jours) seulement. completed_at
  // est null pour les tâches encore actives ET pour les tâches terminées
  // avant l'ajout de cette colonne (migration) — on les inclut quand même
  // (via le "or") plutôt que de les faire disparaître silencieusement du
  // jour au lendemain pour les comptes existants.
  const { data, error } = await supabase
    .from('tasks')
    .select('*')
    .eq('user_id', user.id)
    .or(`completed.eq.false,completed_at.is.null,completed_at.gte.${archiveCutoffIso()}`)
    .order('position', { ascending: true })

  if (error) {
    if (error.code === UNDEFINED_COLUMN) return fetchTasksLegacy(user.id)
    throw error
  }
  return data || []
}

async function fetchTasksLegacy(userId: string) {
  const { data, error } = await supabase
    .from('tasks')
    .select('*')
    .eq('user_id', userId)
    .order('position', { ascending: true })
  if (error) throw error
  return data || []
}

// Tâches terminées plus anciennes que le seuil — chargées uniquement à la
// demande (voir le bouton "Charger les tâches terminées plus anciennes" dans
// /tasks), jamais au chargement initial de la page.
async function fetchArchivedTasks() {
  const { data: { session } } = await supabase.auth.getSession()
  const user = session?.user
  if (!user) throw new Error('Non authentifié')

  const { data, error } = await supabase
    .from('tasks')
    .select('*')
    .eq('user_id', user.id)
    .eq('completed', true)
    .not('completed_at', 'is', null)
    .lt('completed_at', archiveCutoffIso())
    .order('completed_at', { ascending: false })
    .limit(100)

  if (error) {
    if (error.code === UNDEFINED_COLUMN) return []
    throw error
  }
  return data || []
}

// Bascule completed + completed_at ensemble (voir fetchTasks pour pourquoi),
// avec repli si la colonne n'existe pas encore en base (migration pas encore
// appliquée) — sinon cocher une tâche échouerait silencieusement partout
// tant que la migration n'est pas passée. Partagé entre app/(app)/tasks et
// TasksCard plutôt que dupliqué, pour que ce repli n'ait qu'un seul endroit
// à tenir à jour.
export async function toggleTaskCompletion(id: string, completed: boolean): Promise<string | null> {
  const completedAt = !completed ? new Date().toISOString() : null
  const { error } = await supabase.from('tasks').update({ completed: !completed, completed_at: completedAt }).eq('id', id)
  if (error && (error.code === UNDEFINED_COLUMN || error.code === 'PGRST204')) {
    await supabase.from('tasks').update({ completed: !completed }).eq('id', id)
    return null
  }
  return completedAt
}

export function useTasks() {
  const { data, error, isLoading, mutate } = useSWR('tasks', fetchTasks, {
    revalidateOnFocus: false,
    dedupingInterval: 30000,
  })

  // État local, pas SWR : chargé une fois à la demande, jamais revalidé
  // automatiquement (un historique déjà terminé ne change pas tout seul).
  const [archivedTasks, setArchivedTasks] = useState<any[] | null>(null)
  const [archiveLoading, setArchiveLoading] = useState(false)

  async function loadArchivedTasks() {
    if (archivedTasks !== null || archiveLoading) return
    setArchiveLoading(true)
    try {
      setArchivedTasks(await fetchArchivedTasks())
    } finally {
      setArchiveLoading(false)
    }
  }

  return {
    tasks: data || [],
    loading: isLoading,
    error,
    refresh: mutate,
    archivedTasks,
    archiveLoading,
    loadArchivedTasks,
  }
}
