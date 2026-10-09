import type { Metadata } from 'next'
import { BRAND_NAME, SITE_URL } from '@/lib/brand'

// Fabrique les métadonnées d'une page marketing. Centralisé pour que le
// gabarit de titre, l'URL canonique et les balises Open Graph soient
// construits de la même façon partout — une page oubliée hérite sinon du
// titre générique du layout racine.
export function pageMeta({
  title,
  description,
  path,
}: {
  title: string
  description: string
  path: string
}): Metadata {
  const url = `${SITE_URL}${path}`
  const fullTitle = `${title} — ${BRAND_NAME}`
  return {
    // Titre NU : le suffixe « — Sveltly » est ajouté par le gabarit
    // `title.template` du layout racine (app/layout.tsx). Le passer complet
    // ici le faisait appliquer deux fois — « Tarifs — Sveltly — Sveltly ».
    // Open Graph, lui, n'a pas de gabarit : il reçoit le titre complet.
    title,
    description,
    alternates: { canonical: url },
    openGraph: {
      title: fullTitle,
      description,
      url,
      siteName: BRAND_NAME,
      locale: 'fr_FR',
      type: 'website',
    },
    // Manquait sur les 21 pages vitrine : sans carte déclarée, un lien
    // partagé sur X/Twitter ou dans la plupart des messageries s'affiche en
    // URL nue, sans titre ni description.
    twitter: {
      card: 'summary_large_image',
      title: fullTitle,
      description,
    },
  }
}
