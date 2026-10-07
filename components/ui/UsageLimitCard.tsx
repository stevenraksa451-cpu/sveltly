// components/ui/UsageLimitCard.tsx
//
// Récapitulatif d'une limite de forfait atteinte (réponses IA, boîtes mail...).
// Remplace un simple message d'erreur par : ce qui est limité, où on en est
// précisément (X/Y), quand ça se réinitialise si applicable, et comment
// débloquer — plutôt qu'une ligne rouge générique.
import styles from './UsageLimitCard.module.css'

interface UsageLimitCardProps {
  title: string
  message: string
  current: number
  max: number
  resetLabel?: string
  ctaLabel?: string
  ctaHref?: string
  tone?: 'ai' | 'neutral'
  compact?: boolean
}

export default function UsageLimitCard({
  title,
  message,
  current,
  max,
  resetLabel,
  ctaLabel = 'Passer à Pro',
  ctaHref = '/settings?tab=billing',
  tone = 'ai',
  compact = false,
}: UsageLimitCardProps) {
  const pct = max > 0 ? Math.min(100, Math.round((current / max) * 100)) : 100

  return (
    <div className={`${styles.card} ${compact ? styles.compact : ''}`}>
      <div className={styles.headRow}>
        <div className={`${styles.iconWrap} ${tone === 'neutral' ? styles.neutral : ''}`}>
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
            <circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/>
          </svg>
        </div>
        <p className={styles.title}>{title}</p>
      </div>

      <p className={styles.message}>{message}</p>

      <div className={styles.track}>
        <div className={styles.fill} style={{ width: `${pct}%` }} />
      </div>

      <div className={styles.footRow}>
        <span className={styles.count}>{current} / {max}</span>
        {resetLabel && <span className={styles.reset}>{resetLabel}</span>}
      </div>

      <a href={ctaHref} className={styles.cta}>{ctaLabel}</a>
    </div>
  )
}
