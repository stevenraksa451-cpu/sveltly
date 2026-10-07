// components/landing/ConfettiDoodle.tsx
// Petite volée de confettis (cercles/carrés dessinés, pas une image) pour les
// moments de conclusion — touche festive, purement décorative (aria-hidden).
import styles from './ConfettiDoodle.module.css'

const PIECES = [
  { shape: 'circle', color: 'var(--color-primary)', top: '8%', left: '6%', size: 10, delay: '0s' },
  { shape: 'square', color: 'var(--color-secondary)', top: '72%', left: '3%', size: 8, delay: '0.6s' },
  { shape: 'circle', color: 'var(--color-accent)', top: '18%', left: '95%', size: 8, delay: '1.1s' },
  { shape: 'square', color: 'var(--color-secondary)', top: '78%', left: '93%', size: 10, delay: '0.3s' },
  { shape: 'circle', color: 'var(--color-primary)', top: '48%', left: '1%', size: 6, delay: '1.4s' },
] as const

export default function ConfettiDoodle({ className }: { className?: string }) {
  return (
    <div className={`${styles.wrap} ${className || ''}`} aria-hidden="true">
      {PIECES.map((p, i) => (
        <span
          key={i}
          className={`${styles.piece} ${p.shape === 'circle' ? styles.circle : styles.square}`}
          style={{
            top: p.top,
            left: p.left,
            width: p.size,
            height: p.size,
            background: p.color,
            animationDelay: p.delay,
          }}
        />
      ))}
    </div>
  )
}
