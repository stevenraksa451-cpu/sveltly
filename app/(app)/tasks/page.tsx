'use client'
// app/(app)/tasks/page.tsx
import { useState, useMemo, useRef, Suspense } from 'react'
import { useSearchParams } from 'next/navigation'
import AppLayout from '@/components/layout/AppLayout'
import { supabase } from '@/lib/supabase'
import { useTasks, toggleTaskCompletion } from '@/hooks/useTasks'
import styles from './tasks.module.css'

interface Task {
  id: string
  title: string
  category: string | null
  due_date: string | null
  priority: 'urgent' | 'high' | 'medium' | 'low'
  completed: boolean
  completed_at: string | null
  created_at: string
  position: number
  from_email_id: string | null
}

const CATEGORIES = ['Client', 'Marketing', 'Équipe', 'Finance', 'Personnel', 'Autre']
const PRIORITY_LABEL: Record<string, string> = { urgent: 'Urgent', high: 'Haute', medium: 'Moyenne', low: 'Basse' }
const PRIORITY_ORDER = ['urgent', 'high', 'medium', 'low']

type SideFilter = 'all' | 'today' | 'upcoming' | 'overdue' | 'done'

function todayIso() { return new Date().toISOString().split('T')[0] }
function tomorrowIso() { return new Date(Date.now() + 86400000).toISOString().split('T')[0] }

function dueLabel(dueDate: string | null): string {
  if (!dueDate) return ''
  const today = todayIso()
  if (dueDate === today) return "Aujourd'hui"
  if (dueDate === tomorrowIso()) return 'Demain'
  const d = new Date(dueDate + 'T00:00:00')
  const diffDays = Math.round((d.getTime() - new Date(today).getTime()) / 86400000)
  if (diffDays > 0 && diffDays <= 6) return d.toLocaleDateString('fr-FR', { weekday: 'short' })
  return d.toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' })
}

