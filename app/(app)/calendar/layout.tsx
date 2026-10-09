// app/(app)/calendar/layout.tsx
// Titre d'onglet réel — voir app/(app)/dashboard/layout.tsx pour le contexte.
import type { Metadata } from 'next'

export const metadata: Metadata = {
  // Titre NU : le suffixe « — Sveltly » vient du gabarit title.template du
  // layout racine (app/layout.tsx). Le répéter ici donnait « Agenda — Sveltly —
  // Sveltly » dans l'onglet.
  title: 'Agenda',
}

export default function CalendarLayout({ children }: { children: React.ReactNode }) {
  return children
}
