// lib/scheduling.ts
//
// Logique pure (sans effet de bord, sans accès base de données) pour détecter
// les conflits d'agenda et réarranger une journée en respectant les
// préférences de l'utilisateur (heures de disponibilité, battement entre
// événements) ET la priorité de chaque événement — un événement urgent
// réserve son créneau avant un important, qui le réserve avant un normal ;
// jamais l'inverse. Testé indépendamment de toute base via
// scratchpad/test-scheduling.js (voir ce fichier pour les cas couverts).
import { Priority } from '@/types'

export interface ExistingEvent {
  id: string
  date: string       // 'YYYY-MM-DD'
  startTime: string  // 'HH:MM'
  endTime: string    // 'HH:MM'
}

export interface SchedulingPrefs {
  workStart: string        // 'HH:MM'
  workEnd: string          // 'HH:MM'
  bufferMinutes: number
  defaultDurationMinutes: number
}

// Les trois signaux qui rendent un événement non déplaçable par l'algorithme
// de réarrangement, quelle que soit sa priorité — voir isFixedEvent ci-dessous.
export interface EventFlags {
  // 'google_import' : événement créé directement dans Google Calendar et
  // importé tel quel (voir app/api/calendar/import) — Sveltly ne l'a jamais
  // créé, le déplacer unilatéralement désynchroniserait l'agenda réel de
  // l'utilisateur (et d'éventuels invités) sans qu'il l'ait demandé.
  origin: 'inflo' | 'google_import'
  // Connu uniquement pour les événements importés depuis Google — un
  // événement avec invités n'est jamais déplacé automatiquement (Sveltly
  // n'ajoute lui-même jamais d'invités aux événements qu'il crée).
  hasAttendees: boolean
  // Verrouillage manuel explicite de l'utilisateur sur CET événement précis.
  locked: boolean
}

export interface ArrangeableEvent extends ExistingEvent, EventFlags {
  priority: Priority
}

// Un événement "fixe" ne bouge jamais, même s'il chevauche un événement de
// priorité supérieure — l'algorithme le traite comme un obstacle au même
// titre que les heures de travail elles-mêmes.
export function isFixedEvent(flags: EventFlags): boolean {
  return flags.origin === 'google_import' || flags.hasAttendees || flags.locked
}

const PRIORITY_RANK: Record<Priority, number> = { urgent: 0, important: 1, normal: 2 }

// Comparateur unique pour tout affichage d'événements (EventList, AgendaTimeline...) :
// tri chronologique, et à heure de début égale, urgent avant important avant normal.
// `priority` absent est traité comme 'normal' — même repli que partout ailleurs
// dans le code pour les événements créés avant l'ajout de cette colonne.
export function compareByStartTimeThenPriority(
  a: { startTime: string; priority?: Priority },
  b: { startTime: string; priority?: Priority }
): number {
  if (a.startTime !== b.startTime) return a.startTime < b.startTime ? -1 : 1
  return PRIORITY_RANK[a.priority || 'normal'] - PRIORITY_RANK[b.priority || 'normal']
}

function toMinutes(hhmm: string): number {
  const [h, m] = hhmm.split(':').map(Number)
  return h * 60 + m
}

