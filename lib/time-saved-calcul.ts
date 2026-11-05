// lib/time-saved-calcul.ts
// Toute la logique du « temps économisé », SANS JSX — pour qu'elle soit
// testable. `lib/time-saved.tsx` ne garde que TIME_SAVED_METHOD_NOTE, qui
// embarque <Brand />, et réexporte tout ce fichier : les imports existants
// (`@/lib/time-saved`) continuent de fonctionner à l'identique.
//
// Pourquoi ce découpage : le lanceur de tests de Node exécute le TypeScript
// nativement, mais pas le JSX. Un modèle CHIFFRÉ qu'on ajuste sans pouvoir le
// tester est précisément ce qu'on ne veut pas — la crédibilité du compteur
// tient à ses hypothèses, pas à son affichage.
import type { Email, EmailType } from '@/types'

// --- Temps de traitement MANUEL (sans Sveltly) -------------------------------
// Repères couramment cités dans les études de productivité sur la charge de
// travail liée aux emails en entreprise (ex : McKinsey Global Institute —
// "Le potentiel social de la technologie" — estime qu'un salarié consacre en
// moyenne 28 % de sa semaine de travail aux emails). Les durées ci-dessous
// sont des estimations raisonnables par action, pas une mesure scientifique
// exacte : ajustez-les librement si vous avez de meilleures données.

// ⚠️ LE TRI ET LE RÉSUMÉ SONT DEUX ACTIONS, PAS UNE.
// Ils ne faisaient qu'un : 60 s manuelles contre 15 s, et ces 15 s étaient
// décrites comme « lire le résumé + survoler l'email classé ». Deux
// conséquences, toutes deux fausses :
//
//   · le RÉSUMÉ, qui est le travail le plus visible de l'IA, n'apparaissait
//     nulle part dans le modèle — impossible de dire ce qu'il rapporte ;
//   · un email trié SANS résumé touchait quand même les 45 s. C'est le cas du
//     mode dégradé (buildFallback ne produit aucun dailySummary) : on créditait
//     un résumé qui n'existait pas.
//
// Séparés, la somme est INCHANGÉE quand les deux sont là — 20 + 40 = 60,
// 5 + 10 = 15. Aucun chiffre n'est gonflé au passage ; seul le cas « trié mais
// pas résumé » tombe enfin à son vrai gain.
export const TIME_MANUAL_TRI_SECONDS = 20 // décider priorité et type en parcourant l'objet et l'expéditeur
export const TIME_MANUAL_RESUME_SECONDS = 40 // lire le corps pour savoir ce qu'il dit vraiment

// Une newsletter ou une notification automatique ne demande pas la même
// attention qu'un email client : on la balaye des yeux et on passe. Lui
// appliquer les durées ci-dessus gonflait le total d'une minute par pub reçue —
// exactement le "chiffre marketing" que ce fichier dit vouloir éviter.
export const TIME_MANUAL_TRI_LOW_EFFORT_SECONDS = 8
export const TIME_MANUAL_RESUME_LOW_EFFORT_SECONDS = 4

export const TIME_MANUAL_REPLY_SECONDS = 150 // rédiger une réponse courte manuellement (~2min30)
export const TIME_MANUAL_SCHEDULING_SECONDS = 120 // ouvrir l'agenda, vérifier les dispos, créer l'événement
// Réunion détectée mais PAS auto-planifiée (conflit, hors fenêtre du forfait...) :
// l'utilisateur doit quand même ouvrir son agenda et créer l'événement lui-même,
// Sveltly lui épargne seulement la relecture de l'email pour en extraire date/heure.
export const TIME_MANUAL_EVENT_REVIEW_SECONDS = 40
// Conflit d'agenda résolu : rouvrir l'agenda, comparer les créneaux déjà pris,
// choisir lesquels déplacer et les déplacer un par un. S'AJOUTE à la création
// de l'événement, qui aurait eu lieu de toute façon.
export const TIME_MANUAL_REARRANGEMENT_SECONDS = 90
export const TIME_MANUAL_TASK_NOTE_SECONDS = 45 // repérer une action à faire et la noter soi-même dans une todo
// Archiver soi-même un email déjà lu et sans suite : le retrouver dans la
// liste, le sélectionner, l'archiver. Court, mais c'est le geste le plus
// répété de tous.
export const TIME_MANUAL_ARCHIVE_SECONDS = 8
// Action à faire REPÉRÉE dans un email sans qu'une tâche ait pu être créée
// (type exclu, doublon, écriture refusée) : l'IA a quand même sorti la
// consigne du paragraphe, il reste à la noter soi-même.
export const TIME_MANUAL_ACTION_REVIEW_SECONDS = 20

