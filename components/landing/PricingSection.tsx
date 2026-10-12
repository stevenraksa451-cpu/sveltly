'use client'
import { useState } from 'react'
import Link from 'next/link'
import Brand from '@/components/ui/Brand'
import Reveal from '@/components/landing/Reveal'
import { PLANS, formatPrice } from '@/lib/plans'
import styles from '@/app/page.module.css'

// Section Tarifs — extraite de app/LandingPage.tsx.
//
// C'est le SEUL morceau interactif de la page d'accueil : une bascule
// mensuel/annuel, un useState. Tant qu'il vivait dans LandingPage, ce seul
// `useState` forçait toute la page — hero, étapes, grille de
// fonctionnalités, sécurité, FAQ, appel à l'action — à partir au navigateur
// comme composant client, à télécharger et à hydrater avant que quoi que ce
// soit d'interactif réponde. Isolé ici, le reste de la page redevient du HTML
// rendu par le serveur.
//
// Les prix viennent de lib/plans.tsx, source unique (voir CLAUDE.md).

export default function PricingSection() {
  const [annual, setAnnual] = useState(true)

  return (
    <section id="pricing" className={styles.pricing}>
      <div className={styles.sectionHead}>
        <h2 className={styles.sectionTitle}>Un tarif simple, sans surprise</h2>
        <p className={styles.sectionDesc}>
          Commencez gratuitement. Passez au plan Pro quand votre activité le justifie.
        </p>
      </div>

      <div className={styles.billingToggleRow}>
        <span className={!annual ? styles.billingToggleLabelActive : styles.billingToggleLabel}>Mensuel</span>
        <button
          type="button"
          className={`${styles.billingToggle} ${annual ? styles.billingToggleOn : ''}`}
          onClick={() => setAnnual(!annual)}
          role="switch"
          aria-checked={annual}
          aria-label="Facturation annuelle"
        >
          <span className={styles.billingToggleThumb} />
        </button>
        <span className={annual ? styles.billingToggleLabelActive : styles.billingToggleLabel}>
          Annuel
          <span className={styles.savingsBadge}>-20%</span>
        </span>
      </div>

      <div className={styles.planGrid}>
        {PLANS.map((plan, i) => {
          const { price, period } = formatPrice(plan, annual)

          return (
            <Reveal key={plan.id} variant="scale" delay={i * 100}>
              <div className={`${styles.planCard} ${plan.id === 'pro' ? styles.planCardFeatured : ''}`}>
                {plan.id === 'pro' && <span className={styles.featuredBadge}>Recommandé</span>}

                <h3 className={styles.planName}>{plan.name}</h3>
                <p className={styles.planTagline}>{plan.tagline}</p>

                <p className={styles.planPrice}>
                  {price}<span className={styles.planPeriod}>{period}</span>
                </p>

                {/* Le forfait gratuit porte un bouton secondaire : deux boutons
                    dégradés côte à côte ne désignent plus rien, et la carte Pro
                    est justement celle qu'on recommande. */}
                <Link href="/auth/register" className={`${styles.planBtn} ${plan.id === 'free' ? styles.planBtnQuiet : ''}`}>
                  {plan.id === 'free' ? 'Commencer gratuitement' : <>Essayer <Brand color="white" /> Pro</>}
                </Link>

                <ul className={styles.planFeatures}>
                  {plan.features.map(f => (
                    <li key={f} className={styles.planFeatureItem}>
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><polyline points="20 6 9 17 4 12" /></svg>
                      {f}
                    </li>
                  ))}
                </ul>
              </div>
            </Reveal>
          )
        })}
      </div>

      <p className={styles.pricingFootnote}>
        Changez de forfait ou annulez à tout moment.
      </p>
    </section>
  )
}
