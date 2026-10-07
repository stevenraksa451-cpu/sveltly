// lib/email-cache.ts
// Cache en mémoire de la liste d'emails par utilisateur — partagé entre
// /api/emails (lecture/écriture) et /api/mailboxes/callback (invalidation
// après connexion d'une nouvelle boîte). Doit vivre hors d'un fichier
// route.ts : Next.js n'autorise que des exports précis (GET, POST, config...)
// dans ces fichiers, un export supplémentaire comme celui-ci y casse le build.
const emailCache = new Map<string, { data: any; timestamp: number }>()
export const CACHE_DURATION = 5 * 60 * 1000

export function getCachedEmails(userId: string) {
  return emailCache.get(userId)
}

export function setCachedEmails(userId: string, data: any) {
  emailCache.set(userId, { data, timestamp: Date.now() })
  pruneStaleEntries()
}

// Sans ça, cette Map ne fait que grossir pour toujours sur une instance
// serveur longue durée (un utilisateur qui ne revient jamais laisse son
// entrée en mémoire indéfiniment) — une vraie fuite mémoire sur un process
// Node persistant. Purge légère à chaque écriture plutôt qu'un setInterval
// séparé : pas de timer à gérer, coût négligeable (une seule passe sur une
// Map qui reste de toute façon petite en pratique).
function pruneStaleEntries() {
  const cutoff = Date.now() - CACHE_DURATION * 4
  // forEach plutôt que for...of sur la Map : le target TypeScript du projet
  // ne permet pas d'itérer directement une Map sans downlevelIteration.
  emailCache.forEach((entry, userId) => {
    if (entry.timestamp < cutoff) emailCache.delete(userId)
  })
}

export function invalidateEmailCache(userId: string) {
  emailCache.delete(userId)
}
