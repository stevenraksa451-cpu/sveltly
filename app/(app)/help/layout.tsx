// app/(app)/help/layout.tsx
// Titre d'onglet réel — voir app/(app)/dashboard/layout.tsx pour le contexte.
import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Aide & Support — Sveltly',
}

export default function HelpLayout({ children }: { children: React.ReactNode }) {
  return children
}
