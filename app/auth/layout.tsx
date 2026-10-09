// app/auth/layout.tsx
// Ces pages sont déjà exclues du crawl par app/robots.ts, mais un `Disallow`
// empêche seulement la VISITE : une page jamais visitée peut quand même
// apparaître dans l'index si un lien externe pointe dessus, affichée sans
// titre ni description. `noindex` règle ce cas — et une page de
// réinitialisation de mot de passe n'a rien à faire dans un résultat de
// recherche.
import type { Metadata } from 'next'

export const metadata: Metadata = {
  robots: { index: false, follow: false },
}

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return children
}
