// components/landing/PaperPlaneDoodle.tsx
// Avion en papier avec sa trace en pointillés — clin d'œil direct au produit
// (emails qui "s'envolent") plutôt qu'un doodle générique sans rapport avec
// le sujet. Pur SVG, décoratif (aria-hidden), jamais porteur d'information.
import styles from './PaperPlaneDoodle.module.css'

export default function PaperPlaneDoodle({
  size = 48,
  className,
}: {
  size?: number
  className?: string
}) {
  return (
    <svg
      className={`${styles.wrap} ${className || ''}`}
      width={size * 3}
      height={size}
      viewBox="0 0 150 50"
      fill="none"
      aria-hidden="true"
    >
      <path
        className={styles.trail}
        d="M4 44 C 40 36, 60 10, 96 16"
        stroke="var(--accent-muted)"
        strokeWidth="2"
        strokeDasharray="1 7"
        strokeLinecap="round"
      />
      <g className={styles.plane}>
        <path
          d="M98 4 L132 15 L104 19 L98 32 L92 19 Z"
          fill="var(--bg-card)"
          stroke="var(--color-primary)"
          strokeWidth="2.2"
          strokeLinejoin="round"
        />
        <path d="M104 19 L132 15" stroke="var(--color-primary)" strokeWidth="2.2" strokeLinecap="round" />
      </g>
    </svg>
  )
}
