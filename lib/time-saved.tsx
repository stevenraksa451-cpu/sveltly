// lib/time-saved.tsx
// Calcul du "temps économisé aujourd'hui" affiché sur le tableau de bord.
// Toutes les hypothèses de durée vivent dans CE fichier, et nulle part
// ailleurs, pour pouvoir les ajuster sans toucher au reste du code — et pour
// que la méthode reste vérifiable plutôt qu'un chiffre marketing gonflé.
// Extension .tsx (pas .ts) uniquement à cause de TIME_SAVED_METHOD_NOTE
// ci-dessous, qui embarque <Brand /> — tout le reste du fichier reste de la
// logique pure, sans JSX.
import { Email } from '@/types'
import Brand from '@/components/ui/Brand'

// --- Temps de traitement MANUEL (sans Sveltly) -------------------------------
// Repères couramment cités dans les études de productivité sur la charge de
// travail liée aux emails en entreprise (ex : McKinsey Global Institute —
// "Le potentiel social de la technologie" — estime qu'un salarié consacre en
// moyenne 28 % de sa semaine de travail aux emails). Les durées ci-dessous
// sont des estimations raisonnables par action, pas une mesure scientifique
// exacte : ajustez-les librement si vous avez de meilleures données.
export const TIME_MANUAL_TRIAGE_SECONDS = 60 // lire et décider quoi faire d'un email
export const TIME_MANUAL_REPLY_SECONDS = 150 // rédiger une réponse courte manuellement (~2min30)
export const TIME_MANUAL_SCHEDULING_SECONDS = 120 // ouvrir l'agenda, vérifier les dispos, créer l'événement
// Réunion détectée mais PAS auto-planifiée (conflit, hors fenêtre du forfait...) :
// l'utilisateur doit quand même ouvrir son agenda et créer l'événement lui-même,
// Sveltly lui épargne seulement la relecture de l'email pour en extraire date/heure.
export const TIME_MANUAL_EVENT_REVIEW_SECONDS = 40
export const TIME_MANUAL_TASK_NOTE_SECONDS = 45 // repérer une action à faire et la noter soi-même dans une todo

// --- Temps résiduel AVEC Sveltly ----------------------------------------------
// L'utilisateur relit/valide au lieu de rédiger/chercher lui-même.
export const TIME_WITH_SVELTLY_TRIAGE_SECONDS = 5 // l'email est déjà classé et résumé
export const TIME_WITH_SVELTLY_REPLY_SECONDS = 20 // relire/ajuster un brouillon au lieu de l'écrire
export const TIME_WITH_SVELTLY_SCHEDULING_SECONDS = 10 // valider un événement déjà proposé
export const TIME_WITH_SVELTLY_EVENT_REVIEW_SECONDS = 5 // date/heure déjà extraites dans le résumé, reste à les saisir soi-même
export const TIME_WITH_SVELTLY_TASK_SECONDS = 5 // la tâche est déjà créée, juste à la voir dans la liste

// Phrase affichée dans l'info-bulle du tableau de bord — garder en phase
// avec les constantes ci-dessus si vous les modifiez.
export const TIME_SAVED_METHOD_NOTE = (
  <>
    Basé sur des temps de traitement manuel moyens (lecture, rédaction, planification, création de tâches) comparés au temps de relecture avec <Brand />. Référence : étude McKinsey Global Institute sur le temps consacré aux emails en entreprise.
  </>
)

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

// Chaque email reçu aujourd'hui est passé par le tri automatique de l'IA
// (c'est la garantie de base de Sveltly, appliquée sans exception à tout email
// affiché) — le gain de triage s'applique donc à tous. Les trois autres
// gains ne s'appliquent que si l'action correspondante a RÉELLEMENT eu lieu :
// - réponse : hasAIReply (un brouillon a été rédigé)
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
export function calculateTimeSavedForTodayEmails(todayEmails: Email[]): number {
  let totalSeconds = 0
  for (const email of todayEmails) {
    totalSeconds += TIME_MANUAL_TRIAGE_SECONDS - TIME_WITH_SVELTLY_TRIAGE_SECONDS

    if (email.hasAIReply) {
      totalSeconds += TIME_MANUAL_REPLY_SECONDS - TIME_WITH_SVELTLY_REPLY_SECONDS
    }

    if (email.calendarEventDetected) {
      totalSeconds += email.autoScheduled
        ? TIME_MANUAL_SCHEDULING_SECONDS - TIME_WITH_SVELTLY_SCHEDULING_SECONDS
        : TIME_MANUAL_EVENT_REVIEW_SECONDS - TIME_WITH_SVELTLY_EVENT_REVIEW_SECONDS
    }

    if (email.autoTaskCreated) {
      totalSeconds += TIME_MANUAL_TASK_NOTE_SECONDS - TIME_WITH_SVELTLY_TASK_SECONDS
    }
  }
  return totalSeconds
}

export function calculateTimeSavedSeconds(emails: Email[], now: Date = new Date()): number {
  return calculateTimeSavedForTodayEmails(getEmailsReceivedToday(emails, now))
}

// "1h 12min" ou "45min". N'encode pas d'état de chargement — un total à 0
// (aucun email traité aujourd'hui) affiche légitimement "0min" ; c'est à
// l'appelant de gérer séparément un éventuel fallback "—" pendant le
// chargement (voir app/(app)/dashboard/page.tsx).
export function formatTimeSaved(totalSeconds: number): string {
  const totalMinutes = Math.max(0, Math.round(totalSeconds / 60))
  const hours = Math.floor(totalMinutes / 60)
  const minutes = totalMinutes % 60
  return hours > 0 ? `${hours}h ${minutes}min` : `${minutes}min`
}
