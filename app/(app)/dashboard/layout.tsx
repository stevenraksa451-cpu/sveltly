// app/(app)/dashboard/layout.tsx
// Titre d'onglet réel pour le dashboard — géré via l'API metadata de
// Next.js (pas document.title impératif : le App Router gère le <title>
// via son propre système et écrase toute affectation manuelle au
// re-render suivant, ce qui rendait une approche imperative inefficace).
import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Tableau de bord — Sveltly',
}

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  return children
}
