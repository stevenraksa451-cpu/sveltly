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
      disallow: ['/dashboard', '/inbox', '/tasks', '/calendar', '/settings', '/auth/', '/onboarding/'],
    },
    sitemap: `${SITE_URL}/sitemap.xml`,
  }
}