// --- Temps résiduel AVEC Sveltly ----------------------------------------------
// L'utilisateur relit/valide au lieu de rédiger/chercher lui-même.
// Valeurs délibérément conservatrices : ce sont elles qui déterminent la
// crédibilité du chiffre affiché.
export const TIME_WITH_SVELTLY_TRI_SECONDS = 5 // la priorité et le type sont déjà posés, il reste à les voir
export const TIME_WITH_SVELTLY_RESUME_SECONDS = 10 // lire le résumé au lieu du corps entier
export const TIME_WITH_SVELTLY_TRI_LOW_EFFORT_SECONDS = 2
export const TIME_WITH_SVELTLY_RESUME_LOW_EFFORT_SECONDS = 1

export const TIME_WITH_SVELTLY_REPLY_SECONDS = 45 // relire sérieusement un brouillon, l'ajuster, l'envoyer
export const TIME_WITH_SVELTLY_SCHEDULING_SECONDS = 15 // vérifier le créneau proposé et le valider
export const TIME_WITH_SVELTLY_EVENT_REVIEW_SECONDS = 5 // date/heure déjà extraites dans le résumé
// Le plan de réarrangement est déjà calculé et affiché : il reste à le lire
// et à confirmer. Voir ConflictPlanCard.
export const TIME_WITH_SVELTLY_REARRANGEMENT_SECONDS = 20
export const TIME_WITH_SVELTLY_TASK_SECONDS = 5 // la tâche est déjà créée, juste à la voir dans la liste
// Zéro, et c'est assumé : un email archivé automatiquement ne demande AUCUN
// geste. C'est le seul gain du produit qui soit total.
export const TIME_WITH_SVELTLY_ARCHIVE_SECONDS = 0
export const TIME_WITH_SVELTLY_ACTION_REVIEW_SECONDS = 5

// --- INVENTAIRE DES ACTIONS ---------------------------------------------
// Toutes les actions possibles dans le produit, et ce qu'elles pèsent dans
// le compteur. Les lignes « non comptée » sont là exprès : un inventaire qui
// ne listerait que ce qui rapporte serait un argumentaire, pas une mesure.
//
//  COMPTÉES (par email, dans calculateTimeSavedForEmails)
//   · tri d'un email                      20 s → 5 s    (8 s → 2 s si pub/notif)
//   · résumé produit                      40 s → 10 s   (4 s → 1 s si pub/notif)
//     — crédité SEULEMENT si dailySummary existe
//   · brouillon de réponse rédigé        150 s → 45 s   (jamais sur pub/notif)
//   · rendez-vous planifié automatiquement 120 s → 15 s
//   · rendez-vous détecté sans planification 40 s → 5 s
//   · conflit d'agenda résolu              90 s → 20 s  (s'ajoute au précédent)
//   · tâche créée automatiquement          45 s → 5 s
//   · action repérée sans tâche créée      20 s → 5 s
//   · email archivé automatiquement         8 s → 0 s
//
//  NON COMPTÉES, et pourquoi
//   · Bouton « Réorganiser ma journée » (/api/calendar/reorganize-day) :
//     déclenché à la main et rattaché à AUCUN email, alors que le compteur ne
//     reçoit que des emails. À ne pas confondre avec le réarrangement
//     ci-dessus, qui naît d'un rendez-vous détecté dans un email précis et
//     porte donc son gain.
//   · Import Google Calendar : ponctuel, pas quotidien.
//   · Recherche (Ctrl+K) : impossible d'estimer honnêtement combien de temps
//     une recherche évite sans savoir ce que l'utilisateur cherchait.
//   · Envoi d'une réponse, archivage manuel, édition d'une tâche : ce sont
//     des gestes que l'utilisateur ferait de toute façon — Sveltly ne les
//     supprime pas, il les rassemble au même endroit. Gain réel en confort,
//     nul en secondes mesurables.

