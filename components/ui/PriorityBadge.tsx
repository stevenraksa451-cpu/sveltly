// components/ui/PriorityBadge.tsx
import { Priority } from '@/types'
import styles from './PriorityBadge.module.css'

const LABELS: Record<Priority, string> = {
  urgent: 'Urgent',
  important: 'Important',
  normal: 'Normal',
}

interface Props { priority: Priority; size?: 'sm' | 'md' }

export default function PriorityBadge({ priority, size = 'md' }: Props) {
  return (
    <span className={`${styles.badge} ${styles[priority]} ${styles[size]}`}>
      <span className={styles.dot} />
      {LABELS[priority]}
    </span>
  )
}
