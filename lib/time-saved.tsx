// lib/time-saved.tsx
// Calcul du « temps économisé » affiché sur le tableau de bord — un CUMUL,
// pas un total du jour. Toutes les hypothèses de durée vivent ici et nulle part
// ailleurs, pour pouvoir les ajuster sans toucher au reste du code — et pour
// que la méthode reste vérifiable plutôt qu'un chiffre marketing gonflé.
// Extension .tsx (pas .ts) uniquement à cause de TIME_SAVED_METHOD_NOTE
// ci-dessous, qui embarque <Brand /> — tout le reste du fichier reste de la
// logique pure, sans JSX.
import { Email, EmailType } from '@/types'
import Brand from '@/components/ui/Brand'

// --- Temps de traitement MANUEL (sans Sveltly) -------------------------------
// Repères couramment cités dans les études de productivité sur la charge de
// travail liée aux emails en entreprise (ex : McKinsey Global Institute —
// "Le potentiel social de la technologie" — estime qu'un salarié consacre en
// moyenne 28 % de sa semaine de travail aux emails). Les durées ci-dessous
// sont des estimations raisonnables par action, pas une mesure scientifique
// exacte : ajustez-les librement si vous avez de meilleures données.
export const TIME_MANUAL_TRIAGE_SECONDS = 60 // lire et décider quoi faire d'un email
// Une newsletter ou une notification automatique ne demande pas la même
// attention qu'un email client : on la balaye des yeux et on passe. Lui
// appliquer les 60 s ci-dessus gonflait le total d'une minute par pub reçue —
// exactement le "chiffre marketing" que ce fichier dit vouloir éviter.
export const TIME_MANUAL_TRIAGE_LOW_EFFORT_SECONDS = 12
export const TIME_MANUAL_REPLY_SECONDS = 150 // rédiger une réponse courte manuellement (~2min30)
export const TIME_MANUAL_SCHEDULING_SECONDS = 120 // ouvrir l'agenda, vérifier les dispos, créer l'événement
// Réunion détectée mais PAS auto-planifiée (conflit, hors fenêtre du forfait...) :
// l'utilisateur doit quand même ouvrir son agenda et créer l'événement lui-même,
// Sveltly lui épargne seulement la relecture de l'email pour en extraire date/heure.
export const TIME_MANUAL_EVENT_REVIEW_SECONDS = 40
export const TIME_MANUAL_TASK_NOTE_SECONDS = 45 // repérer une action à faire et la noter soi-même dans une todo
// Archiver soi-même un email déjà lu et sans suite : le retrouver dans la
// liste, le sélectionner, l'archiver. Court, mais c'est le geste le plus
// répété de tous — et il était jusqu'ici compté pour zéro alors que
// l'archivage automatique le supprime entièrement (voir auto_archive dans
// app/api/emails/route.ts).
export const TIME_MANUAL_ARCHIVE_SECONDS = 8
// Action a faire REPEREE dans un email sans qu'une tache ait pu etre creee
// (type exclu, doublon, ecriture refusee) : l'IA a quand meme sorti la
// consigne du paragraphe, il reste a la noter soi-meme. Pendant exact de
// TIME_MANUAL_EVENT_REVIEW_SECONDS pour les rendez-vous.
export const TIME_MANUAL_ACTION_REVIEW_SECONDS = 20