function toHHMM(totalMinutes: number): string {
  const h = Math.floor(totalMinutes / 60) % 24
  const m = totalMinutes % 60
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`
}

/**
 * Retourne les événements du même jour qui chevauchent le créneau demandé,
 * en tenant compte du battement (buffer) demandé avant/après chaque événement existant.
 */
export function findConflicts(
  date: string,
  startTime: string,
  endTime: string,
  existingEvents: ExistingEvent[],
  bufferMinutes: number
): ExistingEvent[] {
  const reqStart = toMinutes(startTime)
  const reqEnd = toMinutes(endTime)

  return existingEvents.filter(ev => {
    if (ev.date !== date) return false
    const evStart = toMinutes(ev.startTime) - bufferMinutes
    const evEnd = toMinutes(ev.endTime) + bufferMinutes
    // Chevauchement si les intervalles se croisent
    return reqStart < evEnd && reqEnd > evStart
  })
}

/**
 * Cherche le prochain créneau libre le même jour, en partant de l'heure
 * souhaitée, par pas de 15 minutes, dans les heures de disponibilité.
 * Retourne null si aucun créneau n'est trouvé ce jour-là (il faudra alors
 * proposer le lendemain, ou laisser l'utilisateur choisir manuellement).
 */
export function suggestAlternativeSlot(
  date: string,
  desiredStartTime: string,
  durationMinutes: number,
  existingEvents: ExistingEvent[],
  prefs: SchedulingPrefs
): { startTime: string; endTime: string } | null {
  const workStartMin = toMinutes(prefs.workStart)
  const workEndMin = toMinutes(prefs.workEnd)
  const desiredStartMin = Math.max(toMinutes(desiredStartTime), workStartMin)

  const STEP = 15

  for (let candidateStart = desiredStartMin; candidateStart + durationMinutes <= workEndMin; candidateStart += STEP) {
    const candidateEnd = candidateStart + durationMinutes
    const candidateStartHHMM = toHHMM(candidateStart)
    const candidateEndHHMM = toHHMM(candidateEnd)

    const conflicts = findConflicts(date, candidateStartHHMM, candidateEndHHMM, existingEvents, prefs.bufferMinutes)
    if (conflicts.length === 0) {
      return { startTime: candidateStartHHMM, endTime: candidateEndHHMM }
    }
  }

  return null // rien de libre ce jour-là dans les heures de dispo
}

// Comme suggestAlternativeSlot, mais cherche dans LES DEUX DIRECTIONS à partir
// de l'heure d'origine et retourne le créneau libre le plus proche (avant ou
// après) — utilisé par resolveDayArrangement pour déplacer un événement le
// moins possible par rapport à son horaire initial, plutôt que de toujours le
// pousser plus tard dans la journée.
function suggestNearestFreeSlot(
  date: string,
  desiredStartTime: string,
  durationMinutes: number,
  existingEvents: ExistingEvent[],
  prefs: SchedulingPrefs
): { startTime: string; endTime: string } | null {
  const workStartMin = toMinutes(prefs.workStart)
  const workEndMin = toMinutes(prefs.workEnd)
  const desiredStartMin = toMinutes(desiredStartTime)
  const STEP = 15

  function fits(startMin: number): boolean {
    if (startMin < workStartMin || startMin + durationMinutes > workEndMin) return false
    const conflicts = findConflicts(date, toHHMM(startMin), toHHMM(startMin + durationMinutes), existingEvents, prefs.bufferMinutes)
    return conflicts.length === 0
  }

  const maxOffset = workEndMin - workStartMin
  for (let offset = STEP; offset <= maxOffset; offset += STEP) {
    const later = desiredStartMin + offset
    if (later + durationMinutes <= workEndMin && fits(later)) {
      return { startTime: toHHMM(later), endTime: toHHMM(later + durationMinutes) }
    }
    const earlier = desiredStartMin - offset
    if (earlier >= workStartMin && fits(earlier)) {
      return { startTime: toHHMM(earlier), endTime: toHHMM(earlier + durationMinutes) }
    }
  }

  return null
}

export interface ArrangementMove {
  id: string
  originalStartTime: string
  originalEndTime: string
  newStartTime: string
  newEndTime: string
  // false si l'événement reste exactement à son horaire d'origine (qu'il ait
  // fallu le vérifier ou non) — c'est ce flag, pas une comparaison de chaînes
  // côté appelant, qui doit servir à décider si un événement a "bougé".
  moved: boolean
  // true si aucun créneau libre n'a été trouvé dans les heures de travail —
  // l'événement reste à son horaire d'origine (donc en conflit), JAMAIS
  // déplacé de force et JAMAIS laissé disparaître. L'appelant doit le
  // signaler clairement plutôt que l'appliquer tel quel.
  atRisk: boolean
}

/**
 * Calcule un réarrangement complet d'une journée : place d'abord les
 * événements fixes (isFixedEvent) tels quels, puis les événements flexibles
 * dans l'ordre urgent → important → normal (et par heure d'origine à égalité
 * de priorité) — chaque événement réserve son créneau d'origine s'il est
 * libre ; sinon il est déplacé au créneau libre le plus proche, JAMAIS plus
 * prioritaire que ce qu'il déplace. Fonction pure : aucune écriture, aucun
 * accès réseau — à l'appelant de transformer son résultat en confirmation
 * utilisateur puis en écritures (voir app/api/calendar/apply-arrangement).
 */
export function resolveDayArrangement(
  events: ArrangeableEvent[],
  prefs: SchedulingPrefs
): ArrangementMove[] {
  const fixed = events.filter(isFixedEvent)
  const flexible = events.filter(e => !isFixedEvent(e))

  // Array.prototype.sort est stable (garanti par la spec ES2019+) : à
  // priorité ET heure de début identiques, l'ordre d'origine du tableau
  // `events` passé en entrée est conservé — donc entre deux événements
  // parfaitement à égalité, celui déjà présent dans la liste gagne son
  // créneau avant un nouvel événement qu'on tenterait d'insérer juste après
  // lui dans ce même tableau (voir resolveScheduling, qui place toujours le
  // nouvel événement en dernière position du tableau fourni à cette
  // fonction) — premier arrivé, premier servi à égalité stricte.
  const ordered = [...flexible].sort((a, b) => {
    const rankDiff = PRIORITY_RANK[a.priority] - PRIORITY_RANK[b.priority]
    if (rankDiff !== 0) return rankDiff
    return a.startTime < b.startTime ? -1 : a.startTime > b.startTime ? 1 : 0
  })

  // Les événements déjà placés (fixes + flexibles déjà traités) forment la
  // liste d'obstacles contre laquelle chaque nouvel événement flexible est
  // vérifié, au fur et à mesure.
  const placed: ExistingEvent[] = fixed.map(e => ({ id: e.id, date: e.date, startTime: e.startTime, endTime: e.endTime }))

  const moves: ArrangementMove[] = fixed.map(e => ({
    id: e.id,
    originalStartTime: e.startTime,
    originalEndTime: e.endTime,
    newStartTime: e.startTime,
    newEndTime: e.endTime,
    moved: false,
    atRisk: false,
  }))

  for (const e of ordered) {
    const durationMinutes = toMinutes(e.endTime) - toMinutes(e.startTime)
    const conflicts = findConflicts(e.date, e.startTime, e.endTime, placed, prefs.bufferMinutes)

    if (conflicts.length === 0) {
      placed.push({ id: e.id, date: e.date, startTime: e.startTime, endTime: e.endTime })
      moves.push({
        id: e.id,
        originalStartTime: e.startTime,
        originalEndTime: e.endTime,
        newStartTime: e.startTime,
        newEndTime: e.endTime,
        moved: false,
        atRisk: false,
      })
      continue
    }

    const alt = suggestNearestFreeSlot(e.date, e.startTime, durationMinutes, placed, prefs)

    if (alt) {
      placed.push({ id: e.id, date: e.date, startTime: alt.startTime, endTime: alt.endTime })
      moves.push({
        id: e.id,
        originalStartTime: e.startTime,
        originalEndTime: e.endTime,
        newStartTime: alt.startTime,
        newEndTime: alt.endTime,
        moved: true,
        atRisk: false,
      })
    } else {
      // Aucun créneau libre ce jour-là : reste à son horaire d'origine (donc
      // toujours en conflit), signalé "à risque" plutôt que déplacé de force
      // ou silencieusement abandonné.
      moves.push({
        id: e.id,
        originalStartTime: e.startTime,
        originalEndTime: e.endTime,
        newStartTime: e.startTime,
        newEndTime: e.endTime,
        moved: false,
        atRisk: true,
      })
    }
  }

  return moves
}

export type SchedulingStatus =
  | 'clear'                      // aucun conflit, placé tel quel
  | 'conflict_moved'              // le nouvel événement seul a dû changer d'horaire
  | 'conflict_displaces_others'   // un ou plusieurs événements moins prioritaires doivent être déplacés
  | 'conflict_no_alternative'     // aucune solution trouvée dans les heures de travail

export interface SchedulingResult {
  status: SchedulingStatus
  // Horaire final proposé pour le NOUVEL événement (inchangé si status === 'clear'
  // ou 'conflict_displaces_others' sans que lui-même n'ait eu besoin de bouger).
  startTime: string
  endTime: string
  // Conflits bruts détectés contre l'horaire initialement demandé (avant tout
  // réarrangement) — sert à afficher "chevauche N événement(s)".
  conflicts: ExistingEvent[]
  // Rétrocompatible avec l'ancien comportement (un seul créneau alternatif
  // pour le nouvel événement) — rempli uniquement pour 'conflict_moved'.
  alternative: { startTime: string; endTime: string } | null
  // Autres événements du jour que le réarrangement propose de déplacer —
  // jamais appliqué sans confirmation explicite de l'utilisateur.
  displaced: ArrangementMove[]
  // Autres événements du jour qui, dans ce même réarrangement, n'ont PU être
  // recasés nulle part (aucun créneau libre avant la fin des heures de
  // travail) — distincts de `displaced` : ceux-ci restent à leur horaire
  // d'origine, donc toujours en conflit. Jamais silencieux : l'appelant doit
  // les signaler explicitement (ex: "⚠ Impossible de recaser X") avant toute
  // application du plan, même si le reste du plan est par ailleurs accepté.
  atRiskOthers: ArrangementMove[]
}

const NEW_EVENT_ID = '__new__'

/**
 * Point d'entrée principal pour l'insertion d'UN nouvel événement dans une
 * journée existante. Priority-aware : si le nouvel événement est plus
 * prioritaire qu'un événement flexible déjà en place, c'est CE DERNIER qui se
 * voit proposer un nouveau créneau — jamais le nouvel événement, qui garde
 * son horaire demandé. Construit sur resolveDayArrangement (même algorithme
 * que le bouton "Réorganiser ma journée"), pour qu'il n'existe qu'une seule
 * logique de réarrangement dans tout le code.
 */
export function resolveScheduling(
  date: string,
  requestedStartTime: string,
  requestedEndTime: string | null,
  priority: Priority,
  existingEvents: ArrangeableEvent[],
  prefs: SchedulingPrefs
): SchedulingResult {
  const requestedDuration = requestedEndTime
    ? toMinutes(requestedEndTime) - toMinutes(requestedStartTime)
    : null
  // Une heure de fin antérieure ou égale à l'heure de début donne une durée
  // négative ou nulle — incohérent (erreur d'extraction IA la plupart du
  // temps). On l'ignore et retombe sur la durée par défaut plutôt que
  // d'insérer un événement avec une fin avant son début.
  const durationMinutes = requestedDuration !== null && requestedDuration > 0
    ? requestedDuration
    : prefs.defaultDurationMinutes

  const finalEndTime = (requestedEndTime && requestedDuration !== null && requestedDuration > 0)
    ? requestedEndTime
    : toHHMM(toMinutes(requestedStartTime) + durationMinutes)

  const conflicts = findConflicts(date, requestedStartTime, finalEndTime, existingEvents, prefs.bufferMinutes)

  if (conflicts.length === 0) {
    return {
      status: 'clear',
      startTime: requestedStartTime,
      endTime: finalEndTime,
      conflicts: [],
      alternative: null,
      displaced: [],
      atRiskOthers: [],
    }
  }

  const newEvent: ArrangeableEvent = {
    id: NEW_EVENT_ID,
    date,
    startTime: requestedStartTime,
    endTime: finalEndTime,
    priority,
    origin: 'inflo',
    hasAttendees: false,
    locked: false,
  }

  const arrangement = resolveDayArrangement([...existingEvents, newEvent], prefs)
  const newEventMove = arrangement.find(m => m.id === NEW_EVENT_ID)!
  const others = arrangement.filter(m => m.id !== NEW_EVENT_ID)
  // Calculé dans tous les cas, même quand le nouvel événement lui-même est
  // à risque : un autre événement du jour peut échouer à se recaser
  // indépendamment du sort du nouvel événement (voir le commentaire sur
  // atRiskOthers dans SchedulingResult) — jamais passé sous silence.
  const displaced = others.filter(m => m.moved)
  const atRiskOthers = others.filter(m => m.atRisk)

  if (newEventMove.atRisk) {
    return {
      status: 'conflict_no_alternative',
      startTime: requestedStartTime,
      endTime: finalEndTime,
      conflicts,
      alternative: null,
      displaced,
      atRiskOthers,
    }
  }

  if (displaced.length > 0) {
    return {
      status: 'conflict_displaces_others',
      startTime: newEventMove.newStartTime,
      endTime: newEventMove.newEndTime,
      conflicts,
      alternative: null,
      displaced,
      atRiskOthers,
    }
  }

  // Le nouvel événement a dû bouger, mais sans déplacer personne d'autre —
  // comportement équivalent à l'ancien suggestAlternativeSlot.
  return {
    status: 'conflict_moved',
    startTime: newEventMove.newStartTime,
    endTime: newEventMove.newEndTime,
    conflicts,
    alternative: { startTime: newEventMove.newStartTime, endTime: newEventMove.newEndTime },
    displaced: [],
    atRiskOthers,
  }
}
