import type { ReactNode } from 'react'

// Socle commun à tous les gabarits. Volontairement minimal : seuls le fil
// d'Ariane, le titre et l'accroche sont partagés. Tout le reste — la façon
// dont la page raconte son sujet — appartient au gabarit, c'est précisément
// ce qui les distingue.
export interface BasePage {
  family?: 'produit' | 'solutions' | 'securite'
  breadcrumb: { label: string; href: string }[]
  /** Le h1. Une page, un h1. */
  title: ReactNode
  lede: ReactNode
  /** Routes connues de lib/navigation.ts ; les libellés en sont déduits. */
  related?: string[]
  /** Appel à l'action final. Le libellé change selon la page. */
  cta?: { title: string; body: string; label?: string }
}

export interface Qa { q: string; a: ReactNode }
