// app/(app)/settings/layout.tsx
// Titre d'onglet réel — voir app/(app)/dashboard/layout.tsx pour le contexte.
// S'applique à /settings ; les sous-routes (personalization, billing) ont
// leur propre layout.tsx avec un titre plus spécifique qui prend le dessus.
import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Paramètres — Sveltly',
}

export default function SettingsLayout({ children }: { children: React.ReactNode }) {
  return children
}
