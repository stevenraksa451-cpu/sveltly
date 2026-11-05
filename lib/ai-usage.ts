// lib/ai-usage.ts
// Logique de compteur mensuel partagée entre /api/analyze et
// /api/regenerate-reply (les deux appellent Groq et comptent contre la même
// limite du plan gratuit).
export function resolveMonthlyUsage(profile: { ai_replies_count?: number | null; ai_replies_reset_at?: string | null } | null) {
  const today = new Date()
  const resetAt = profile?.ai_replies_reset_at ? new Date(profile.ai_replies_reset_at) : today
  const isNewMonth = resetAt.getUTCFullYear() !== today.getUTCFullYear() || resetAt.getUTCMonth() !== today.getUTCMonth()
  const currentCount = isNewMonth ? 0 : (profile?.ai_replies_count ?? 0)
  return { today, isNewMonth, currentCount }
}

/**
 * Le plafond CUMULÉ autorisé à la date du jour, pour une limite mensuelle.
 *
 * LE PROBLÈME QUE ÇA RÈGLE
 * Les 50 réponses du forfait Gratuit se consommaient d'un bloc. Sur une boîte
 * active, c'était fait vers le 5e jour — et les 25 jours suivants, l'IA ne
 * répondait plus du tout : `buildFallback` retire ENSEMBLE le tri par IA, le
 * résumé du jour, les tâches et la planification datée. L'utilisateur passait
 * donc les trois quarts du mois avec un produit muet, puis on lui demandait
 * 12 €. La décision d'achat arrivait au pire moment possible.
 *
 * CE QUI CHANGE, ET CE QUI NE CHANGE PAS
 * Le total reste 50 : le coût en tokens est RIGOUREUSEMENT identique. Seule
 * la distribution change. Le plafond monte un peu chaque jour, donc l'IA ne
 * s'arrête jamais complètement — elle respire.
 *
 *     1er du mois   →  ceil(50 × 1/30)  =  2
 *     5             →  ceil(50 × 5/30)  =  9
 *     15            →  ceil(50 × 15/30) = 25
 *     dernier jour  →  50
 *
 * ⚠️ AUCUNE NOUVELLE COLONNE. Le plafond se DÉDUIT de la date et du compteur
 * mensuel déjà présent — pas de `ai_replies_today`, pas de migration, pas
 * d'état supplémentaire à garder cohérent. Un compteur quotidien aurait
 * demandé une colonne de plus et une seconde remise à zéro à faire tomber
 * juste, avec son propre fuseau et ses propres pièges.
 *
 * ⚠️ L'allocation non consommée S'ACCUMULE, et c'est voulu. Quelqu'un qui
 * n'ouvre pas Sveltly pendant trois semaines retrouve le 21 un plafond de 35,
 * utilisable d'un coup. Le quota n'est pas « 2 par jour » : c'est « 50 sur le
 * mois, sans pouvoir tout brûler le premier jour ».
 *
 * Le mois est lu en UTC, comme resolveMonthlyUsage ci-dessus et comme le
 * déclencheur SQL de la migration 20261022000000 — les trois doivent voir le
 * même mois.
 */
export function plafondQuotidien(limiteMensuelle: number, maintenant: Date = new Date()): number {
  if (limiteMensuelle <= 0) return 0

  const annee = maintenant.getUTCFullYear()
  const mois = maintenant.getUTCMonth()
  const jour = maintenant.getUTCDate()
  // Jour 0 du mois SUIVANT = dernier jour du mois courant.
  const joursDansLeMois = new Date(Date.UTC(annee, mois + 1, 0)).getUTCDate()

  return Math.min(limiteMensuelle, Math.ceil((limiteMensuelle * jour) / joursDansLeMois))
}
