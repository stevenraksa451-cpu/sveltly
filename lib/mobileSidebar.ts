// lib/mobileSidebar.ts
//
// Header (le déclencheur, dans AppLayout > chaque page) et Sidebar (montée une
// seule fois par app/(app)/layout.tsx) sont frères, pas parent/enfant — pas de
// props à faire descendre. Un petit store externe minimal (pas de contexte React
// ni de dépendance ajoutée) suffit pour les faire communiquer.
type Listener = (open: boolean) => void

let isOpen = false
const listeners = new Set<Listener>()

export function setMobileSidebarOpen(open: boolean) {
  isOpen = open
  listeners.forEach(l => l(open))
}

export function toggleMobileSidebar() {
  setMobileSidebarOpen(!isOpen)
}

export function subscribeMobileSidebar(listener: Listener) {
  listeners.add(listener)
  return () => { listeners.delete(listener) }
}
