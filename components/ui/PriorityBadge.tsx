// components/ui/PriorityBadge.tsx
import { Priority } from '@/types'
import styles from './PriorityBadge.module.css'

// « normal » n'a PAS de libellé, et c'est la règle : l'absence de badge
// signifie normal. Un badge posé sur les trois quarts des emails n'informe
// plus de rien — il ne fait que répéter « rien à signaler » sur chaque ligne
// et sur chaque en-tête, en volant l'attention aux deux badges qui comptent.
//
// La règle est appliquée ICI plutôt que chez chaque appelant : trois
// endroits rendaient ce composant, et deux seulement filtraient le cas normal
// — l'en-tête du lecteur et le résumé du panneau affichaient donc « Normal »
// tandis que la liste ne l'affichait pas, sur le même email.
const LABELS: Partial<Record<Priority, string>> = {
  urgent: 'Urgent',
  important: 'Important',
}

interface Props { priority: Priority; size?: 'sm' | 'md' }

export default function PriorityBadge({ priority, size = 'md' }: Props) {
  const label = LABELS[priority]
  if (!label) return null

  return (
    <span className={`${styles.badge} ${styles[priority]} ${styles[size]}`}>
      <span className={styles.dot} />
      {label}
    </span>
  )
}
