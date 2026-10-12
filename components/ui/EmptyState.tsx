import type { ReactNode } from 'react'
import styles from './EmptyState.module.css'

// État vide.
//
// Une icône discrète au trait, une phrase courte, une action facultative.
// Le texte dit ce qui se passera ensuite, pas ce qui manque : « Les prochains
// emails seront triés à leur arrivée » vaut mieux que « Aucun email ».

export default function EmptyState({
  icon,
  titre,
  sous,
  action,
  centre = false,
  className = '',
}: {
  icon?: ReactNode
  titre: ReactNode
  sous?: ReactNode
  action?: ReactNode
  /** Pour une page entière vide. Dans une carte, laisser à false. */
  centre?: boolean
  className?: string
}) {
  return (
    <div className={`${styles.empty} ${centre ? styles.centre : ''} ${className}`}>
      {icon && <span className={styles.icon} aria-hidden="true">{icon}</span>}
      <div className={styles.texte}>
        <p className={styles.titre}>{titre}</p>
        {sous && <p className={styles.sous}>{sous}</p>}
      </div>
      {action && <div className={styles.action}>{action}</div>}
    </div>
  )
}
