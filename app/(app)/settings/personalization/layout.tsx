// app/(app)/settings/personalization/layout.tsx
import type { Metadata } from 'next'

export const metadata: Metadata = {
  // Titre NU : le suffixe « — Sveltly » vient du gabarit title.template du
  // layout racine (app/layout.tsx). Le répéter ici donnait « Personnalisation — Sveltly —
  // Sveltly » dans l'onglet.
  title: 'Personnalisation',
}

export default function PersonalizationLayout({ children }: { children: React.ReactNode }) {
  return children
}
