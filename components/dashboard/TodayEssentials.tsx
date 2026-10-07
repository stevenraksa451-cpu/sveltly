'use client'
import { memo } from 'react'
import { Email, CalendarEvent } from '@/types'
import Link from 'next/link'
import styles from './TodayEssentials.module.css'

// memo : évite de refaire le filtre/tri des items ci-dessous quand le parent
// (app/(app)/dashboard/page.tsx) se re-rend pour une raison qui ne change ni
// emails, ni events, ni loading (ex: l'info-bulle "Temps économisé") — leurs
// références restent désormais stables entre deux rendus tant que les
// données sous-jacentes n'ont pas réellement changé (voir le useMemo côté
// page.tsx pour `events`/`todayEvents`).
function TodayEssentials({ emails, events, loading }: {
  emails: Email[]
  events: CalendarEvent[]
  loading: boolean
}) {
  const priorityEmails = emails
    .filter(e => (e.priority === 'urgent' || e.priority === 'important') && !e.isRead)
    .slice(0, 3)

  const items = [
    ...events.slice(0, 2).map(e => ({
      key: `event-${e.id}`,
      icon: (
        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="3" y="4" width="18" height="18" rx="2"/><path d="M16 2v4M8 2v4M3 10h18"/></svg>
      ),
      color: 'urgent' as const,
      title: e.title,
      sub: `Aujourd'hui, ${e.startTime} – ${e.endTime}`,
      tag: 'Réunion',
    })),
    ...priorityEmails.map(e => ({
      key: `email-${e.id}`,
      icon: (
        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="2" y="4" width="20" height="16" rx="2"/><path d="M2 8l10 6 10-6"/></svg>
      ),
      color: e.priority === 'urgent' ? 'urgent' as const : 'important' as const,
      title: e.dailySummary || e.subject,
      sub: e.sender,
      tag: e.priority === 'urgent' ? 'Urgent' : 'Important',
    })),
  ].slice(0, 5)

  return (
    <div className={styles.card}>
      <div className={styles.header}>
        <div className={styles.headerTitle}>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><path d="M14 2v6h6"/></svg>
          <h3>Les essentiels du jour</h3>
        </div>
      </div>

      {loading ? (
        <div className={styles.list}>
          {[...Array(3)].map((_, i) => <div key={i} className={`${styles.skeletonItem} skeleton`} />)}
        </div>
      ) : items.length === 0 ? (
        <div className={styles.empty}>
          <p>Rien d'urgent pour l'instant — profitez-en.</p>
        </div>
      ) : (
        <div className={styles.list}>
          {items.map(item => (
            <div key={item.key} className={styles.item}>
              <span className={`${styles.itemIcon} ${styles[item.color]}`}>{item.icon}</span>
              <div className={styles.itemContent}>
                <p className={styles.itemTitle}>{item.title}</p>
                <p className={styles.itemSub}>{item.sub}</p>
              </div>
              <span className={`${styles.itemTag} ${styles[item.color]}`}>{item.tag}</span>
            </div>
          ))}
        </div>
      )}

      <Link href="/inbox" className={styles.viewAll}>
        Voir tout
        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M5 12h14M12 5l7 7-7 7"/></svg>
      </Link>
    </div>
  )
}

export default memo(TodayEssentials)