// Types d'emails qu'on ne traite jamais vraiment : on les balaye, et on n'y
// répond pas. Deux conséquences sur le calcul, toutes deux volontaires :
// tri et résumé comptés au tarif "coup d'œil", et AUCUN gain de rédaction —
// même si l'IA a produit un brouillon pour eux (hasAIReply est posé sur tous
// les emails analysés), ce brouillon dit en substance "aucune réponse
// nécessaire" : personne n'aurait écrit cette réponse à la main.
const LOW_EFFORT_TYPES = new Set<EmailType>([
  'newsletter', 'promo', 'spam', 'notification', 'confirmation',
])

export function isLowEffort(email: Email): boolean {
  return !!email.emailType && LOW_EFFORT_TYPES.has(email.emailType)
}

function isSameLocalDay(a: Date, b: Date): boolean {
  return (
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
  )
}

// Comparaison sur la date LOCALE du navigateur (getFullYear/getMonth/getDate,
// pas getUTC*) — un email reçu à 23h50 UTC doit compter comme "aujourd'hui"
// ou "hier" selon le fuseau de l'utilisateur, pas celui du serveur.
export function getEmailsReceivedToday<T extends { receivedAt: string }>(
  emails: T[],
  now: Date = new Date()
): T[] {
  return emails.filter(e => isSameLocalDay(new Date(e.receivedAt), now))
}

/**
 * Le gain, en secondes, pour UN email déjà analysé.
 *
 * Chaque action n'est comptée que si elle a RÉELLEMENT eu lieu :
 * - tri : toujours, c'est la garantie de base ;
 * - résumé : seulement si `dailySummary` est là. En mode dégradé il n'y en a
 *   pas, et l'email ne doit pas être crédité comme s'il avait été lu ;
 * - réponse : hasAIReply, et pas sur un email auquel personne ne répond ;
 * - planification : deux paliers, selon que l'événement a été posé ou
 *   seulement repéré ;
 * - réarrangement : seulement si des événements ont dû être déplacés ;
 * - tâche : autoTaskCreated, pas actionItemDetected seul ;
 * - archivage : autoArchived.
 */