// --- Temps résiduel AVEC Sveltly ----------------------------------------------
// L'utilisateur relit/valide au lieu de rédiger/chercher lui-même.
// Valeurs délibérément conservatrices : ce sont elles qui déterminent la
// crédibilité du chiffre affiché. Les précédentes (5 s de triage, 20 s de
// relecture de réponse) supposaient qu'on expédie en 20 secondes la relecture
// d'un message parti en son propre nom — personne ne fait ça, et un compteur
// qu'on sait gonflé ne vaut rien à afficher.
export const TIME_WITH_SVELTLY_TRIAGE_SECONDS = 15 // lire le résumé + survoler l'email classé
// Pendant de TIME_MANUAL_TRIAGE_LOW_EFFORT_SECONDS : une pub déjà classée
// "normal" et repoussée en bas de liste ne coûte qu'un balayage du regard.
// Indispensable d'avoir sa propre valeur — réutiliser les 15 s ci-dessus
// rendrait le gain NÉGATIF sur ces emails (12 s manuelles contre 15 s).
export const TIME_WITH_SVELTLY_TRIAGE_LOW_EFFORT_SECONDS = 3
export const TIME_WITH_SVELTLY_REPLY_SECONDS = 45 // relire sérieusement un brouillon, l'ajuster, l'envoyer
export const TIME_WITH_SVELTLY_SCHEDULING_SECONDS = 15 // vérifier le créneau proposé et le valider
export const TIME_WITH_SVELTLY_EVENT_REVIEW_SECONDS = 5 // date/heure déjà extraites dans le résumé, reste à les saisir soi-même
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
//   · tri d'un email                     60 s → 15 s   (12 s → 3 s si pub/notif)
//   · brouillon de réponse rédigé       150 s → 45 s   (jamais sur pub/notif)
//   · rendez-vous planifié automatiquement 120 s → 15 s
//   · rendez-vous détecté sans planification 40 s → 5 s
//   · tâche créée automatiquement        45 s → 5 s
//   · action repérée sans tâche créée     20 s → 5 s
//   · email archivé automatiquement       8 s → 0 s
//
//  NON COMPTÉES, et pourquoi
//   · Réorganisation de la journée (/api/calendar/reorganize-day) : gain réel
//     et important, mais déclenché à la main et non rattaché à un email — le
//     compteur du tableau de bord ne reçoit que des emails. L'ajouter
//     demanderait de journaliser l'action en base ; tant que ce n'est pas
//     fait, mieux vaut ne rien compter que l'estimer.
//   · Import Google Calendar : ponctuel, pas quotidien.
//   · Recherche (Ctrl+K) : impossible d'estimer honnêtement combien de temps
//     une recherche évite sans savoir ce que l'utilisateur cherchait.
//   · Envoi d'une réponse, archivage manuel, édition d'une tâche : ce sont
//     des gestes que l'utilisateur ferait de toute façon — Sveltly ne les
//     supprime pas, il les rassemble au même endroit. Gain réel en confort,
//     nul en secondes mesurables.

// Types d'emails qu'on ne traite jamais vraiment : on les balaye, et on n'y
// répond pas. Deux conséquences sur le calcul, toutes deux volontaires :
// triage compté au tarif "coup d'œil", et AUCUN gain de rédaction — même si
// l'IA a produit un brouillon pour eux (hasAIReply est posé sur tous les
// emails analysés, voir app/api/emails/route.ts), ce brouillon dit en substance
// "aucune réponse nécessaire" : personne n'aurait écrit cette réponse à la
// main, donc personne n'a économisé les 2min30 de rédaction.
const LOW_EFFORT_TYPES = new Set<EmailType>([
  'newsletter', 'promo', 'spam', 'notification', 'confirmation',
])

function isLowEffort(email: Email): boolean {
  return !!email.emailType && LOW_EFFORT_TYPES.has(email.emailType)
}

// Phrase affichée dans l'info-bulle du tableau de bord — garder en phase
// avec les constantes ci-dessus si vous les modifiez.
export const TIME_SAVED_METHOD_NOTE = (
  <>
    Total depuis que <Brand /> suit votre boîte. Temps de traitement manuel estimé (lecture, rédaction, planification, création de tâches) moins le temps de relecture avec <Brand />. Seuls les emails réellement analysés comptent, et les newsletters, pubs et notifications ne comptent qu’un coup d’œil — sans gain de rédaction, puisqu’on n’y répond pas. Référence : étude McKinsey Global Institute sur le temps consacré aux emails en entreprise.
  </>
)

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
const MIX_REPLY = 0.25
const MIX_EVENT = 0.1
const MIX_TASK = 0.1
const MIX_REAL_EMAIL = 0.5

