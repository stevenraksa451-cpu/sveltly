import type { MetadataRoute } from 'next'
import { SITE_URL } from '@/lib/brand'
import { ALL_MARKETING_ROUTES } from '@/lib/navigation'

// Généré depuis lib/navigation.ts : une page ajoutée aux menus entre
// automatiquement dans le sitemap. Seules les pages publiques y figurent —
// l'espace connecté et les routes d'authentification n'ont rien à y faire.

// Date de dernière modification du contenu vitrine. FIGÉE À LA MAIN, et c'est
// le point important : `new Date()` déclarait à Google que les 21 pages
// avaient changé à l'instant même, à CHAQUE génération du sitemap. Un
// lastModified qui bouge sans que le contenu bouge n'accélère rien — il
// apprend juste au moteur que le signal n'est pas fiable, et il finit par
// l'ignorer. À mettre à jour quand le contenu change réellement.
const CONTENT_LAST_MODIFIED = new Date('2026-10-09')

export default function sitemap(): MetadataRoute.Sitemap {
  return ALL_MARKETING_ROUTES.map(route => ({
    url: `${SITE_URL}${route === '/' ? '' : route}`,
    lastModified: CONTENT_LAST_MODIFIED,
    changeFrequency: route === '/' ? 'weekly' : 'monthly',
    priority: route === '/' ? 1 : route.split('/').length === 2 ? 0.8 : 0.6,
  }))
}
