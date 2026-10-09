// app/(app)/dashboard/layout.tsx
// Titre d'onglet réel pour le dashboard — géré via l'API metadata de
// Next.js (pas document.title impératif : le App Router gère le <title>
// via son propre système et écrase toute affectation manuelle au
// re-render suivant, ce qui rendait une approche imperative inefficace).
import type { Metadata } from 'next'

export const metadata: Metadata = {
  // Titre NU : le suffixe « — Sveltly » vient du gabarit title.template du
  // layout racine (app/layout.tsx). Le répéter ici donnait « Tableau de bord — Sveltly —
  // Sveltly » dans l'onglet.
  title: 'Tableau de bord',
}

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  return children
}
