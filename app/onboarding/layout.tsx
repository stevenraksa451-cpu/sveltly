// app/onboarding/layout.tsx
// Même raison que app/auth/layout.tsx : exclu du crawl, et explicitement
// exclu de l'index.
import type { Metadata } from 'next'

export const metadata: Metadata = {
  robots: { index: false, follow: false },
}

export default function OnboardingLayout({ children }: { children: React.ReactNode }) {
  return children
}
