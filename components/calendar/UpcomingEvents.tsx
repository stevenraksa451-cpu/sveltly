'use client'
import { CalendarEvent } from '@/types'
import styles from './UpcomingEvents.module.css'

function getRelativeLabel(date: string, startTime: string): { text: string; tone: 'urgent' | 'soon' | 'later' | 'planned' } {
  const now = new Date()
  const eventDateTime = new Date(`${date}T${startTime}:00`)
  const diffMs = eventDateTime.getTime() - now.getTime()
  const diffMin = Math.round(diffMs / 60000)
  const diffH = Math.round(diffMin / 60)
  const diffDays = Math.round(diffH / 24)

  if (diffMin < 0) return { text: 'En cours', tone: 'urgent' }
  if (diffMin < 60) return { text: `Dans ${diffMin} min`, tone: 'urgent' }
  if (diffH < 24) return { text: `Dans ${diffH}h`, tone: 'soon' }
  if (diffDays === 1) return { text: 'Demain', tone: 'later' }
  if (diffDays <= 6) return { text: eventDateTime.toLocaleDateString('fr-FR', { weekday: 'long' }), tone: 'planned' }
  return { text: eventDateTime.toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' }), tone: 'planned' }
}

export default function UpcomingEvents({ events }: { events: CalendarEvent[] }) {
  const now = new Date()

  const upcoming = [...events]
    .filter(e => new Date(`${e.date}T${e.endTime}:00`) >= now)
    .sort((a, b) => new Date(`${a.date}T${a.startTime}`).getTime() - new Date(`${b.date}T${b.startTime}`).getTime())
    .slice(0, 6)

  return (
    <div className={styles.card}>
      <div className={styles.header}>
        <h3 className={styles.title}>Prochains événements</h3>
      </div>

      {upcoming.length === 0 ? (
        <div className={styles.empty}><p>Rien de prévu prochainement.</p></div>
      ) : (
        <div className={styles.list}>
          {upcoming.map(event => {
            const rel = getRelativeLabel(event.date, event.startTime)
            const color = event.color || '#2563EB'
            return (
              <div key={event.id} className={styles.item} style={{ borderLeftColor: color }}>
                <div className={styles.itemIcon} style={{ background: `${color}1A`, color }}>
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
                    <rect x="3" y="4" width="18" height="18" rx="2"/><path d="M16 2v4M8 2v4M3 10h18"/>
                  </svg>
                </div>
                <div className={styles.itemContent}>
                  <div className={styles.itemTop}>
                    <p className={styles.itemTitle}>{event.title}</p>
                    <span className={`${styles.badge} ${styles[rel.tone]}`}>{rel.text}</span>
                  </div>
                  {event.description && <p className={styles.itemDesc}>{event.description}</p>}
                  <p className={styles.itemTime}>
                    <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10"/><path d="M12 6v6l4 2"/></svg>
                    {event.startTime} – {event.endTime}
                  </p>
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}