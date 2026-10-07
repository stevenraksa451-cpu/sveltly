// components/landing/SparkleDoodle.tsx
// Petite étincelle à 4 branches (dessin, pas une icône système) — touche
// artistique légère, semée à plusieurs endroits de la page plutôt que
// concentrée à un seul. Purement décorative (aria-hidden).
import type { CSSProperties } from 'react'
import styles from './SparkleDoodle.module.css'

export default function SparkleDoodle({
  size = 18,
  color = 'var(--color-secondary)',
  rotate = 0,
  className,
}: {
  size?: number
  color?: string
  rotate?: number
  className?: string
}) {
  return (
    <svg
      className={`${styles.sparkle} ${className || ''}`}
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      style={{ color, '--sparkle-rotate': `${rotate}deg` } as CSSProperties}
      aria-hidden="true"
    >
      <path d="M12 1 L14.3 9.7 L23 12 L14.3 14.3 L12 23 L9.7 14.3 L1 12 L9.7 9.7 Z" fill="currentColor" />
    </svg>
  )
}
