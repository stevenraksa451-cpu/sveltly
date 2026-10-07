'use client'
import { memo } from 'react'
import Link from 'next/link'
import { CalendarEvent } from '@/types'
import PriorityBadge from '@/components/ui/PriorityBadge'
import { compareByStartTimeThenPriority } from '@/lib/scheduling'
import styles from './AgendaTimeline.module.css'

// memo : voir la même remarque dans TodayEssentials.tsx — `events` garde
// désormais une référence stable entre deux rendus du dashboard tant que les
// données n'ont pas changé.
function AgendaTimeline({ events, loading }: { events: CalendarEvent[]; loading: boolean }) {
  const today = new Date().toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long' })
  // Même comparateur que EventList (voir lib/scheduling.ts) : chronologique,
  // et à heure de début égale, urgent avant important avant normal — l'ordre
  // d'affichage ne doit jamais diverger entre le dashboard et l'agenda.
  const sorted = [...events].sort(compareByStartTimeThenPriority)

  return (
    <div className={styles.card}>
      <div className={styles.header}>
        <div className={styles.headerTitle}>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><rect x="3" y="4" width="18" height="18" rx="2"/><path d="M16 2v4M8 2v4M3 10h18"/></svg>
          <h3>Votre agenda</h3>
        </div>
        <Link href="/calendar" className={styles.viewLink}>
          Voir le calendrier
          <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M5 12h14M12 5l7 7-7 7"/></svg>
        </Link>
      </div>
      <p className={styles.date}>{today}</p>

      {loading ? (
        <div className={styles.timeline}>
          {[...Array(3)].map((_, i) => <div key={i} className={`${styles.skeletonItem} skeleton`} />)}
        </div>
      ) : sorted.length === 0 ? (
        <div className={styles.empty}>
          <p>Aucun événement prévu aujourd'hui.</p>
        </div>
      ) : (
        <div className={styles.timeline}>
          {sorted.map(event => (
            <div key={event.id} className={styles.timelineItem}>
              <div className={styles.timeCol}>
                <span className={styles.time}>{event.startTime}</span>
                <span className={styles.dot} style={{ background: event.color }} />
                <span className={styles.line} />
              </div>
              <div className={styles.eventContent} style={{ borderLeftColor: event.color }}>
                <div className={styles.eventTitleRow}>
                  <p className={styles.eventTitle}>{event.title}</p>
                  {(event.priority === 'urgent' || event.priority === 'important') && (
                    <PriorityBadge priority={event.priority} size="sm" />
                  )}
                </div>
                {event.description && <p className={styles.eventDesc}>{event.description}</p>}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

export default memo(AgendaTimeline)