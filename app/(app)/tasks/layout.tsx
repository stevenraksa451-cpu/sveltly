// app/(app)/tasks/layout.tsx
// Titre d'onglet réel — voir app/(app)/dashboard/layout.tsx pour le contexte.
import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Tâches — Sveltly',
}

export default function TasksLayout({ children }: { children: React.ReactNode }) {
  return children
}