export function timeSavedForEmail(email: Email): number {
  if (email.analysisStatus === 'pending') return 0

  const lowEffort = isLowEffort(email)
  let secondes = 0

  secondes += lowEffort
    ? TIME_MANUAL_TRI_LOW_EFFORT_SECONDS - TIME_WITH_SVELTLY_TRI_LOW_EFFORT_SECONDS
    : TIME_MANUAL_TRI_SECONDS - TIME_WITH_SVELTLY_TRI_SECONDS

  // Le résumé se compte à part, et seulement s'il existe.
  if (email.dailySummary) {
    secondes += lowEffort
      ? TIME_MANUAL_RESUME_LOW_EFFORT_SECONDS - TIME_WITH_SVELTLY_RESUME_LOW_EFFORT_SECONDS
      : TIME_MANUAL_RESUME_SECONDS - TIME_WITH_SVELTLY_RESUME_SECONDS
  }

  if (email.hasAIReply && !lowEffort) {
    secondes += TIME_MANUAL_REPLY_SECONDS - TIME_WITH_SVELTLY_REPLY_SECONDS
  }

  if (email.calendarEventDetected) {
    secondes += email.autoScheduled
      ? TIME_MANUAL_SCHEDULING_SECONDS - TIME_WITH_SVELTLY_SCHEDULING_SECONDS
      : TIME_MANUAL_EVENT_REVIEW_SECONDS - TIME_WITH_SVELTLY_EVENT_REVIEW_SECONDS
  }

  // Un conflit résolu est un travail en PLUS de la création de l'événement :
  // sans Sveltly il faut rouvrir l'agenda, comparer et déplacer à la main.
  // Il comptait pour zéro.
  if (Array.isArray(email.schedulingDisplaced) && email.schedulingDisplaced.length > 0) {
    secondes += TIME_MANUAL_REARRANGEMENT_SECONDS - TIME_WITH_SVELTLY_REARRANGEMENT_SECONDS
  }

  if (email.autoTaskCreated) {
    secondes += TIME_MANUAL_TASK_NOTE_SECONDS - TIME_WITH_SVELTLY_TASK_SECONDS
  } else if (email.actionItemDetected) {
    // Deux paliers, comme pour les rendez-vous : une action repérée mais non
    // transformée en tâche fait quand même gagner la relecture du paragraphe.
    secondes += TIME_MANUAL_ACTION_REVIEW_SECONDS - TIME_WITH_SVELTLY_ACTION_REVIEW_SECONDS
  }

  if (email.autoArchived) {
    secondes += TIME_MANUAL_ARCHIVE_SECONDS - TIME_WITH_SVELTLY_ARCHIVE_SECONDS
  }

  return secondes
}

// Séparée de calculateTimeSavedSeconds pour que l'appelant qui a déjà filtré
// ses emails du jour (voir app/(app)/dashboard/page.tsx, qui a aussi besoin
// de ce sous-ensemble pour todayEmailsCount) ne fasse pas deux fois le même
// passage sur la liste complète.
export function calculateTimeSavedForEmails(emails: Email[]): number {
  let total = 0
  for (const email of emails) total += timeSavedForEmail(email)
  return total
}

export function calculateTimeSavedSeconds(emails: Email[], now: Date = new Date()): number {
  return calculateTimeSavedForEmails(getEmailsReceivedToday(emails, now))
}

/**
 * Total CUMULÉ sur tous les emails connus de Sveltly.
 *
 * C'est ce chiffre que le tableau de bord affiche, et non le total du jour.
 * Le total du jour retombait à « 0 min » à chaque minuit, puis restait à zéro
 * tant qu'aucun email n'était arrivé — un compteur qui annonce zéro à
 * quelqu'un dont il a trié des centaines de messages ne mesure pas le
 * produit, il le dément. Le cumul ne peut valoir zéro que dans deux cas, tous
 * deux justes : aucun email, ou aucun email encore analysé (et le tableau de
 * bord affiche alors « — », pas « 0 min »).
 *
 * La portée est « tous les emails que Sveltly connaît », c'est-à-dire la
 * fenêtre de synchronisation (voir lib/sync-window.ts). Pas « depuis
 * toujours » : on n'affirme que ce qu'on a réellement traité.
 */
export function calculateTimeSavedTotal(emails: Email[]): number {
  return calculateTimeSavedForEmails(emails)
}

/**
 * « 1 h 12 min », « 45 min », « < 1 min ».
 *
 * L'arrondi à la minute transformait tout total inférieur à 30 s en
 * « 0 min » — un email trié fait gagner quelques dizaines de secondes, donc
 * le tout premier affichage d'un nouveau compte annonçait zéro alors que le
 * travail avait eu lieu. « 0 min » n'est désormais rendu que pour un total
 * réellement nul.
 *
 * Espaces insécables avant les unités : c'est la règle typographique
 * française, et ça évite qu'un retour à la ligne sépare « 12 » de « min ».
 * N'encode aucun état de chargement — l'appelant gère « — ».
 */
