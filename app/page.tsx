// app/page.tsx — composant SERVEUR, volontairement minuscule.
//
// La page d'accueil est entièrement interactive (simulateur, révélations au
// défilement, parallaxe) : son composant doit porter 'use client'. Or un
// composant client ne peut pas exporter `metadata` — la page la plus
// importante du site était donc la seule sans URL canonique, sans Open
// Graph et sans carte Twitter, réduite au titre générique du layout racine.
//
// D'où cette coquille serveur : elle porte les métadonnées et les données
// structurées, puis monte le composant client inchangé.
import type { Metadata } from 'next'
import LandingPage from './LandingPage'
import PerfProbe from '@/components/PerfProbe'
import { BRAND_NAME, BRAND_TAGLINE, BRAND_DESCRIPTION, SITE_URL, BRAND_EMAIL } from '@/lib/brand'
import { PLANS } from '@/lib/plans'

export const metadata: Metadata = {
  // `absolute` : la page d'accueil ne doit pas subir le gabarit
  // « %s — Sveltly » du layout racine, qui donnerait « Sveltly — Sveltly ».
  title: { absolute: `${BRAND_NAME} — ${BRAND_TAGLINE}` },
  description: BRAND_DESCRIPTION,
  alternates: { canonical: SITE_URL },
  openGraph: {
    title: `${BRAND_NAME} — ${BRAND_TAGLINE}`,
    description: BRAND_DESCRIPTION,
    url: SITE_URL,
    siteName: BRAND_NAME,
    locale: 'fr_FR',
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: `${BRAND_NAME} — ${BRAND_TAGLINE}`,
    description: BRAND_DESCRIPTION,
  },
}

// Données structurées. Décrivent ce que le produit EST réellement — rien
// d'inventé : pas de note moyenne, pas d'avis, pas de nombre d'utilisateurs,
// qui exposeraient le site à une pénalité pour balisage trompeur en plus
// d'être faux (voir la règle d'honnêteté du contenu dans CLAUDE.md).
// Le prix vient de lib/plans.tsx, source unique — jamais réécrit ici.
function structuredData() {
  const free = PLANS.find(p => p.id === 'free')
  const pro = PLANS.find(p => p.id === 'pro')

  return {
    '@context': 'https://schema.org',
    '@graph': [
      {
        '@type': 'Organization',
        '@id': `${SITE_URL}/#organization`,
        name: BRAND_NAME,
        url: SITE_URL,
        email: BRAND_EMAIL,
        description: BRAND_DESCRIPTION,
      },
      {
        '@type': 'WebSite',
        '@id': `${SITE_URL}/#website`,
        url: SITE_URL,
        name: BRAND_NAME,
        inLanguage: 'fr-FR',
        publisher: { '@id': `${SITE_URL}/#organization` },
      },
      {
        '@type': 'SoftwareApplication',
        name: BRAND_NAME,
        applicationCategory: 'BusinessApplication',
        operatingSystem: 'Web',
        url: SITE_URL,
        description: BRAND_DESCRIPTION,
        inLanguage: 'fr-FR',
        publisher: { '@id': `${SITE_URL}/#organization` },
        offers: [
          free && {
            '@type': 'Offer',
            name: free.name,
            price: '0',
            priceCurrency: 'EUR',
          },
          pro && {
            '@type': 'Offer',
            name: pro.name,
            price: String(pro.priceMonthly),
            priceCurrency: 'EUR',
          },
        ].filter(Boolean),
      },
    ],
  }
}

export default function Page() {
  return (
    <>
      <script
        type="application/ld+json"
        // Contenu entièrement construit à partir de constantes du projet,
        // aucune donnée utilisateur n'y transite.
        dangerouslySetInnerHTML={{ __html: JSON.stringify(structuredData()) }}
      />
      <PerfProbe />
      <LandingPage />
    </>
  )
}
