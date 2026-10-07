'use client'
// components/dashboard/TasksCard.tsx
import { useState, useMemo, memo } from 'react'
import Link from 'next/link'
import { supabase } from '@/lib/supabase'
import { useTasks, toggleTaskCompletion } from '@/hooks/useTasks'
import styles from './TasksCard.module.css'

interface Task {
  id: string
  title: string
  category: string | null
  due_date: string | null
  completed: boolean
  position: number
  from_email_id: string | null
}

function getDueLabel(dueDate: string | null): { text: string; urgent: boolean } {
  if (!dueDate) return { text: '', urgent: false }
  const today = new Date().toISOString().split('T')[0]
  const tomorrow = new Date(Date.now() + 86400000).toISOString().split('T')[0]

  if (dueDate < today) return { text: 'En retard', urgent: true }
  if (dueDate === today) return { text: "Aujourd'hui", urgent: true }
  if (dueDate === tomorrow) return { text: 'Demain', urgent: false }

  const d = new Date(dueDate + 'T00:00:00')
  return { text: d.toLocaleDateString('fr-FR', { weekday: 'long' }), urgent: false }
}

// memo : TasksCard ne reçoit aucune prop (données via son propre hook
// useTasks) — sans memo, il se re-rendait quand même à chaque rendu du
// dashboard parent pour une raison qui ne le concerne pas (ex: l'info-bulle
// "Temps économisé").
function TasksCard() {
  const { tasks, loading, refresh } = useTasks()
  const [adding, setAdding] = useState(false)
  const [newTitle, setNewTitle] = useState('')

  // Top 6 à afficher : non terminées d'abord, puis triées par échéance la plus proche
  const displayTasks = useMemo(() => {
    const list = [...(tasks as Task[])]
    list.sort((a, b) => {
      if (a.completed !== b.completed) return a.completed ? 1 : -1
      if (!a.due_date && !b.due_date) return 0
      if (!a.due_date) return 1
      if (!b.due_date) return -1
      return a.due_date < b.due_date ? -1 : 1
    })
    return list.slice(0, 6)
  }, [tasks])

  // Productivité du jour, dérivée de la même liste — pas de requête séparée.
  // "Tâches du jour" = celles échues aujourd'hui OU terminées aujourd'hui
  // (completed_at), pas seulement due_date === today comme avant : l'ancien
  // proxy ignorait tout travail réellement abattu aujourd'hui sur des tâches
  // sans échéance ou échues un autre jour, et donnait des pourcentages
  // trompeurs sur un échantillon d'une seule tâche.
  const productivity = useMemo(() => {
    const today = new Date().toISOString().split('T')[0]
    const completedToday = (t: any) => !!t.completed_at && t.completed_at.split('T')[0] === today
    const todayTasks = (tasks as any[]).filter(t => t.due_date === today || completedToday(t))
    if (todayTasks.length === 0) return null
    const done = todayTasks.filter(completedToday).length
    return { done, total: todayTasks.length }
  }, [tasks])

  async function toggleTask(id: string, completed: boolean) {
    // completed_at suit la même logique que app/(app)/tasks/page.tsx — requis
    // pour que l'archivage des tâches terminées (voir hooks/useTasks.ts)
    // fonctionne aussi pour les tâches cochées depuis cette carte.
    const completedAt = !completed ? new Date().toISOString() : null
    refresh((current: Task[] = []) => current.map(t => t.id === id ? { ...t, completed: !completed, completed_at: completedAt } : t), { revalidate: false })
    await toggleTaskCompletion(id, completed)
  }

  async function handleAdd() {
    if (!newTitle.trim()) return
    const { data: { session } } = await supabase.auth.getSession()
    const user = session?.user
    if (!user) return

    const minPosition = tasks.length > 0 ? Math.min(...(tasks as Task[]).map(t => t.position)) : 0

    const { data } = await supabase
      .from('tasks')
      .insert({ user_id: user.id, title: newTitle.trim(), position: minPosition - 1 })
      .select()
      .single()

    if (data) refresh((current: Task[] = []) => [data, ...current], { revalidate: false })
    setNewTitle('')
    setAdding(false)
  }

  const productivityPct = productivity && productivity.total > 0
    ? Math.round((productivity.done / productivity.total) * 100)
    : null

  return (
    <div className={styles.card}>
      <div className={styles.header}>
        <div className={styles.headerTitle}>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><polyline points="9 11 12 14 22 4"/><path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11"/></svg>
          <h3>Tâches récentes</h3>
        </div>
        <button className={styles.addBtn} onClick={() => setAdding(!adding)} title="Ajouter une tâche" aria-label="Ajouter une tâche">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
        </button>
      </div>

      {productivityPct !== null && (
        <div className={styles.productivity}>
          <div className={styles.productivityRow}>
            <span className={styles.productivityLabel}>Productivité du jour</span>
            <span className={styles.productivityValue}>{productivityPct}%</span>
          </div>
          <div className={styles.productivityBar}>
            <div className={styles.productivityFill} style={{ width: `${productivityPct}%` }} />
          </div>
          <span className={styles.productivitySub}>
            {productivity!.done} tâche{productivity!.done > 1 ? 's' : ''} terminée{productivity!.done > 1 ? 's' : ''} sur {productivity!.total}
          </span>
        </div>
      )}

      {adding && (
        <div className={styles.addRow}>
          <input
            className={styles.addInput}
            placeholder="Nouvelle tâche..."
            value={newTitle}
            onChange={e => setNewTitle(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && handleAdd()}
            autoFocus
          />
          <button className={styles.addConfirm} onClick={handleAdd}>Ajouter</button>
        </div>
      )}

      {loading && tasks.length === 0 ? (
        <div className={styles.list}>
          {[...Array(4)].map((_, i) => <div key={i} className={`${styles.skeletonItem} skeleton`} />)}
        </div>
      ) : displayTasks.length === 0 ? (
        <div className={styles.empty}><p>Aucune tâche pour l'instant.</p></div>
      ) : (
        <div className={styles.list}>
          {displayTasks.map(task => {
            const due = getDueLabel(task.due_date)
            return (
              <div key={task.id} className={`${styles.item} ${task.completed ? styles.itemDone : ''}`}>
                <button
                  className={styles.checkbox}
                  onClick={() => toggleTask(task.id, task.completed)}
                  aria-label={task.completed ? 'Marquer comme non terminée' : 'Marquer comme terminée'}
                >
                  {task.completed && (
                    <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="3"><polyline points="20 6 9 17 4 12"/></svg>
                  )}
                </button>
                <div className={styles.itemContent}>
                  <p className={styles.itemTitle}>{task.title}</p>
                  {task.category && task.category !== 'email' && <p className={styles.itemSub}>{task.category}</p>}
                </div>
                {task.from_email_id && (
                  <span className={styles.emailBadge} title="Créée automatiquement depuis un email">
                    <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="2" y="4" width="20" height="16" rx="2"/><path d="M2 8l10 6 10-6"/></svg>
                  </span>
                )}
                {due.text && !task.completed && (
                  <span className={`${styles.itemTag} ${due.urgent ? styles.tagUrgent : ''}`}>{due.text}</span>
                )}
              </div>
            )
          })}
        </div>
      )}

      <Link href="/tasks" className={styles.viewAll}>
        Voir toutes les tâches
        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M5 12h14M12 5l7 7-7 7"/></svg>
      </Link>
    </div>
  )
}

export default memo(TasksCard)