export function formatTimeSaved(totalSeconds: number): string {
  // NaN passerait les deux comparaisons ci-dessous et ressortirait en
  // « NaN h NaN min ». Il n'est pas atteignable aujourd'hui (le calcul ne
  // somme que des constantes), mais un format d'affichage ne doit jamais
  // pouvoir rendre ça.
  if (!Number.isFinite(totalSeconds)) return '0 min'

  const secondes = Math.max(0, Math.round(totalSeconds))
  if (secondes === 0) return '0 min'
  if (secondes < 60) return '< 1 min'
  const totalMinutes = Math.round(secondes / 60)
  const hours = Math.floor(totalMinutes / 60)
  const minutes = totalMinutes % 60
  if (hours === 0) return `${minutes} min`
  // « 2 h » et non « 2 h 0 min » : le zéro n'apporte rien et allonge la ligne.
  return minutes === 0 ? `${hours} h` : `${hours} h ${minutes} min`
}

// Part du temps email réellement rendue par Sveltly, dérivée des constantes
// ci-dessus plutôt que choisie à la main — sert de base honnête au simulateur
// de la page d'accueil (voir components/landing/ImpactCalculator.tsx), qui
// comptait jusqu'ici 100 % du temps email comme récupéré, ce qui revenait à
// promettre que Sveltly supprime l'email entièrement.
//
// Hypothèse de mix retenue pour une boîte professionnelle type : 1 email sur 2
// mérite une vraie lecture, 1 sur 4 appelle une réponse, 1 sur 10 contient un
// rendez-vous, 1 sur 10 une action à noter. Volontairement prudente : mieux
// vaut annoncer moins que ce que le tableau de bord mesurera ensuite.
//
// ⚠️ Le réarrangement de conflit n'entre PAS dans ce mix, alors qu'il est
// compté par email. C'est délibéré : il suppose un agenda déjà chargé, ce
// qu'on ne peut pas présumer d'un visiteur de la page d'accueil. Le ratio
// annoncé reste donc inférieur à ce que le tableau de bord mesurera.
const MIX_REPLY = 0.25
const MIX_EVENT = 0.1
const MIX_TASK = 0.1
const MIX_REAL_EMAIL = 0.5

export const SAVINGS_RATIO = (() => {
  const lectureManuelle =
    MIX_REAL_EMAIL * (TIME_MANUAL_TRI_SECONDS + TIME_MANUAL_RESUME_SECONDS) +
    (1 - MIX_REAL_EMAIL) * (TIME_MANUAL_TRI_LOW_EFFORT_SECONDS + TIME_MANUAL_RESUME_LOW_EFFORT_SECONDS)
  const manual =
    lectureManuelle +
    MIX_REPLY * TIME_MANUAL_REPLY_SECONDS +
    MIX_EVENT * TIME_MANUAL_SCHEDULING_SECONDS +
    MIX_TASK * TIME_MANUAL_TASK_NOTE_SECONDS
  const lectureAvecSveltly =
    MIX_REAL_EMAIL * (TIME_WITH_SVELTLY_TRI_SECONDS + TIME_WITH_SVELTLY_RESUME_SECONDS) +
    (1 - MIX_REAL_EMAIL) * (TIME_WITH_SVELTLY_TRI_LOW_EFFORT_SECONDS + TIME_WITH_SVELTLY_RESUME_LOW_EFFORT_SECONDS)
  const withSveltly =
    lectureAvecSveltly +
    MIX_REPLY * TIME_WITH_SVELTLY_REPLY_SECONDS +
    MIX_EVENT * TIME_WITH_SVELTLY_SCHEDULING_SECONDS +
    MIX_TASK * TIME_WITH_SVELTLY_TASK_SECONDS
  return (manual - withSveltly) / manual
})()
