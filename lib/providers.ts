// Fournisseurs de boîte mail — SOURCE UNIQUE.
//
// Pourquoi ce fichier existe : le site se contredisait. Le hero annonçait
// « Gmail & Outlook » et les mentions légales parlaient d'« une boîte Gmail ou
// Outlook connectée », pendant que la FAQ et /produit disaient noir sur blanc
// qu'Outlook n'était pas supporté. Les deux affirmations étaient visibles sur
// le même site, à deux clics d'écart. C'est exactement ce que la règle
// d'honnêteté du contenu interdit (voir CLAUDE.md).
//
// Désormais une seule table décide, et toutes les pages la lisent. Le jour où
// Outlook est branché, on passe son `status` à 'live' : la landing, la FAQ,
// /produit, les CGU et la politique de confidentialité suivent ensemble. Rien
// à retrouver à la main, donc rien à oublier.
//
// `status` dit ce qui est VRAI aujourd'hui dans le code, pas ce qui est espéré :
//   'live'    — connectable maintenant (une route OAuth existe et fonctionne).
//   'planned' — décidé et spécifié, pas encore branché. Jamais de date : une
//               date annoncée est une promesse, et on n'en fait pas.
// Ne passez un fournisseur à 'live' qu'après avoir connecté une vraie boîte.

export type ProviderStatus = 'live' | 'planned'

export type Provider = {
  id: 'gmail' | 'outlook'
  name: string
  status: ProviderStatus
}

export const PROVIDERS: Provider[] = [
  { id: 'gmail', name: 'Gmail', status: 'live' },
  { id: 'outlook', name: 'Outlook', status: 'planned' },
]

export const LIVE_PROVIDERS = PROVIDERS.filter(p => p.status === 'live')
export const PLANNED_PROVIDERS = PROVIDERS.filter(p => p.status === 'planned')

/** Étiquette portée par un fournisseur pas encore branché. */
export const PLANNED_BADGE = 'Bientôt'

function liste(noms: string[]): string {
  if (noms.length <= 1) return noms[0] ?? ''
  return `${noms.slice(0, -1).join(', ')} et ${noms[noms.length - 1]}`
}

/**
 * Ce qu'on peut connecter AUJOURD'HUI — « Gmail ».
 * À utiliser partout où une phrase décrit le fonctionnement réel du produit :
 * mentions légales, politique de confidentialité, étapes de mise en route.
 */
export const PROVIDERS_LIVE_LABEL = liste(LIVE_PROVIDERS.map(p => p.name))

/**
 * Ce qui est prévu — « Outlook ». Chaîne vide si plus rien n'est en attente.
 */
export const PROVIDERS_PLANNED_LABEL = liste(PLANNED_PROVIDERS.map(p => p.name))

/**
 * Réponse complète à « quelles boîtes puis-je connecter ? », formulée une
 * seule fois : « Gmail. Outlook est prévu, sans date annoncée. »
 */
export const PROVIDERS_ANSWER = PLANNED_PROVIDERS.length === 0
  ? `${PROVIDERS_LIVE_LABEL}.`
  : `${PROVIDERS_LIVE_LABEL}. ${PROVIDERS_PLANNED_LABEL} ${PLANNED_PROVIDERS.length > 1 ? 'sont prévus' : 'est prévu'}, sans date annoncée.`
