// app/(app)/help/layout.tsx
// Titre d'onglet réel — voir app/(app)/dashboard/layout.tsx pour le contexte.
import type { Metadata } from 'next'

export const metadata: Metadata = {
  // Titre NU : le suffixe « — Sveltly » vient du gabarit title.template du
  // layout racine (app/layout.tsx). Le répéter ici donnait « Aide & Support — Sveltly —
  // Sveltly » dans l'onglet.
  title: 'Aide & Support',
}

export default function HelpLayout({ children }: { children: React.ReactNode }) {
  return children
}
