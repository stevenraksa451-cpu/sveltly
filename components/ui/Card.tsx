import type { ElementType, ReactNode } from 'react'
import styles from './Card.module.css'

export default function Card({
  children,
  inset = false,
  pad = true,
  hover = false,
  as: Balise = 'div',
  className = '',
}: {
  children: ReactNode
  /** Bloc imbriqué dans une carte : filet plus clair, aucune ombre. */
  inset?: boolean
  pad?: boolean
  hover?: boolean
  as?: ElementType
  className?: string
}) {
  const classes = [styles.card, inset ? styles.inset : '', pad ? styles.pad : '', hover ? styles.hover : '', className]
    .filter(Boolean)
    .join(' ')
  return <Balise className={classes}>{children}</Balise>
}
