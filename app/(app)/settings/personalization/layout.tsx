// app/(app)/settings/personalization/layout.tsx
import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Personnalisation — Sveltly',
}

export default function PersonalizationLayout({ children }: { children: React.ReactNode }) {
  return children
}
