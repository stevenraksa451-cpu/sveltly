// app/(app)/inbox/layout.tsx
// Titre d'onglet réel — voir app/(app)/dashboard/layout.tsx pour le contexte
// (document.title impératif ne fonctionne pas avec le App Router).
import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Inbox — Sveltly',
}

export default function InboxLayout({ children }: { children: React.ReactNode }) {
  return children
}
