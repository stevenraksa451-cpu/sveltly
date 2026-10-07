'use client'
// components/inbox/EmailListItem.tsx
import { Email } from '@/types'
import PriorityBadge from '@/components/ui/PriorityBadge'
import styles from './EmailListItem.module.css'

export default function EmailListItem({ email, selected, onClick }: {
  email: Email
  selected: boolean
  onClick: () => void
}) {
  const initials = email.sender.split(' ').map(w => w[0]).slice(0, 2).join('').toUpperCase()
  const time = new Date(email.receivedAt).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' })

  return (
    <button className={`${styles.item} ${selected ? styles.selected : ''}`} onClick={onClick}>
      {!email.isRead && <span className={styles.unreadDot} />}
      <div className={styles.avatar}>{initials}</div>
      <div className={styles.content}>
        <div className={styles.topRow}>
          <span className={styles.sender}>{email.sender}</span>
          <span className={styles.time}>{time}</span>
        </div>
        <p className={styles.subject}>{email.subject}</p>
        <div className={styles.bottomRow}>
          <p className={styles.preview}>{email.preview}</p>
          {(email.priority === 'urgent' || email.priority === 'important') && (
            <PriorityBadge priority={email.priority} size="sm" />
          )}
        </div>
      </div>
    </button>
  )
}