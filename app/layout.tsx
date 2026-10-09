// app/layout.tsx
import type { Metadata } from 'next'
import { Inter, Space_Grotesk } from 'next/font/google'
import '@/styles/globals.css'
import { BRAND_NAME, BRAND_TAGLINE, BRAND_DESCRIPTION, SITE_URL } from '@/lib/brand'

// Police auto-hébergée par Next.js (build time) : pas de round-trip réseau
// vers fonts.googleapis.com au chargement, donc pas de blocage du premier rendu.
// Inter pour tout le texte courant (titres/valeurs inclus, via --font-display,
// voir styles/globals.css) — Bricolage Grotesque retirée précédemment.
const inter = Inter({
  subsets: ['latin'],
  weight: ['300', '400', '500', '600'],
  variable: '--font-inter',
  display: 'swap',
})

// Police dédiée UNIQUEMENT au mot "Sveltly" (voir components/ui/Brand.tsx
// et Logo.tsx) — une seule graisse chargée (700), le nom de la marque ne
// s'affiche jamais à un autre poids. Volontairement distincte d'Inter : le
// nom de la marque doit se reconnaître visuellement, pas se fondre dans le
// reste du texte.
const spaceGrotesk = Space_Grotesk({
  subsets: ['latin'],
  weight: ['700'],
  variable: '--font-space-grotesk',
  display: 'swap',
})

// metadataBase manquait : sans elle, Next.js ne peut pas résoudre les URL
// Open Graph relatives et les émet telles quelles — un partage sur un réseau
// social ou dans une messagerie ne récupérait donc ni image ni URL valide.
// Elle sert aussi de base aux canoniques construites par lib/content/meta.ts.
//
// Le gabarit de titre évite de réécrire « — Sveltly » dans chaque page : une
// page qui définit `title: 'Tarifs'` affiche « Tarifs — Sveltly », et la page
// d'accueil garde le titre complet via `default`.
export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: {
    default: `${BRAND_NAME} — ${BRAND_TAGLINE}`,
    template: `%s — ${BRAND_NAME}`,
  },
  description: BRAND_DESCRIPTION,
  applicationName: BRAND_NAME,
  // Évite que Safari iOS transforme les nombres des pages tarifs/calculateur
  // en liens téléphoniques, ce qui casse la mise en page et le contraste.
  formatDetection: { telephone: false, address: false, email: false },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      // Laisse Google afficher un extrait complet et une grande image dans
      // les résultats, plutôt que les valeurs prudentes par défaut.
      'max-snippet': -1,
      'max-image-preview': 'large',
      'max-video-preview': -1,
    },
  },
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="fr" data-scroll-behavior="smooth" suppressHydrationWarning className={`${inter.variable} ${spaceGrotesk.variable}`}>
      <head>
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <script dangerouslySetInnerHTML={{
          __html: `
            try {
              // Le thème sombre est réservé à l'espace connecté ((app)/*) : on ne
              // l'applique jamais au premier rendu de la landing, de l'auth ou de l'onboarding.
              var isAppRoute = /^\\/(dashboard|inbox|tasks|calendar|settings|help)(\\/|$)/.test(window.location.pathname);
              if (isAppRoute) {
                var t = localStorage.getItem('sveltly-theme');
                if (t === 'dark' || (!t && window.matchMedia('(prefers-color-scheme: dark)').matches)) {
                  document.documentElement.setAttribute('data-theme', 'dark');
                }
              }
            } catch(e) {}
          `
        }} />
      </head>
      <body suppressHydrationWarning>{children}</body>
    </html>
  )
}