export const SAVINGS_RATIO = (() => {
  const triageManual =
    MIX_REAL_EMAIL * TIME_MANUAL_TRIAGE_SECONDS +
    (1 - MIX_REAL_EMAIL) * TIME_MANUAL_TRIAGE_LOW_EFFORT_SECONDS
  const manual =
    triageManual +
    MIX_REPLY * TIME_MANUAL_REPLY_SECONDS +
    MIX_EVENT * TIME_MANUAL_SCHEDULING_SECONDS +
    MIX_TASK * TIME_MANUAL_TASK_NOTE_SECONDS
  const triageWithSveltly =
    MIX_REAL_EMAIL * TIME_WITH_SVELTLY_TRIAGE_SECONDS +
    (1 - MIX_REAL_EMAIL) * TIME_WITH_SVELTLY_TRIAGE_LOW_EFFORT_SECONDS
  const withSveltly =
    triageWithSveltly +
    MIX_REPLY * TIME_WITH_SVELTLY_REPLY_SECONDS +
    MIX_EVENT * TIME_WITH_SVELTLY_SCHEDULING_SECONDS +
    MIX_TASK * TIME_WITH_SVELTLY_TASK_SECONDS
  return (manual - withSveltly) / manual
})()

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

// Le gain de triage s'applique à tout email réellement analysé (c'est la
// garantie de base de Sveltly) — mais au tarif "coup d'œil" pour les
// newsletters/pubs/notifications, voir LOW_EFFORT_TYPES. Les trois autres
// gains ne s'appliquent que si l'action correspondante a RÉELLEMENT eu lieu :
// - réponse : hasAIReply (un brouillon a été rédigé) ET email auquel on
//   répond vraiment — un brouillon "aucune réponse nécessaire" pour une
//   newsletter ne remplace aucune rédaction qui aurait eu lieu sans lui.
// - planification : calendarEventDetected, avec deux paliers — autoScheduled
//   (événement créé automatiquement, l'utilisateur n'a plus qu'à valider)
//   vs détecté seulement (conflit, hors fenêtre du forfait...), où
//   l'utilisateur doit encore créer l'événement lui-même et ne gagne que la
//   relecture de l'email déjà faite par l'IA — jamais le plein gain dans ce cas.
// - tâche : autoTaskCreated, pas actionItemDetected seul — ce dernier peut
//   être vrai sans qu'une tâche ait été créée (type exclu, doublon, erreur
//   d'écriture en base), auquel cas aucun temps n'a réellement été épargné.
//
// Séparée de calculateTimeSavedSeconds ci-dessous pour que l'appelant qui a
// déjà filtré ses emails du jour (voir app/(app)/dashboard/page.tsx, qui a
// aussi besoin de ce sous-ensemble pour todayEmailsCount) ne fasse pas deux
// fois le même passage sur la liste complète des emails.
export function calculateTimeSavedForEmails(emails: Email[]): number {
  let totalSeconds = 0
  for (const email of emails) {
    // Un email encore en attente d'analyse n'a, par définition, fait gagner
    // aucune seconde : l'IA ne l'a pas encore trié, résumé, ni répondu. Le
    // compter quand même faisait démarrer le compteur à un total déjà gonflé
    // dès la première synchro, avant tout travail réel (et le chiffre ne
    // bougeait plus ensuite, donnant l'impression inverse de ce qui se passe).
    if (email.analysisStatus === 'pending') continue

    const lowEffort = isLowEffort(email)

    totalSeconds += lowEffort
      ? TIME_MANUAL_TRIAGE_LOW_EFFORT_SECONDS - TIME_WITH_SVELTLY_TRIAGE_LOW_EFFORT_SECONDS
      : TIME_MANUAL_TRIAGE_SECONDS - TIME_WITH_SVELTLY_TRIAGE_SECONDS

    if (email.hasAIReply && !lowEffort) {
      totalSeconds += TIME_MANUAL_REPLY_SECONDS - TIME_WITH_SVELTLY_REPLY_SECONDS
    }

    if (email.calendarEventDetected) {
      totalSeconds += email.autoScheduled
        ? TIME_MANUAL_SCHEDULING_SECONDS - TIME_WITH_SVELTLY_SCHEDULING_SECONDS
        : TIME_MANUAL_EVENT_REVIEW_SECONDS - TIME_WITH_SVELTLY_EVENT_REVIEW_SECONDS
    }

    if (email.autoTaskCreated) {
      totalSeconds += TIME_MANUAL_TASK_NOTE_SECONDS - TIME_WITH_SVELTLY_TASK_SECONDS
    } else if (email.actionItemDetected) {
      // Deux paliers, comme pour les rendez-vous : une action reperee mais non
      // transformee en tache fait quand meme gagner la relecture du
      // paragraphe. Elle etait comptee pour zero, alors que le travail de
      // lecture, lui, avait bien ete fait par l'IA.
      totalSeconds += TIME_MANUAL_ACTION_REVIEW_SECONDS - TIME_WITH_SVELTLY_ACTION_REVIEW_SECONDS
    }

    // L'archivage automatique épargne un geste entier. Petit à l'unité, mais
    // c'est celui qui se répète le plus — et il ne comptait pour rien.
    if (email.autoArchived) {
      totalSeconds += TIME_MANUAL_ARCHIVE_SECONDS - TIME_WITH_SVELTLY_ARCHIVE_SECONDS
    }
  }
  return totalSeconds
}

