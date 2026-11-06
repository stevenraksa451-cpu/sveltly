import type { MetadataRoute } from 'next'
import { SITE_URL } from '@/lib/brand'

export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: '*',
      allow: '/',
      // L'espace connecté et les parcours d'authentification n'ont aucun
      // intérêt en résultat de recherche, et une page de réinitialisation de
      // mot de passe indexée serait franchement malvenue.
      //
      // `/api/` manquait. Ces routes ne rendent que du JSON et exigent toutes
      // un jeton — rien n'y est indexable — mais un robot qui les parcourt
      // déclenche des synchronisations Gmail et des appels Groq facturés au
      // quota de l'APPLICATION (voir le budget de tokens dans CLAUDE.md).
      // L'exclusion n'est pas une mesure de sécurité, c'est une mesure de
      // coût : un robot poli ne va pas dépenser le budget d'analyse.
      disallow: ['/api/', '/dashboard', '/inbox', '/tasks', '/calendar', '/settings', '/auth/', '/onboarding/'],
    },
    sitemap: `${SITE_URL}/sitemap.xml`,
  }
}
