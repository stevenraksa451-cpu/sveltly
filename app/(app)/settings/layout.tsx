// app/(app)/settings/layout.tsx
// Titre d'onglet réel — voir app/(app)/dashboard/layout.tsx pour le contexte.
// S'applique à /settings ; les sous-routes (personalization, billing) ont
// leur propre layout.tsx avec un titre plus spécifique qui prend le dessus.
import type { Metadata } from 'next'

export const metadata: Metadata = {
  // Titre NU : le suffixe « — Sveltly » vient du gabarit title.template du
  // layout racine (app/layout.tsx). Le répéter ici donnait « Paramètres — Sveltly —
  // Sveltly » dans l'onglet.
  title: 'Paramètres',
}

export default function SettingsLayout({ children }: { children: React.ReactNode }) {
  return children
}
