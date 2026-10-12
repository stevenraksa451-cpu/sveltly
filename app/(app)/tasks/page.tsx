'use client'
// app/(app)/tasks/page.tsx
import { useState, useMemo, useRef, Suspense } from 'react'
import { useSearchParams } from 'next/navigation'
import AppLayout from '@/components/layout/AppLayout'
import { supabase } from '@/lib/supabase'
import { useTasks, toggleTaskCompletion } from '@/hooks/useTasks'
import { TASK_CATEGORIES, TASK_PRIORITIES, TASK_PRIORITY_LABEL, TaskPriority, isTaskCategory } from '@/lib/tasks'
import styles from './tasks.module.css'

interface Task {
  id: string
  title: string
  // Toujours une valeur de TASK_CATEGORIES (lib/tasks.ts) — plus jamais un
  // nom d'expéditeur, qui vit désormais dans source_label.
  category: string | null
  // Provenance : le nom de l'expéditeur, pour une tâche née d'un email.
  source_label: string | null
  due_date: string | null
  priority: TaskPriority
  completed: boolean
  completed_at: string | null
  created_at: string
  position: number
  from_email_id: string | null
}

// Catégories et priorités viennent de lib/tasks.ts — exactement le jeu fermé
// appliqué côté serveur aux tâches créées depuis un email. Les deux listes
// divergeaient jusqu'ici : cette page proposait six catégories à la main
// pendant que le serveur y écrivait des noms d'expéditeurs.
const CATEGORIES = TASK_CATEGORIES
const PRIORITY_LABEL = TASK_PRIORITY_LABEL
const PRIORITY_ORDER = TASK_PRIORITIES

type SideFilter = 'all' | 'today' | 'upcoming' | 'overdue' | 'done'

function todayIso() { return new Date().toISOString().split('T')[0] }
function inDaysIso(n: number) { return new Date(Date.now() + n * 86400000).toISOString().split('T')[0] }
function tomorrowIso() { return inDaysIso(1) }

// Même logique de classement que le useMemo `grouped` plus bas, mais
// réutilisable aussi côté glisser-déposer (voir handleDragOver/handleDrop) —
// un seul endroit où "à quel groupe appartient cette tâche" est défini,
// pour que l'affichage et le comportement du drag restent toujours cohérents
// entre eux.
function groupKeyOf(t: Task, today: string): 'done' | 'none' | 'overdue' | 'today' | 'upcoming' {
  if (t.completed) return 'done'
  if (!t.due_date) return 'none'
  if (t.due_date < today) return 'overdue'
  if (t.due_date === today) return 'today'
  return 'upcoming'
}

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

// Depuis quand une tâche est terminée. Sans cette information, la liste
// « Terminées » est un mur indifférencié : rien ne distingue ce qui vient
// d'être coché de ce qui traîne depuis trois semaines, alors que c'est la
// seule chose qu'on y cherche.
function completedLabel(completedAt: string | null): string | null {
  if (!completedAt) return null
  const done = new Date(completedAt)
  if (Number.isNaN(done.getTime())) return null

  const startOfToday = new Date()
  startOfToday.setHours(0, 0, 0, 0)
  const days = Math.floor((startOfToday.getTime() - done.getTime()) / 86400000) + 1

  if (days <= 0) return "Terminée aujourd'hui"
  if (days === 1) return 'Terminée hier'
  if (days < 7) return `Terminée il y a ${days} jours`
  if (days < 30) return `Terminée il y a ${Math.floor(days / 7)} sem.`
  return `Terminée le ${done.toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' })}`
}

// Ligne secondaire d'une tâche : l'horodatage de complétion prime une fois la
// tâche cochée (c'est l'information utile à ce moment-là), sinon la
// provenance.
function rowSubtitle(t: Task): string | null {
  if (t.completed) return completedLabel(t.completed_at) ?? sourceOf(t)
  return sourceOf(t)
}

// Pont pour les lignes antérieures à la migration source_label : avant elle,
// la provenance était écrite dans `category`. Une valeur hors taxonomie EST
// donc une provenance, et s'affiche comme telle — pas comme une catégorie.
// Le littéral 'email' est écarté : repli d'une version encore plus ancienne,
// il n'apprend rien que la pastille enveloppe ne dise déjà.
function sourceOf(t: Task): string | null {
  if (t.source_label) return t.source_label
  if (t.category && !isTaskCategory(t.category) && t.category !== 'email') return t.category
  return null
}

