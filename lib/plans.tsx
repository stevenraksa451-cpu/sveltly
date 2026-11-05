// lib/plans.tsx
// Source unique des plans — utilisée par la landing, l'onglet Paramètres > Forfait
// et la page /settings/billing, pour éviter que prix et fonctionnalités ne divergent.
// Extension .tsx (pas .ts) uniquement à cause de la tagline du plan Gratuit,
// qui embarque <Brand /> — le reste du fichier reste de la donnée pure.
import { ReactNode } from 'react'
import Brand from '@/components/ui/Brand'

export type PlanId = 'free' | 'pro'

export interface Plan {
  id: PlanId
  name: string
  tagline: ReactNode
  priceMonthly: number
  priceAnnualMonthly: number
  features: string[]
  limits: {
    mailboxes: number | null
    aiRepliesPerMonth: number | null
  }
}

export const PLANS: Plan[] = [
  {
    id: 'free',
    name: 'Gratuit',
    tagline: <>Pour découvrir <Brand /></>,
    priceMonthly: 0,
    priceAnnualMonthly: 0,
    // ⚠️ Ces lignes s'affichent derrière une COCHE (PricingSection) : chacune
    // doit décrire ce que le forfait FAIT, pas ce qu’il refuse.
    //
    // « Tri automatique illimité » était faux. Passé le quota, /api/analyze
    // bascule sur buildFallback : classement par mots-clés, AUCUNE tâche
    // (hasActionItem forcé à false), aucun résumé, et un rendez-vous détecté
    // sans date — donc jamais planifié. Trois des quatre promesses s’arrêtaient
    // en même temps que les brouillons, et /tarifs affirmait le contraire à
    // trois endroits (tableau, corps de page, FAQ).
    features: [
      '1 boîte mail connectée',
      '50 réponses IA par mois, réparties sur le mois',
      'Tri, résumés, tâches et planification à 7 jours',
      'Une fois le quota du jour atteint : tri simplifié jusqu’au lendemain',
    ],
    limits: { mailboxes: 1, aiRepliesPerMonth: 50 },
  },
  {
    id: 'pro',
    name: 'Pro',
    tagline: 'Pour une activité freelance à plein temps',
    priceMonthly: 12,
    priceAnnualMonthly: 9.6,
    features: [
      'Boîtes mail illimitées',
      'Réponses IA illimitées',
      'Planification automatique sans limite de délai',
      'Synchronisation Google Calendar bidirectionnelle',
      // « Support prioritaire » figurait ici. Retiré : aucun mécanisme ne le
      // tenait — ni système de tickets, ni file d'attente, ni tri par forfait.
      // Les messages arrivent dans une boîte mail. Une ligne de plus dans la
      // colonne Pro ne vaut rien si elle ne décrit rien.
    ],
    limits: { mailboxes: null, aiRepliesPerMonth: null },
  },
]

export function getPlan(id: string | null | undefined): Plan {
  return PLANS.find(p => p.id === id) ?? PLANS[0]
}

export function formatPrice(plan: Plan, annual: boolean): { price: string; period: string } {
  if (plan.priceMonthly === 0) return { price: '0€', period: '/mois' }
  const amount = annual ? plan.priceAnnualMonthly : plan.priceMonthly
  const price = (amount % 1 === 0 ? String(amount) : amount.toFixed(2).replace('.', ',')) + '€'
  const period = annual ? '/mois, facturé annuellement' : '/mois'
  return { price, period }
}
