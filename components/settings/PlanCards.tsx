'use client'
// components/settings/PlanCards.tsx
// Composant partagé entre l'onglet Paramètres > Forfait et /settings/billing,
// pour que prix, fonctionnalités et usage ne divergent plus jamais entre les deux.
import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { useProfile } from '@/hooks/useProfile'
import { PLANS, formatPrice, getPlan } from '@/lib/plans'
import UsageLimitCard from '@/components/ui/UsageLimitCard'
import styles from './PlanCards.module.css'

// Premier jour du mois suivant, au format "1er novembre" — la date à
// laquelle le compteur de réponses IA se réinitialise réellement (voir
// resolveMonthlyUsage dans lib/ai-usage.ts, basé sur le mois calendaire).
function nextResetLabel(): string {
  const now = new Date()
  const next = new Date(now.getFullYear(), now.getMonth() + 1, 1)
  const day = next.getDate() === 1 ? '1er' : String(next.getDate())
  return `Réinitialisation le ${day} ${next.toLocaleDateString('fr-FR', { month: 'long' })}`
}

export default function PlanCards() {
  const [annual, setAnnual] = useState(true)
  const [firstName, setFirstName] = useState('')
  // Cache partagé (voir hooks/useProfile.ts) — ce composant est monté à la
  // fois sur l'onglet Paramètres > Forfait et sur /settings/billing ; avant,
  // chacun refaisait sa propre requête profiles au montage.
  const { profile, loading: loadingProfile } = useProfile()
  const loaded = !loadingProfile

  useEffect(() => {
    async function loadName() {
      const { data: { session } } = await supabase.auth.getSession()
      const name = session?.user?.user_metadata?.full_name || ''
      setFirstName(name.split(' ')[0])
    }
    loadName()
  }, [])

  const currentPlanId = profile?.plan || 'free'
  const aiRepliesUsed = (() => {
    if (!profile) return null
    const resetAt = profile.ai_replies_reset_at ? new Date(profile.ai_replies_reset_at) : new Date()
    const now = new Date()
    const isNewMonth = resetAt.getUTCFullYear() !== now.getUTCFullYear() || resetAt.getUTCMonth() !== now.getUTCMonth()
    return isNewMonth ? 0 : (profile.ai_replies_count ?? 0)
  })()

  const limit = getPlan(currentPlanId).limits.aiRepliesPerMonth
  const limitReached = limit !== null && aiRepliesUsed !== null && aiRepliesUsed >= limit

  // Pas de processeur de paiement branché pour l'instant : on route vers le
  // support plutôt que de simuler un bouton "payer" qui ne ferait rien.
  function handlePlanClick(planId: string) {
    const subject = planId === 'free' ? 'Repasser au plan Gratuit' : 'Passer au plan ' + getPlan(planId).name
    window.location.href = `mailto:support@sveltly.fr?subject=${encodeURIComponent(subject)}`
  }

  return (
    <div>
      {loaded && limit !== null && aiRepliesUsed !== null && (
        limitReached ? (
          <div className={styles.usageLimitWrap}>
            <UsageLimitCard
              title="Limite de réponses IA atteinte"
              message={`${firstName ? firstName + ', vous avez' : 'Vous avez'} utilisé vos ${limit} réponses IA du mois. Elles se réinitialisent automatiquement — ou passez à Pro pour un usage illimité dès maintenant.`}
              current={aiRepliesUsed}
              max={limit}
              resetLabel={nextResetLabel()}
            />
          </div>
        ) : (
          <div className={styles.usage}>
            <div className={styles.usageHead}>
              <span className={styles.usageLabel}>Réponses IA utilisées ce mois-ci</span>
              <span className={styles.usageCount}>{aiRepliesUsed} / {limit}</span>
            </div>
            <div className={styles.usageTrack}>
              <div
                className={styles.usageFill}
                style={{ width: `${Math.min(100, (aiRepliesUsed / limit) * 100)}%` }}
              />
            </div>
          </div>
        )
      )}

      <div className={styles.toggleRow}>
        <span className={!annual ? styles.toggleLabelActive : styles.toggleLabel}>Mensuel</span>
        <button
          className={`${styles.toggle} ${annual ? styles.toggleOn : ''}`}
          onClick={() => setAnnual(!annual)}
          aria-label="Basculer entre facturation mensuelle et annuelle"
        >
          <span className={styles.toggleThumb} />
        </button>
        <span className={annual ? styles.toggleLabelActive : styles.toggleLabel}>
          Annuel
          <span className={styles.savingsBadge}>-20%</span>
        </span>
      </div>

      <div className={styles.grid}>
        {PLANS.map(plan => {
          const isCurrent = plan.id === currentPlanId
          const { price, period } = formatPrice(plan, annual)

          return (
            <div
              key={plan.id}
              className={`${styles.card} ${isCurrent ? styles.cardCurrent : ''} ${plan.id === 'pro' ? styles.cardFeatured : ''}`}
            >
              {plan.id === 'pro' && !isCurrent && <span className={styles.badge}>Recommandé</span>}
              {isCurrent && <span className={`${styles.badge} ${styles.badgeCurrent}`}>Forfait actuel</span>}

              <h3 className={styles.name}>{plan.name}</h3>
              <p className={styles.tagline}>{plan.tagline}</p>
              <p className={styles.price}>{price}<span className={styles.period}>{period}</span></p>

              <button className={styles.btn} disabled={isCurrent} onClick={() => handlePlanClick(plan.id)}>
                {isCurrent ? 'Plan actif' : plan.id === 'free' ? 'Rétrograder' : 'Passer à ce forfait'}
              </button>

              <ul className={styles.features}>
                {plan.features.map(f => (
                  <li key={f} className={styles.featureItem}>
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><polyline points="20 6 9 17 4 12"/></svg>
                    {f}
                  </li>
                ))}
              </ul>
            </div>
          )
        })}
      </div>

      <p className={styles.footnote}>
        Vous pouvez changer de forfait ou annuler à tout moment. Aucune carte requise pour rester sur le plan gratuit.
      </p>
    </div>
  )
}
