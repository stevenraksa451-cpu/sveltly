'use client'
// components/layout/SearchPalette.tsx
// Palette de recherche (Cmd/Ctrl+K) — cherche en local dans les données déjà
// chargées par les hooks SWR existants (useEmails/useTasks/useCalendarEvents),
// jamais de nouvel appel serveur dédié à la recherche.
import { useEffect, useMemo, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import { useEmails } from '@/hooks/useEmails'
import { useTasks } from '@/hooks/useTasks'
import { useCalendarEvents } from '@/hooks/useCalendarEvents'
import styles from './SearchPalette.module.css'

const MAX_PER_GROUP = 5

export default function SearchPalette({ open, onClose }: { open: boolean; onClose: () => void }) {
  const router = useRouter()
  const [query, setQuery] = useState('')
  const inputRef = useRef<HTMLInputElement>(null)

  const { emails } = useEmails()
  const { tasks } = useTasks()
  const { events } = useCalendarEvents()

  useEffect(() => {
    if (!open) return
    setQuery('')
    const raf = requestAnimationFrame(() => inputRef.current?.focus())
    return () => cancelAnimationFrame(raf)
  }, [open])

  useEffect(() => {
    if (!open) return
    function onKeyDown(e: KeyboardEvent) {
      if (e.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [open, onClose])

  const q = query.trim().toLowerCase()

  const emailResults = useMemo(() => {
    if (!q) return []
    return (emails as any[])
      .filter(e => (e.subject || '').toLowerCase().includes(q) || (e.sender || '').toLowerCase().includes(q))
      .slice(0, MAX_PER_GROUP)
  }, [emails, q])

  const taskResults = useMemo(() => {
    if (!q) return []
    return (tasks as any[])
      .filter(t => (t.title || '').toLowerCase().includes(q))
      .slice(0, MAX_PER_GROUP)
  }, [tasks, q])

  const eventResults = useMemo(() => {
    if (!q) return []
    return (events as any[])
      .filter(ev => (ev.title || '').toLowerCase().includes(q))
      .slice(0, MAX_PER_GROUP)
  }, [events, q])

  const hasResults = emailResults.length + taskResults.length + eventResults.length > 0

  function goToEmail(id: string) {
    router.push(`/inbox?open=${encodeURIComponent(id)}`)
    onClose()
  }
  // Les tâches n'ont pas de sélection par id — on réutilise la recherche déjà
  // présente sur /tasks pour filtrer directement sur le titre.
  function goToTask(title: string) {
    router.push(`/tasks?q=${encodeURIComponent(title)}`)
    onClose()
  }
  // Idem pour l'agenda : la sélection existante se fait par date, pas par
  // événement précis — on amène l'utilisateur sur le bon jour.
  function goToEvent(date: string) {
    router.push(`/calendar?date=${encodeURIComponent(date)}`)
    onClose()
  }

  if (!open) return null

  return (
    <div className={styles.overlay} onClick={onClose}>
      <div className={styles.modal} onClick={e => e.stopPropagation()} role="dialog" aria-modal="true" aria-label="Recherche">
        <div className={styles.searchBar}>
          <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75">
            <circle cx="11" cy="11" r="8" />
            <path d="M21 21l-4.35-4.35" />
          </svg>
          <input
            ref={inputRef}
            className={styles.input}
            value={query}
            onChange={e => setQuery(e.target.value)}
            placeholder="Rechercher un email, une tâche, un événement..."
          />
          <span className={styles.kbd}>Échap</span>
        </div>

        <div className={styles.results}>
          {!q ? (
            <p className={styles.hint}>Tapez pour rechercher parmi vos emails, tâches et événements.</p>
          ) : !hasResults ? (
            <p className={styles.hint}>Aucun résultat pour « {query} ».</p>
          ) : (
            <>
              {emailResults.length > 0 && (
                <div className={styles.group}>
                  <p className={styles.groupLabel}>Emails</p>
                  {emailResults.map((e: any) => (
                    <button key={e.id} className={styles.result} onClick={() => goToEmail(e.id)} type="button">
                      <span className={styles.resultTitle}>{e.subject}</span>
                      <span className={styles.resultSub}>{e.sender}</span>
                    </button>
                  ))}
                </div>
              )}
              {taskResults.length > 0 && (
                <div className={styles.group}>
                  <p className={styles.groupLabel}>Tâches</p>
                  {taskResults.map((t: any) => (
                    <button key={t.id} className={styles.result} onClick={() => goToTask(t.title)} type="button">
                      <span className={styles.resultTitle}>{t.title}</span>
                    </button>
                  ))}
                </div>
              )}
              {eventResults.length > 0 && (
                <div className={styles.group}>
                  <p className={styles.groupLabel}>Agenda</p>
                  {eventResults.map((ev: any) => (
                    <button key={ev.id} className={styles.result} onClick={() => goToEvent(ev.date)} type="button">
                      <span className={styles.resultTitle}>{ev.title}</span>
                      <span className={styles.resultSub}>{ev.date}</span>
                    </button>
                  ))}
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  )
}
