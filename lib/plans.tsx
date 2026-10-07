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
    features: [
      '1 boîte mail connectée',
      'Tri automatique illimité',
      '50 réponses IA par mois',
      'Planification automatique (7 jours à l\'avance)',
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
      'Support prioritaire',
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
