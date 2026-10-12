import type { ReactNode } from 'react'
import styles from './Tag.module.css'

// Étiquette générique. PriorityBadge reste séparé : il porte la sémantique
// des priorités d'email (libellés, type Priority) et n'est pas un choix de
// style qu'on fait au cas par cas.

export type TagTon = 'neutral' | 'urgent' | 'important' | 'success' | 'accent' | 'outline'

export default function Tag({
  children,
  ton = 'neutral',
  dot = false,
  className = '',
}: {
  children: ReactNode
  ton?: TagTon
  /** Pastille ronde devant le libellé — pour un état, pas pour une catégorie. */
  dot?: boolean
  className?: string
}) {
  return (
    <span className={`${styles.tag} ${styles[ton]} ${className}`}>
      {dot && <span className={styles.dot} aria-hidden="true" />}
      {children}
    </span>
  )
}
