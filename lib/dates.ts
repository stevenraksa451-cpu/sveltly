// lib/dates.ts
// « Quel jour on est » — source unique.
//
// LE BUG QUE CE FICHIER CORRIGE
// Dix-sept endroits calculaient la date du jour avec
// `new Date().toISOString().slice(0, 10)`. Or `toISOString()` rend l'instant
// en **UTC**, alors que toutes les dates du produit — échéances de tâches,
// jours d'agenda — sont des dates de calendrier LOCALES, écrites `YYYY-MM-DD`
// sans fuseau.
//
// Les deux se croisent tous les jours, dans les deux sens :
//
//   15 juin, 00h30 à Paris       attendu 2026-06-15   UTC rendait 2026-06-14
//   15 juin, 20h00 à Montréal    attendu 2026-06-15   UTC rendait 2026-06-16
//
// Conséquences visibles : une tâche due aujourd'hui s'affiche « En retard »,
// l'agenda s'ouvre sur la veille, la case « Aujourd'hui » surligne le mauvais
// jour, et côté serveur une échéance parfaitement valide était rejetée comme
// passée. Pour un utilisateur en Europe la fenêtre fautive ne dure qu'une à
// deux heures après minuit ; à l'ouest de Greenwich elle couvre toute la
// fin de journée.
//
// ⚠️ CE QUI NE DOIT PAS PASSER PAR ICI
// - `lib/tasks.ts` valide une date en la reconstruisant avec `T00:00:00Z`
//   puis en comparant le retour de `toISOString()`. L'UTC y est correct des
//   deux côtés : c'est un aller-retour, pas une date du jour.
// - Le quota mensuel (`increment_ai_usage`, `lib/ai-usage.ts`) raisonne en
//   mois UTC de bout en bout. Y mêler une date locale ferait diverger la base
//   et l'application. Voir CLAUDE.md.

/**
 * La date de calendrier LOCALE de la machine qui exécute, en `YYYY-MM-DD`.
 * C'est ce qu'il faut partout côté navigateur : l'utilisateur et son écran
 * sont dans le même fuseau.
 */
export function isoLocal(d: Date = new Date()): string {
  const mois = String(d.getMonth() + 1).padStart(2, '0')
  const jour = String(d.getDate()).padStart(2, '0')
  return `${d.getFullYear()}-${mois}-${jour}`
}

/** `isoLocal` décalé de N jours (N négatif accepté). */
export function isoLocalDansNJours(n: number, d: Date = new Date()): string {
  const copie = new Date(d.getFullYear(), d.getMonth(), d.getDate() + n)
  return isoLocal(copie)
}

/**
 * La date de calendrier dans un fuseau DONNÉ, en `YYYY-MM-DD`.
 *
 * Côté serveur, « aujourd'hui » n'a de sens que dans le fuseau de
 * l'utilisateur — `profiles.timezone`, qui vaut `Europe/Paris` par défaut.
 * Le fuseau du serveur, lui, ne veut rien dire : il dépend de l'hébergeur.
 *
 * `en-CA` rend déjà `YYYY-MM-DD`, mais on assemble depuis `formatToParts`
 * plutôt que de s'y fier : le format d'une locale n'est pas un contrat.
 * Un fuseau invalide ferait lever `Intl` — on retombe alors sur la date
 * locale, qui est au pire aussi fausse qu'avant, jamais pire.
 */
export function isoDansFuseau(timezone: string | null | undefined, d: Date = new Date()): string {
  if (!timezone) return isoLocal(d)
  try {
    const parties = new Intl.DateTimeFormat('en-CA', {
      timeZone: timezone,
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
    }).formatToParts(d)

    const get = (type: string) => parties.find(p => p.type === type)?.value
    const annee = get('year'), mois = get('month'), jour = get('day')
    if (!annee || !mois || !jour) return isoLocal(d)
    return `${annee}-${mois}-${jour}`
  } catch {
    return isoLocal(d)
  }
}