// Catégorie affichable : uniquement une valeur du jeu fermé. Sans ce filtre,
// les anciennes lignes affichaient « Google » ou « email » en pastille de
// catégorie, et les faisaient apparaître dans le filtre latéral.
function displayCategory(t: Task): string | null {
  return isTaskCategory(t.category) ? t.category : null
}

// Recherche sur le titre, la catégorie ET la provenance. La provenance
// manquait : chercher « Google » ne ramenait plus rien une fois le nom de
// l'expéditeur sorti de `category`.
function matchesSearch(t: Task, q: string): boolean {
  return (
    t.title.toLowerCase().includes(q) ||
    (t.category || '').toLowerCase().includes(q) ||
    (t.source_label || '').toLowerCase().includes(q)
  )
}

// Raccourcis de date au-dessus du champ natif <input type="date"> dans les
// formulaires d'ajout/édition — couvre les cas les plus fréquents (aucune
// saisie de calendrier à ouvrir pour "aujourd'hui" ou "demain") sans retirer
// le champ natif, toujours là pour une date précise ou lointaine.
function DateChips({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  const options = [
    { label: "Aujourd'hui", date: todayIso() },
    { label: 'Demain', date: tomorrowIso() },
    { label: 'Dans 1 semaine', date: inDaysIso(7) },
  ]
  return (
    <div className={styles.dateChips}>
      {options.map(opt => (
        <button
          key={opt.label}
          type="button"
          className={`${styles.dateChip} ${value === opt.date ? styles.dateChipActive : ''}`}
          onClick={() => onChange(opt.date)}
        >
          {opt.label}
        </button>
      ))}
      <button
        type="button"
        className={`${styles.dateChip} ${!value ? styles.dateChipActive : ''}`}
        onClick={() => onChange('')}
      >
        Aucune
      </button>
    </div>
  )
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

  // Replanifie EN UN CLIC toutes les tâches en retard à aujourd'hui — sans
  // ça, rattraper un retard de 10 tâches veut dire 10 glisser-déposer (ou 10
  // éditions) d'affilée pour la même action répétitive. Le bouton apparaît
  // uniquement via la carte de conseil "Vous avez N tâches en retard" (voir
  // plus bas), déjà conditionnée à counts.overdue > 0.
  async function rescheduleOverdueToToday() {
    const overdue = (tasks as Task[]).filter(t => !t.completed && t.due_date && t.due_date < today)
    if (overdue.length === 0) return
    const overdueIds = new Set(overdue.map(t => t.id))
    refresh((current: Task[] = []) => current.map(t => overdueIds.has(t.id) ? { ...t, due_date: today } : t), { revalidate: false })
    await Promise.all(overdue.map(t => supabase.from('tasks').update({ due_date: today }).eq('id', t.id)))
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

  // N'affiche la ligne d'insertion (et donc n'autorise la dépose, voir
  // handleDrop) que pour une cible "sûre" : le même groupe que la tâche
  // glissée (simple réordonnancement, aucune date touchée), ou un groupe à
  // date unique et non ambiguë ("Aujourd'hui"/"Sans échéance"). Vers
  // "Prochainement"/"En retard"/"Terminées" depuis un AUTRE groupe, plusieurs
  // échéances différentes coexistent dans la cible : impossible de deviner
  // laquelle l'utilisateur visait, donc pas de dépose possible là.
  function handleDragOver(e: React.DragEvent, id: string, groupKey: string) {
    e.preventDefault()
    const draggedId = dragItemId.current
    if (draggedId && draggedId !== id) {
      const dragged = (tasks as Task[]).find(t => t.id === draggedId)
      if (dragged) {
        const draggedGroup = groupKeyOf(dragged, today)
        const invalidTarget = groupKey !== draggedGroup && groupKey !== 'today' && groupKey !== 'none'
        if (invalidTarget) {
          if (dragOverId) setDragOverId(null)
          return
        }
      }
    }
    if (id !== dragOverId) setDragOverId(id)
  }

  function handleDragLeave() {
    setDragOverId(null)
  }

  // Glisser une tâche sur une autre réordonne toujours au sein du MÊME
  // groupe. Glisser vers un AUTRE groupe replanifie en plus — mais
  // uniquement vers "Aujourd'hui" (due_date = aujourd'hui) ou "Sans
  // échéance" (due_date = null), les deux seuls groupes à date univoque ;
  // voir handleDragOver pour pourquoi les autres sont refusés. C'est ce qui
  // transforme le glisser-déposer en vraie façon de replanifier une tâche en
  // retard d'un geste, au lieu de devoir rouvrir l'édition pour ça.
  async function handleDrop(targetId: string, targetGroupKey: string) {
    const draggedId = dragItemId.current
    setDragOverId(null)
    dragItemId.current = null
    if (!draggedId || draggedId === targetId) return

    const currentList = tasks as Task[]
    const dragged = currentList.find(t => t.id === draggedId)
    const target = currentList.find(t => t.id === targetId)
    if (!dragged || !target) return

    const draggedGroup = groupKeyOf(dragged, today)
    let newDueDate: string | null | undefined
    if (targetGroupKey !== draggedGroup) {
      if (targetGroupKey === 'today') newDueDate = today
      else if (targetGroupKey === 'none') newDueDate = null
      else return
    }

    const fromIndex = currentList.findIndex(t => t.id === draggedId)
    const list = [...currentList]
    list.splice(fromIndex, 1)
    const toIndex = list.findIndex(t => t.id === targetId)
    list.splice(toIndex, 0, newDueDate !== undefined ? { ...dragged, due_date: newDueDate } : dragged)

    // Ne renumérote que la plage réellement déplacée (jamais tout le
    // tableau) — un simple glisser ne doit pas réécrire la position de
    // CHAQUE tâche de l'utilisateur en base à chaque fois.
    const lo = Math.min(fromIndex, toIndex)
    const hi = Math.max(fromIndex, toIndex)
    const touched = list.slice(lo, hi + 1).map((t, i) => ({ ...t, position: lo + i }))
    const touchedById = new Map(touched.map(t => [t.id, t]))
    const reordered = list.map(t => touchedById.get(t.id) || t)

    refresh(reordered, { revalidate: false })

    await Promise.all(
      touched.map(t => {
        const updates: Record<string, any> = { position: t.position }
        if (t.id === draggedId && newDueDate !== undefined) updates.due_date = newDueDate
        return supabase.from('tasks').update(updates).eq('id', t.id)
      })
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
      const cat = displayCategory(t)
      if (cat) map.set(cat, (map.get(cat) || 0) + 1)
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
    if (q) list = list.filter(t => matchesSearch(t, q))

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
    if (q) list = list.filter(t => matchesSearch(t, q))
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
      groups.find(g => g.key === groupKeyOf(t, today))!.items.push(t)
    })
    // Les tâches archivées (chargées à la demande) rejoignent le groupe
    // "Terminées" plutôt que d'en former un nouveau — la distinction récent/
    // archivé n'a de sens que pour la stratégie de chargement, pas pour
    // l'utilisateur qui regarde juste sa liste de tâches terminées.
    if (filteredArchived.length > 0) {
      const doneGroup = groups.find(g => g.key === 'done')!
      doneGroup.items = [...doneGroup.items, ...filteredArchived]
    }
    // Les terminées se lisent de la plus récente à la plus ancienne, pas dans
    // l'ordre `position` des autres groupes : `position` sert à organiser du
    // travail à venir, elle n'a plus de sens une fois la tâche cochée, et
    // elle plaçait une complétion d'il y a trois semaines au-dessus de celle
    // de ce matin. Les tâches sans completed_at (terminées avant l'ajout de
    // la colonne) ferment la liste.
    const doneGroup = groups.find(g => g.key === 'done')!
    doneGroup.items.sort((a, b) => (b.completed_at || '').localeCompare(a.completed_at || ''))
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
    <AppLayout title="Tâches" subtitle="Organisez vos tâches et suivez votre progression">
      <div className={styles.layout}>

        {/* Colonne gauche */}
        <div className={styles.sideCol}>
          <nav className={styles.sideNav}>
            <button className={`${styles.sideItem} ${sideFilter === 'all' && !categoryFilter ? styles.sideItemActive : ''}`} onClick={() => { setSideFilter('all'); setCategoryFilter(null) }}>
              <span className={styles.sideIcon}><svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><polyline points="9 11 12 14 22 4"/><path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11"/></svg></span>
              Toutes les tâches
              <span className={styles.sideCount}>{counts.all}</span>
            </button>
            <button className={`${styles.sideItem} ${sideFilter === 'today' ? styles.sideItemActive : ''}`} onClick={() => { setSideFilter('today'); setCategoryFilter(null) }}>
              <span className={styles.sideIcon}><svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><circle cx="12" cy="12" r="5"/><path d="M12 1v2M12 21v2M4.2 4.2l1.4 1.4M18.4 18.4l1.4 1.4M1 12h2M21 12h2M4.2 19.8l1.4-1.4M18.4 5.6l1.4-1.4"/></svg></span>
              Aujourd'hui
              <span className={styles.sideCount}>{counts.today}</span>
            </button>
            <button className={`${styles.sideItem} ${sideFilter === 'upcoming' ? styles.sideItemActive : ''}`} onClick={() => { setSideFilter('upcoming'); setCategoryFilter(null) }}>
              <span className={styles.sideIcon}><svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><rect x="3" y="4" width="18" height="18" rx="2"/><path d="M16 2v4M8 2v4M3 10h18"/></svg></span>
              Prochainement
              <span className={styles.sideCount}>{counts.upcoming}</span>
            </button>
            <button className={`${styles.sideItem} ${sideFilter === 'overdue' ? styles.sideItemActive : ''}`} onClick={() => { setSideFilter('overdue'); setCategoryFilter(null) }}>
              <span className={styles.sideIcon}><svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><circle cx="12" cy="12" r="10"/><path d="M12 6v6l4 2"/></svg></span>
              En retard
              <span className={`${styles.sideCount} ${counts.overdue > 0 ? styles.sideCountUrgent : ''}`}>{counts.overdue}</span>
            </button>
            <button className={`${styles.sideItem} ${sideFilter === 'done' ? styles.sideItemActive : ''}`} onClick={() => { setSideFilter('done'); setCategoryFilter(null) }}>
              <span className={styles.sideIcon}><svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><polyline points="20 6 9 17 4 12"/></svg></span>
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
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
              Nouvelle tâche
            </button>
          </div>

          <div className={styles.searchWrap}>
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
            <input
              className={styles.searchInput}
              placeholder="Rechercher une tâche..."
              value={search}
              onChange={e => setSearch(e.target.value)}
            />
            {search && (
              <button className={styles.searchClear} onClick={() => setSearch('')} title="Effacer">
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
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
              <DateChips value={newDueDate} onChange={setNewDueDate} />
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
                          <DateChips value={editDueDate} onChange={setEditDueDate} />
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
                        onDragOver={e => handleDragOver(e, task.id, group.key)}
                        onDragLeave={handleDragLeave}
                        onDrop={() => handleDrop(task.id, group.key)}
                      >
                        <span className={styles.dragHandle} title="Glisser pour réordonner, ou déposer sur « Aujourd'hui »/« Sans échéance » pour replanifier">
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
                          {/* Sous le titre : la PROVENANCE, et l'horodatage une
                              fois la tâche terminée. La catégorie est la
                              pastille plus à droite — les deux s'affichaient en
                              double avant, la même colonne portant les deux
                              notions. */}
                          {rowSubtitle(task) && <p className={styles.rowCategory}>{rowSubtitle(task)}</p>}
                        </div>
                        {task.from_email_id && (
                          <span className={styles.emailBadge} title="Créée automatiquement depuis un email">
                            <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><rect x="2" y="4" width="20" height="16" rx="2"/><path d="M2 8l10 6 10-6"/></svg>
                          </span>
                        )}
                        {displayCategory(task) && <span className={styles.categoryPill}>{displayCategory(task)}</span>}
                        <span className={`${styles.priorityPill} ${styles[task.priority]}`}>{PRIORITY_LABEL[task.priority]}</span>
                        {task.due_date && !task.completed && <span className={styles.dueLabel}>{dueLabel(task.due_date)}</span>}
                        <button className={styles.editBtn} onClick={() => startEdit(task)} title="Modifier">
                          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><path d="M12 20h9"/><path d="M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4Z"/></svg>
                        </button>
                        <button className={styles.deleteBtn} onClick={() => deleteTask(task.id)} title="Supprimer">
                          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
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
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><path d="M12 3v4M12 17v4M3 12h4M17 12h4M5.6 5.6l2.8 2.8M15.6 15.6l2.8 2.8M18.4 5.6l-2.8 2.8M8.4 15.6l-2.8 2.8"/></svg>
              </div>
              <p className={styles.adviceText}>
                Vous avez {counts.overdue} tâche{counts.overdue > 1 ? 's' : ''} en retard.
              </p>
              <div className={styles.adviceActions}>
                <button className={styles.adviceBtn} onClick={() => { setSideFilter('overdue'); setCategoryFilter(null) }}>
                  Voir les tâches en retard
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><path d="M5 12h14M12 5l7 7-7 7"/></svg>
                </button>
                <button className={styles.adviceBtnSecondary} onClick={rescheduleOverdueToToday}>
                  Tout replanifier à aujourd'hui
                </button>
              </div>
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
