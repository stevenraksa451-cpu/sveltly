// lib/categories-email.ts
// La catégorie « Newsletters » de la boîte de réception.
//
// AUCUNE MIGRATION N'A ÉTÉ NÉCESSAIRE, et c'est le point important : la
// classification existait déjà. `/api/analyze` range chaque email dans un jeu
// fermé de 13 types (voir `EmailType`), dont `newsletter`, `promo`,
// `notification`, `spam` et `confirmation` ; le résultat est conservé dans la
// table `email_analyses` et remonte au client dans `email.emailType`.
//
// Ce qui manquait n'était donc pas une donnée mais une VUE : rien, dans
// l'interface, ne se servait de ce classement. Ajouter une colonne aurait
// dupliqué une information déjà présente — avec la garantie que les deux
// divergent au premier changement de prompt.
//
// ⚠️ C'est le MÊME jeu de types que `LOW_EFFORT_TYPES` dans
// lib/time-saved-calcul.ts, et ce n'est pas une coïncidence : ce sont les
// emails qu'on balaye sans y répondre. Les deux listes sont volontairement
// séparées plutôt que partagées — l'une décide d'un affichage, l'autre d'un
// calcul de temps, et les faire bouger ensemble par accident serait pire que
// de les maintenir côte à côte. Si l'une change, se demander si l'autre doit
// suivre ; la réponse n'est pas automatiquement oui.
import type { Email, EmailType } from '@/types'

export const TYPES_NEWSLETTER: ReadonlySet<EmailType> = new Set<EmailType>([
  'newsletter', 'promo', 'spam', 'notification', 'confirmation',
])

/**
 * Cet email appartient-il à la catégorie « Newsletters » ?
 *
 * Un email NON ENCORE ANALYSÉ (emailType absent) n'en fait jamais partie :
 * il reste dans « Tous ». C'est délibéré — masquer un message qu'on n'a pas
 * encore lu, sur la seule foi qu'il sera peut-être une publicité, ferait
 * disparaître des emails importants pendant les secondes qui suivent une
 * synchronisation. On ne range que ce qu'on a vraiment classé.
 */
export function estNewsletter(email: Pick<Email, 'emailType'>): boolean {
  return !!email.emailType && TYPES_NEWSLETTER.has(email.emailType)
}
