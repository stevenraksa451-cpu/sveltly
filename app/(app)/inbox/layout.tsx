// app/(app)/inbox/layout.tsx
// Titre d'onglet réel — voir app/(app)/dashboard/layout.tsx pour le contexte
// (document.title impératif ne fonctionne pas avec le App Router).
import type { Metadata } from 'next'

export const metadata: Metadata = {
  // Titre NU : le suffixe « — Sveltly » vient du gabarit title.template du
  // layout racine (app/layout.tsx). Le répéter ici donnait « Boîte de réception — Sveltly —
  // Sveltly » dans l'onglet.
  title: 'Boîte de réception',
}

export default function InboxLayout({ children }: { children: React.ReactNode }) {
  return children
}
