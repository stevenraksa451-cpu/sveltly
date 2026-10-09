// app/(app)/settings/billing/layout.tsx
import type { Metadata } from 'next'

export const metadata: Metadata = {
  // Titre NU : le suffixe « — Sveltly » vient du gabarit title.template du
  // layout racine (app/layout.tsx). Le répéter ici donnait « Changer de forfait — Sveltly —
  // Sveltly » dans l'onglet.
  title: 'Changer de forfait',
}

export default function BillingLayout({ children }: { children: React.ReactNode }) {
  return children
}
