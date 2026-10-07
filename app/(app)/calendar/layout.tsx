// app/(app)/calendar/layout.tsx
// Titre d'onglet réel — voir app/(app)/dashboard/layout.tsx pour le contexte.
import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Agenda — Sveltly',
}

export default function CalendarLayout({ children }: { children: React.ReactNode }) {
  return children
}
