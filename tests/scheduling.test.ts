// Réarrangement de l'agenda — lib/scheduling.ts
//
// 419 lignes, la logique la plus délicate du projet, et celle dont une
// régression se paie le plus cher : déplacer un vrai rendez-vous dans le
// Google Calendar de quelqu'un, avec ses invités, sans qu'il l'ait demandé.
import { test, describe } from 'node:test'
import assert from 'node:assert/strict'
import {
  isFixedEvent,
  findConflicts,
  suggestAlternativeSlot,
  resolveScheduling,
  compareByStartTimeThenPriority,
  type ArrangeableEvent,
  type SchedulingPrefs,
} from '../lib/scheduling.ts'

const JOUR = '2026-06-15'

const PREFS: SchedulingPrefs = {
  workStart: '09:00',
  workEnd: '18:00',
  bufferMinutes: 15,
  defaultDurationMinutes: 30,
}

function evenement(p: Partial<ArrangeableEvent> & { id: string; startTime: string; endTime: string }): ArrangeableEvent {
  return {
    date: JOUR,
    priority: 'normal',
    origin: 'inflo',
    hasAttendees: false,
    locked: false,
    ...p,
  }
}

describe('isFixedEvent — ce que Sveltly ne déplacera jamais', () => {
  test('un événement créé par Sveltly, sans invité ni verrou, est déplaçable', () => {
    assert.equal(isFixedEvent({ origin: 'inflo', hasAttendees: false, locked: false }), false)
  })

  // Les trois signaux, chacun suffisant à lui seul.
  test('importé de Google : jamais déplacé', () => {
    assert.equal(isFixedEvent({ origin: 'google_import', hasAttendees: false, locked: false }), true)
  })

  test('avec invités : jamais déplacé', () => {
    assert.equal(isFixedEvent({ origin: 'inflo', hasAttendees: true, locked: false }), true)
  })

  test('verrouillé par l’utilisateur : jamais déplacé', () => {
    assert.equal(isFixedEvent({ origin: 'inflo', hasAttendees: false, locked: true }), true)
  })
})

describe('findConflicts', () => {
  const existants = [{ id: 'a', date: JOUR, startTime: '10:00', endTime: '11:00' }]

  test('un chevauchement franc est détecté', () => {
    assert.equal(findConflicts(JOUR, '10:30', '11:30', existants, 0).length, 1)
  })

  test('un créneau nettement à côté ne conflicte pas', () => {
    assert.equal(findConflicts(JOUR, '14:00', '15:00', existants, 0).length, 0)
  })

  test('collé bout à bout, sans tampon : pas de conflit', () => {
    assert.equal(findConflicts(JOUR, '11:00', '12:00', existants, 0).length, 0)
  })

  // Le tampon est précisément là pour ne pas enchaîner deux rendez-vous sans
  // une minute pour souffler entre les deux.
  test('collé bout à bout, avec 15 min de tampon : conflit', () => {
    assert.equal(findConflicts(JOUR, '11:00', '12:00', existants, 15).length, 1)
  })

  test('un autre jour n’est jamais un conflit', () => {
    assert.equal(findConflicts('2026-06-16', '10:30', '11:30', existants, 15).length, 0)
  })
})

describe('suggestAlternativeSlot', () => {
  test('propose un créneau qui ne conflicte plus', () => {
    const existants = [{ id: 'a', date: JOUR, startTime: '10:00', endTime: '11:00' }]
    const slot = suggestAlternativeSlot(JOUR, '10:00', 30, existants, PREFS)
    assert.ok(slot, 'aucun créneau proposé alors que la journée est presque vide')
    assert.equal(findConflicts(JOUR, slot.startTime, slot.endTime, existants, PREFS.bufferMinutes).length, 0)
  })

  test('le créneau proposé tient dans les heures de travail', () => {
    const slot = suggestAlternativeSlot(JOUR, '09:00', 60, [], PREFS)
    assert.ok(slot)
    assert.ok(slot.startTime >= PREFS.workStart)
    assert.ok(slot.endTime <= PREFS.workEnd)
  })

  // Rien n'est inventé en dehors des heures de travail : on rend null, et
  // l'appelant doit le dire à l'utilisateur.
  test('journée pleine : rend null plutôt qu’un créneau hors horaires', () => {
    const plein = [{ id: 'x', date: JOUR, startTime: '09:00', endTime: '18:00' }]
    assert.equal(suggestAlternativeSlot(JOUR, '09:00', 60, plein, PREFS), null)
  })

  test('une demande avant l’ouverture est ramenée dans les heures de travail', () => {
    const slot = suggestAlternativeSlot(JOUR, '06:00', 30, [], PREFS)
    assert.ok(slot)
    assert.ok(slot.startTime >= PREFS.workStart)
  })
})