function TasksContent() {
  const { tasks, loading, refresh, archivedTasks, archiveLoading, loadArchivedTasks } = useTasks()
  const searchParams = useSearchParams()
  const [sideFilter, setSideFilter] = useState<SideFilter>('all')
  const [categoryFilter, setCategoryFilter] = useState<string | null>(null)
  // Préremplie depuis la palette de recherche (Cmd/Ctrl+K) via /tasks?q=<titre>
  const [search, setSearch] = useState(searchParams.get('q') || '')

  const [adding, setAdding] = useState(false)
  const [newTitle, setNewTitle] = useState('')
  const [newCategory, setNewCategory] = useState('')
  const [newDueDate, setNewDueDate] = useState('')
  const [newPriority, setNewPriority] = useState<Task['priority']>('medium')
  const [saving, setSaving] = useState(false)

  // Édition inline
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editTitle, setEditTitle] = useState('')
  const [editCategory, setEditCategory] = useState('')
  const [editDueDate, setEditDueDate] = useState('')
  const [editPriority, setEditPriority] = useState<Task['priority']>('medium')

  // Glisser-déposer
  const dragItemId = useRef<string | null>(null)
  const [dragOverId, setDragOverId] = useState<string | null>(null)

  async function toggleTask(id: string, completed: boolean) {
    // completed_at posé/retiré ici (pas en base) — nécessaire pour que
    // useTasks ne charge par défaut que les tâches récemment terminées
    // (voir hooks/useTasks.ts) ; une re-ouverture efface la date pour que la
    // tâche redevienne "active" sans ambiguïté si elle est cochée à nouveau
    // plus tard.
    const completedAt = !completed ? new Date().toISOString() : null
    refresh((current: Task[] = []) => current.map(t => t.id === id ? { ...t, completed: !completed, completed_at: completedAt } : t), { revalidate: false })
    await toggleTaskCompletion(id, completed)
  }

  async function deleteTask(id: string) {
    refresh((current: Task[] = []) => current.filter(t => t.id !== id), { revalidate: false })
    await supabase.from('tasks').delete().eq('id', id)
  }

  async function handleAdd() {
    if (!newTitle.trim()) return
    setSaving(true)
    const { data: { session } } = await supabase.auth.getSession()
    const user = session?.user
    if (!user) { setSaving(false); return }
    const minPosition = tasks.length > 0 ? Math.min(...tasks.map((t: Task) => t.position)) : 0
    const { data } = await supabase.from('tasks').insert({
      user_id: user.id,
      title: newTitle.trim(),
      category: newCategory || null,
      due_date: newDueDate || null,
      priority: newPriority,
      position: minPosition - 1,
    }).select().single()

    if (data) refresh((current: Task[] = []) => [data, ...current], { revalidate: false })
    setNewTitle(''); setNewCategory(''); setNewDueDate(''); setNewPriority('medium')
    setAdding(false); setSaving(false)
  }

  // --- Édition inline ---
  function startEdit(task: Task) {
    setEditingId(task.id)
    setEditTitle(task.title)
    setEditCategory(task.category || '')
    setEditDueDate(task.due_date || '')
    setEditPriority(task.priority)
  }

  function cancelEdit() {
    setEditingId(null)
  }

  async function saveEdit(id: string) {
    if (!editTitle.trim()) return
    const updates = {
      title: editTitle.trim(),
      category: editCategory || null,
      due_date: editDueDate || null,
      priority: editPriority,
    }
    refresh((current: Task[] = []) => current.map(t => t.id === id ? { ...t, ...updates } : t), { revalidate: false })
    setEditingId(null)
    await supabase.from('tasks').update(updates).eq('id', id)
  }

  // --- Glisser-déposer (réordonne au sein du même groupe d'échéance) ---
  function handleDragStart(id: string) {
    dragItemId.current = id
  }

  function handleDragOver(e: React.DragEvent, id: string) {
    e.preventDefault()
    if (id !== dragOverId) setDragOverId(id)
  }

  function handleDragLeave() {
    setDragOverId(null)
  }

  async function handleDrop(targetId: string) {
    const draggedId = dragItemId.current
    setDragOverId(null)
    dragItemId.current = null
    if (!draggedId || draggedId === targetId) return

    const currentList = tasks as Task[]
    const fromIndex = currentList.findIndex(t => t.id === draggedId)
    const toIndex = currentList.findIndex(t => t.id === targetId)
    if (fromIndex === -1 || toIndex === -1) return

    const list = [...currentList]
    const [moved] = list.splice(fromIndex, 1)
    list.splice(toIndex, 0, moved)
    const reordered = list.map((t, i) => ({ ...t, position: i }))

    refresh(reordered, { revalidate: false })

    await Promise.all(
      reordered.map(t => supabase.from('tasks').update({ position: t.position }).eq('id', t.id))
    )
  }

  // Compteurs réels pour la sidebar
  const today = todayIso()
  const counts = useMemo(() => ({
    all: tasks.length,
    today: tasks.filter((t: Task) => !t.completed && t.due_date === today).length,
    upcoming: tasks.filter((t: Task) => !t.completed && t.due_date && t.due_date > today).length,
    overdue: tasks.filter((t: Task) => !t.completed && t.due_date && t.due_date < today).length,
    done: tasks.filter((t: Task) => t.completed).length,
  }), [tasks, today])

  // Catégories réellement présentes dans les tâches — pas de liste inventée
  const categories = useMemo(() => {
    const map = new Map<string, number>()
    tasks.forEach((t: Task) => {
      if (t.category && t.category !== 'email') map.set(t.category, (map.get(t.category) || 0) + 1)
    })
    return Array.from(map.entries())
  }, [tasks])

  const filtered = useMemo(() => {
    let list = tasks as Task[]
    if (sideFilter === 'today') list = list.filter(t => !t.completed && t.due_date === today)
    else if (sideFilter === 'upcoming') list = list.filter(t => !t.completed && t.due_date && t.due_date > today)
    else if (sideFilter === 'overdue') list = list.filter(t => !t.completed && t.due_date && t.due_date < today)
    else if (sideFilter === 'done') list = list.filter(t => t.completed)
    // 'all' : vraiment toutes les tâches (le libellé "Toutes les tâches" et le
    // compteur de la sidebar comptent déjà les terminées — les en exclure ici
    // créait une contradiction visible : badge "5" mais liste vide si tout est
    // terminé). Le groupe "Terminées" du regroupement ci-dessous les affiche
    // déjà séparément, donc rien d'autre à ajuster.

    if (categoryFilter) list = list.filter(t => t.category === categoryFilter)

    const q = search.trim().toLowerCase()
    if (q) list = list.filter(t => t.title.toLowerCase().includes(q) || (t.category || '').toLowerCase().includes(q))

    return list
  }, [tasks, sideFilter, categoryFilter, search, today])

  // Tâches terminées plus anciennes que 30 jours, uniquement une fois
  // chargées à la demande (voir loadArchivedTasks) — passées par les mêmes
  // filtres (recherche/catégorie) que le reste pour rester cohérentes avec
  // ce que l'utilisateur voit déjà à l'écran.
  const filteredArchived = useMemo(() => {
    let list = archivedTasks || []
    if (categoryFilter) list = list.filter(t => t.category === categoryFilter)
    const q = search.trim().toLowerCase()
    if (q) list = list.filter(t => t.title.toLowerCase().includes(q) || (t.category || '').toLowerCase().includes(q))
    return list
  }, [archivedTasks, categoryFilter, search])

  // Groupement par échéance pour l'affichage central
  const grouped = useMemo(() => {
    const groups: { key: string; label: string; items: Task[] }[] = [
      { key: 'overdue', label: 'En retard', items: [] },
      { key: 'today', label: "Aujourd'hui", items: [] },
      { key: 'upcoming', label: 'Prochainement', items: [] },
      { key: 'done', label: 'Terminées', items: [] },
      { key: 'none', label: 'Sans échéance', items: [] },
    ]
    filtered.forEach(t => {
      if (t.completed) groups.find(g => g.key === 'done')!.items.push(t)
      else if (!t.due_date) groups.find(g => g.key === 'none')!.items.push(t)
      else if (t.due_date < today) groups.find(g => g.key === 'overdue')!.items.push(t)
      else if (t.due_date === today) groups.find(g => g.key === 'today')!.items.push(t)
      else groups.find(g => g.key === 'upcoming')!.items.push(t)
    })
    // Les tâches archivées (chargées à la demande) rejoignent le groupe
    // "Terminées" plutôt que d'en former un nouveau — la distinction récent/
    // archivé n'a de sens que pour la stratégie de chargement, pas pour
    // l'utilisateur qui regarde juste sa liste de tâches terminées.
    if (filteredArchived.length > 0) {
      const doneGroup = groups.find(g => g.key === 'done')!
      doneGroup.items = [...doneGroup.items, ...filteredArchived]
    }
    // Le groupe "Terminées" reste affiché même vide quand on est explicitement
    // sur ce filtre (et que l'archive n'a pas encore été chargée) — sinon le
    // bouton pour charger les tâches terminées plus anciennes que 30 jours
    // devient injoignable pour un compte sans complétion récente.
    return groups.filter(g => g.items.length > 0 || (g.key === 'done' && sideFilter === 'done' && archivedTasks === null))
  }, [filtered, today, filteredArchived, sideFilter, archivedTasks])

  const completionRate = tasks.length > 0 ? Math.round((counts.done / tasks.length) * 100) : 0

  const priorityBreakdown = useMemo(() => {
    const active = tasks.filter((t: Task) => !t.completed)
    return PRIORITY_ORDER.map(p => ({
      key: p,
      label: PRIORITY_LABEL[p],
      count: active.filter((t: Task) => t.priority === p).length,
    }))
  }, [tasks])

  const total = tasks.length || 1
  const ringSegments = [
    { key: 'today', color: '#FBBF24', value: counts.today },
    { key: 'upcoming', color: '#2563EB', value: counts.upcoming },
    { key: 'overdue', color: '#EF4444', value: counts.overdue },
    { key: 'done', color: '#22C55E', value: counts.done },
  ]

  return (
    <AppLayout title="Tâches" subtitle="Organisez vos tâches et suivez votre progression.">
      <div className={styles.layout}>

        {/* Colonne gauche */}
        <div className={styles.sideCol}>
          <nav className={styles.sideNav}>
            <button className={`${styles.sideItem} ${sideFilter === 'all' && !categoryFilter ? styles.sideItemActive : ''}`} onClick={() => { setSideFilter('all'); setCategoryFilter(null) }}>
              <span className={styles.sideIcon}><svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><polyline points="9 11 12 14 22 4"/><path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11"/></svg></span>
              Toutes les tâches
              <span className={styles.sideCount}>{counts.all}</span>
            </button>
            <button className={`${styles.sideItem} ${sideFilter === 'today' ? styles.sideItemActive : ''}`} onClick={() => { setSideFilter('today'); setCategoryFilter(null) }}>
              <span className={styles.sideIcon}><svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><circle cx="12" cy="12" r="5"/><path d="M12 1v2M12 21v2M4.2 4.2l1.4 1.4M18.4 18.4l1.4 1.4M1 12h2M21 12h2M4.2 19.8l1.4-1.4M18.4 5.6l1.4-1.4"/></svg></span>
              Aujourd'hui
              <span className={styles.sideCount}>{counts.today}</span>
            </button>
            <button className={`${styles.sideItem} ${sideFilter === 'upcoming' ? styles.sideItemActive : ''}`} onClick={() => { setSideFilter('upcoming'); setCategoryFilter(null) }}>
              <span className={styles.sideIcon}><svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><rect x="3" y="4" width="18" height="18" rx="2"/><path d="M16 2v4M8 2v4M3 10h18"/></svg></span>
              Prochainement
              <span className={styles.sideCount}>{counts.upcoming}</span>
            </button>
            <button className={`${styles.sideItem} ${sideFilter === 'overdue' ? styles.sideItemActive : ''}`} onClick={() => { setSideFilter('overdue'); setCategoryFilter(null) }}>
              <span className={styles.sideIcon}><svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><circle cx="12" cy="12" r="10"/><path d="M12 6v6l4 2"/></svg></span>
              En retard
              <span className={`${styles.sideCount} ${counts.overdue > 0 ? styles.sideCountUrgent : ''}`}>{counts.overdue}</span>
            </button>
            <button className={`${styles.sideItem} ${sideFilter === 'done' ? styles.sideItemActive : ''}`} onClick={() => { setSideFilter('done'); setCategoryFilter(null) }}>
              <span className={styles.sideIcon}><svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><polyline points="20 6 9 17 4 12"/></svg></span>
              Terminées
              <span className={styles.sideCount}>{counts.done}</span>
            </button>
          </nav>

          {categories.length > 0 && (
            <div className={styles.categoriesBlock}>
              <p className={styles.categoriesTitle}>Catégories</p>
              {categories.map(([cat, count]) => (
                <button
                  key={cat}
                  className={`${styles.categoryItem} ${categoryFilter === cat ? styles.categoryItemActive : ''}`}
                  onClick={() => setCategoryFilter(categoryFilter === cat ? null : cat)}
                >
                  <span className={styles.categoryDot} />
                  {cat}
                  <span className={styles.sideCount}>{count}</span>
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Colonne centrale */}
        <div className={styles.mainCol}>
          <div className={styles.mainHeader}>
            <div>
              <h2 className={styles.mainTitle}>
                {sideFilter === 'all' ? 'Toutes les tâches' : sideFilter === 'today' ? "Aujourd'hui" : sideFilter === 'upcoming' ? 'Prochainement' : sideFilter === 'overdue' ? 'En retard' : 'Terminées'}
              </h2>
              <p className={styles.mainSub}>{filtered.length} tâche{filtered.length !== 1 ? 's' : ''}</p>
            </div>
            <button className={styles.addBtn} onClick={() => setAdding(!adding)}>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
              Nouvelle tâche
            </button>
          </div>

          <div className={styles.searchWrap}>
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
            <input
              className={styles.searchInput}
              placeholder="Rechercher une tâche..."
              value={search}
              onChange={e => setSearch(e.target.value)}
            />
            {search && (
              <button className={styles.searchClear} onClick={() => setSearch('')} title="Effacer">
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
              </button>
            )}
          </div>

          {adding && (
            <div className={styles.addCard}>
              <input
                className={styles.addTitleInput}
                placeholder="Titre de la tâche..."
                value={newTitle}
                onChange={e => setNewTitle(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && handleAdd()}
                autoFocus
              />
              <div className={styles.addRow}>
                <select className={styles.addSelect} value={newCategory} onChange={e => setNewCategory(e.target.value)}>
                  <option value="">Sans catégorie</option>
                  {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
                </select>
                <select className={styles.addSelect} value={newPriority} onChange={e => setNewPriority(e.target.value as Task['priority'])}>
                  {PRIORITY_ORDER.map(p => <option key={p} value={p}>{PRIORITY_LABEL[p]}</option>)}
                </select>
                <input type="date" className={styles.addDate} value={newDueDate} onChange={e => setNewDueDate(e.target.value)} />
                <button className={styles.cancelBtn} onClick={() => setAdding(false)}>Annuler</button>
                <button className={styles.saveBtn} onClick={handleAdd} disabled={!newTitle.trim() || saving}>
                  {saving ? 'Ajout...' : 'Ajouter'}
                </button>
              </div>
            </div>
          )}

          <div className={styles.groups}>
            {loading && tasks.length === 0 ? (
              [...Array(4)].map((_, i) => <div key={i} className={`${styles.skeletonRow} skeleton`} />)
            ) : grouped.length === 0 ? (
              <div className={styles.empty}>
                <p className={styles.emptyTitle}>{search ? 'Aucun résultat' : 'Rien ici pour l\'instant'}</p>
                <p className={styles.emptyDesc}>{search ? 'Essayez un autre terme de recherche.' : 'Cliquez sur "Nouvelle tâche" pour en ajouter une.'}</p>
              </div>
            ) : (
              grouped.map(group => (
                <div key={group.key} className={styles.group}>
                  <div className={styles.groupHead}>
                    <span className={styles.groupLabel}>{group.label}</span>
                    <span className={styles.groupCount}>{group.items.length}</span>
                  </div>
                  {group.items.map(task => {
                    if (editingId === task.id) {
                      return (
                        <div key={task.id} className={styles.editCard}>
                          <input
                            className={styles.addTitleInput}
                            value={editTitle}
                            onChange={e => setEditTitle(e.target.value)}
                            onKeyDown={e => e.key === 'Enter' && saveEdit(task.id)}
                            autoFocus
                          />
                          <div className={styles.addRow}>
                            <select className={styles.addSelect} value={editCategory} onChange={e => setEditCategory(e.target.value)}>
                              <option value="">Sans catégorie</option>
                              {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
                            </select>
                            <select className={styles.addSelect} value={editPriority} onChange={e => setEditPriority(e.target.value as Task['priority'])}>
                              {PRIORITY_ORDER.map(p => <option key={p} value={p}>{PRIORITY_LABEL[p]}</option>)}
                            </select>
                            <input type="date" className={styles.addDate} value={editDueDate} onChange={e => setEditDueDate(e.target.value)} />
                            <button className={styles.cancelBtn} onClick={cancelEdit}>Annuler</button>
                            <button className={styles.saveBtn} onClick={() => saveEdit(task.id)} disabled={!editTitle.trim()}>
                              Enregistrer
                            </button>
                          </div>
                        </div>
                      )
                    }

                    return (
                      <div
                        key={task.id}
                        className={`${styles.row} ${task.completed ? styles.rowDone : ''} ${dragOverId === task.id ? styles.rowDragOver : ''}`}
                        draggable
                        onDragStart={() => handleDragStart(task.id)}
                        onDragOver={e => handleDragOver(e, task.id)}
                        onDragLeave={handleDragLeave}
                        onDrop={() => handleDrop(task.id)}
                      >
                        <span className={styles.dragHandle} title="Glisser pour réordonner">
                          <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor"><circle cx="9" cy="6" r="1.4"/><circle cx="15" cy="6" r="1.4"/><circle cx="9" cy="12" r="1.4"/><circle cx="15" cy="12" r="1.4"/><circle cx="9" cy="18" r="1.4"/><circle cx="15" cy="18" r="1.4"/></svg>
                        </span>
                        <button
                          className={styles.checkbox}
                          onClick={() => toggleTask(task.id, task.completed)}
                          aria-label={task.completed ? 'Marquer comme non terminée' : 'Marquer comme terminée'}
                        >
                          {task.completed && <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="3"><polyline points="20 6 9 17 4 12"/></svg>}
                        </button>
                        <div className={styles.rowContent} onClick={() => startEdit(task)} title="Cliquer pour modifier">
                          <p className={styles.rowTitle}>{task.title}</p>
                          {task.category && <p className={styles.rowCategory}>{task.category}</p>}
                        </div>
                        {task.from_email_id && (
                          <span className={styles.emailBadge} title="Créée automatiquement depuis un email">
                            <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="2" y="4" width="20" height="16" rx="2"/><path d="M2 8l10 6 10-6"/></svg>
                          </span>
                        )}
                        {task.category && task.category !== 'email' && <span className={styles.categoryPill}>{task.category}</span>}
                        <span className={`${styles.priorityPill} ${styles[task.priority]}`}>{PRIORITY_LABEL[task.priority]}</span>
                        {task.due_date && !task.completed && <span className={styles.dueLabel}>{dueLabel(task.due_date)}</span>}
                        <button className={styles.editBtn} onClick={() => startEdit(task)} title="Modifier">
                          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M12 20h9"/><path d="M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4Z"/></svg>
                        </button>
                        <button className={styles.deleteBtn} onClick={() => deleteTask(task.id)} title="Supprimer">
                          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
                        </button>
                      </div>
                    )
                  })}
                  {group.key === 'done' && archivedTasks === null && (
                    <button
                      className={styles.loadArchiveBtn}
                      onClick={loadArchivedTasks}
                      disabled={archiveLoading}
                    >
                      {archiveLoading ? 'Chargement...' : 'Charger les tâches terminées plus anciennes (30+ jours)'}
                    </button>
                  )}
                </div>
              ))
            )}
          </div>
        </div>

        {/* Colonne droite */}
        <div className={styles.rightCol}>
          <div className={styles.card}>
            <p className={styles.cardTitle}>Résumé</p>
            <div className={styles.ringWrap}>
              <svg width="120" height="120" viewBox="0 0 120 120" className={styles.ringSvg}>
                {(() => {
                  let offset = 0
                  const circumference = 2 * Math.PI * 50
                  return ringSegments.map(seg => {
                    const fraction = seg.value / total
                    const dash = fraction * circumference
                    const el = (
                      <circle
                        key={seg.key}
                        cx="60" cy="60" r="50"
                        fill="none"
                        stroke={seg.color}
                        strokeWidth="14"
                        strokeDasharray={`${dash} ${circumference - dash}`}
                        strokeDashoffset={-offset}
                        transform="rotate(-90 60 60)"
                      />
                    )
                    offset += dash
                    return el
                  })
                })()}
              </svg>
              <div className={styles.ringCenter}>
                <span className={styles.ringValue}>{tasks.length}</span>
                <span className={styles.ringLabel}>tâches</span>
              </div>
            </div>
            <div className={styles.legend}>
              <div className={styles.legendItem}><span className={styles.legendDot} style={{ background: '#FBBF24' }} />Aujourd'hui<span className={styles.legendCount}>{counts.today}</span></div>
              <div className={styles.legendItem}><span className={styles.legendDot} style={{ background: '#2563EB' }} />Prochainement<span className={styles.legendCount}>{counts.upcoming}</span></div>
              <div className={styles.legendItem}><span className={styles.legendDot} style={{ background: '#EF4444' }} />En retard<span className={styles.legendCount}>{counts.overdue}</span></div>
              <div className={styles.legendItem}><span className={styles.legendDot} style={{ background: '#22C55E' }} />Terminées<span className={styles.legendCount}>{counts.done}</span></div>
            </div>
          </div>

          <div className={styles.card}>
            <p className={styles.cardTitle}>Productivité</p>
            <p className={styles.completionRate}>{completionRate}%</p>
            <p className={styles.completionLabel}>Taux d'achèvement global</p>
            <div className={styles.progressTrack}>
              <div className={styles.progressFill} style={{ width: `${completionRate}%` }} />
            </div>
          </div>

          <div className={styles.card}>
            <p className={styles.cardTitle}>Priorités</p>
            {priorityBreakdown.map(p => (
              <div key={p.key} className={styles.priorityRow}>
                <span className={`${styles.priorityDot} ${styles[p.key]}`} />
                {p.label}
                <span className={styles.priorityCount}>{p.count}</span>
              </div>
            ))}
          </div>

          {counts.overdue > 0 && (
            <div className={styles.adviceCard}>
              <div className={styles.adviceIcon}>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><path d="M12 3v4M12 17v4M3 12h4M17 12h4M5.6 5.6l2.8 2.8M15.6 15.6l2.8 2.8M18.4 5.6l-2.8 2.8M8.4 15.6l-2.8 2.8"/></svg>
              </div>
              <p className={styles.adviceText}>
                Vous avez {counts.overdue} tâche{counts.overdue > 1 ? 's' : ''} en retard.
              </p>
              <button className={styles.adviceBtn} onClick={() => { setSideFilter('overdue'); setCategoryFilter(null) }}>
                Voir les tâches en retard
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M5 12h14M12 5l7 7-7 7"/></svg>
              </button>
            </div>
          )}
        </div>

      </div>
    </AppLayout>
  )
}

export default function TasksPage() {
  return (
    <Suspense fallback={null}>
      <TasksContent />
    </Suspense>
  )
}