export function calculateTimeSavedSeconds(emails: Email[], now: Date = new Date()): number {
  return calculateTimeSavedForEmails(getEmailsReceivedToday(emails, now))
}

/**
 * Total CUMULE sur tous les emails connus de Sveltly.
 *
 * C'est ce chiffre que le tableau de bord affiche, et non le total du jour.
 * Le total du jour retombait a « 0 min » a chaque minuit, puis restait a zero
 * tant qu'aucun email n'etait arrive — un compteur qui annonce zero a
 * quelqu'un dont il a trie des centaines de messages ne mesure pas le
 * produit, il le dement. Le cumul ne peut valoir zero que dans deux cas, tous
 * deux justes : aucun email, ou aucun email encore analyse (et le tableau de
 * bord affiche alors « — », pas « 0 min »).
 *
 * La portee est « tous les emails que Sveltly connait », c'est-a-dire la
 * fenetre de synchronisation (voir INITIAL_SYNC_MAX_AGE_DAYS dans
 * app/api/emails/route.ts). Pas « depuis toujours » : on n'affirme que ce
 * qu'on a reellement traite.
 */
export function calculateTimeSavedTotal(emails: Email[]): number {
  return calculateTimeSavedForEmails(emails)
}

/**
 * « 1 h 12 min », « 45 min », « < 1 min ».
 *
 * L'arrondi a la minute transformait tout total inferieur a 30 s en
 * « 0 min » — un email trie fait gagner 45 s, donc le tout premier affichage
 * d'un nouveau compte annoncait zero alors que le travail avait eu lieu.
 * « 0 min » n'est desormais rendu que pour un total reellement nul.
 *
 * Espaces insecables avant les unites : c'est la regle typographique
 * francaise, et ca evite qu'un retour a la ligne separe « 12 » de « min ».
 * N'encode aucun etat de chargement — l'appelant gere « — ».
 */
export function formatTimeSaved(totalSeconds: number): string {
  const secondes = Math.max(0, Math.round(totalSeconds))
  if (secondes === 0) return '0\u00a0min'
  if (secondes < 60) return '<\u00a01\u00a0min'
  const totalMinutes = Math.round(secondes / 60)
  const hours = Math.floor(totalMinutes / 60)
  const minutes = totalMinutes % 60
  if (hours === 0) return `${minutes}\u00a0min`
  // \u00ab 2 h \u00bb et non \u00ab 2 h 0 min \u00bb : le z\u00e9ro n'apporte rien et allonge la ligne.
  return minutes === 0 ? `${hours}\u00a0h` : `${hours}\u00a0h\u00a0${minutes}\u00a0min`
}