describe('resolveScheduling', () => {
  test('journée vide : placé tel quel', () => {
    const r = resolveScheduling(JOUR, '10:00', '11:00', 'normal', [], PREFS)
    assert.equal(r.status, 'clear')
    assert.equal(r.startTime, '10:00')
    assert.equal(r.endTime, '11:00')
    assert.equal(r.conflicts.length, 0)
  })

  test('sans heure de fin, la durée par défaut s’applique', () => {
    const r = resolveScheduling(JOUR, '10:00', null, 'normal', [], PREFS)
    assert.equal(r.status, 'clear')
    assert.equal(r.endTime, '10:30')
  })

  // Une fin avant le début vient presque toujours d'une extraction IA ratée.
  // On retombe sur la durée par défaut plutôt que d'écrire un événement
  // incohérent en base.
  test('une heure de fin antérieure au début est ignorée', () => {
    const r = resolveScheduling(JOUR, '10:00', '09:00', 'normal', [], PREFS)
    assert.equal(r.endTime, '10:30')
  })

  test('un conflit réel est signalé, jamais écrasé en silence', () => {
    const occupe = [evenement({ id: 'a', startTime: '10:00', endTime: '11:00' })]
    const r = resolveScheduling(JOUR, '10:30', '11:30', 'normal', occupe, PREFS)
    assert.notEqual(r.status, 'clear')
    assert.ok(r.conflicts.length >= 1)
  })

  // L'invariant qui protège les vrais rendez-vous : face à un événement fixe,
  // c'est le NOUVEL arrivant qui cède, jamais l'inverse.
  test('un événement fixe n’est jamais proposé au déplacement', () => {
    const fixe = [evenement({ id: 'reunion', startTime: '10:00', endTime: '11:00', origin: 'google_import', hasAttendees: true })]
    const r = resolveScheduling(JOUR, '10:00', '11:00', 'urgent', fixe, PREFS)
    const deplaces = [...r.displaced, ...r.atRiskOthers].map(m => m.id)
    assert.ok(!deplaces.includes('reunion'), 'un rendez-vous Google avec invités a été proposé au déplacement')
  })

  test('le résultat reste dans les heures de travail', () => {
    const occupe = [evenement({ id: 'a', startTime: '09:00', endTime: '12:00' })]
    const r = resolveScheduling(JOUR, '09:00', '10:00', 'normal', occupe, PREFS)
    assert.ok(r.startTime >= PREFS.workStart)
    assert.ok(r.endTime <= PREFS.workEnd)
  })
})

describe('compareByStartTimeThenPriority', () => {
  test('trie d’abord par heure de début', () => {
    const a = { startTime: '09:00', priority: 'normal' as const }
    const b = { startTime: '11:00', priority: 'urgent' as const }
    assert.ok(compareByStartTimeThenPriority(a, b) < 0)
  })

  test('à heure égale, urgent passe devant important, puis normal', () => {
    const urgent = { startTime: '10:00', priority: 'urgent' as const }
    const important = { startTime: '10:00', priority: 'important' as const }
    const normal = { startTime: '10:00', priority: 'normal' as const }
    assert.ok(compareByStartTimeThenPriority(urgent, important) < 0)
    assert.ok(compareByStartTimeThenPriority(important, normal) < 0)
  })

  test('priorité absente : traitée comme normal, sans plantage', () => {
    const sans = { startTime: '10:00' }
    const urgent = { startTime: '10:00', priority: 'urgent' as const }
    assert.ok(compareByStartTimeThenPriority(urgent, sans) < 0)
  })
})
