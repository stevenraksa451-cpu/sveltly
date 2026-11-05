// Le compteur « temps économisé » est un modèle CHIFFRÉ affiché à
// l'utilisateur : sa crédibilité tient à ce que chaque seconde annoncée
// corresponde à une action qui a eu lieu. Ces tests gardent exactement cela.
//
// Trois défauts réels sont figés ici :
//   1. le RÉSUMÉ était fondu dans le triage, donc crédité même en mode
//      dégradé, où buildFallback n'en produit aucun ;
//   2. le réarrangement d'agenda (schedulingDisplaced) comptait pour zéro ;
//   3. la séparation tri/résumé ne devait RIEN changer aux totaux existants
//      quand le résumé est là — sinon ce n'était plus une correction, c'était
//      une inflation.
import { test } from 'node:test'
import assert from 'node:assert/strict'
import type { Email } from '../types/index.ts'
import {
  timeSavedForEmail,
  calculateTimeSavedForEmails,
  calculateTimeSavedTotal,
  getEmailsReceivedToday,
  formatTimeSaved,
  isLowEffort,
  SAVINGS_RATIO,
  TIME_MANUAL_TRI_SECONDS,
  TIME_MANUAL_RESUME_SECONDS,
  TIME_MANUAL_TRI_LOW_EFFORT_SECONDS,
  TIME_MANUAL_RESUME_LOW_EFFORT_SECONDS,
  TIME_WITH_SVELTLY_TRI_SECONDS,
  TIME_WITH_SVELTLY_RESUME_SECONDS,
  TIME_WITH_SVELTLY_TRI_LOW_EFFORT_SECONDS,
  TIME_WITH_SVELTLY_RESUME_LOW_EFFORT_SECONDS,
  TIME_MANUAL_REARRANGEMENT_SECONDS,
  TIME_WITH_SVELTLY_REARRANGEMENT_SECONDS,
  TIME_MANUAL_REPLY_SECONDS,
  TIME_WITH_SVELTLY_REPLY_SECONDS,
  TIME_MANUAL_SCHEDULING_SECONDS,
  TIME_WITH_SVELTLY_SCHEDULING_SECONDS,
  TIME_MANUAL_EVENT_REVIEW_SECONDS,
  TIME_WITH_SVELTLY_EVENT_REVIEW_SECONDS,
  TIME_MANUAL_TASK_NOTE_SECONDS,
  TIME_WITH_SVELTLY_TASK_SECONDS,
  TIME_MANUAL_ACTION_REVIEW_SECONDS,
  TIME_WITH_SVELTLY_ACTION_REVIEW_SECONDS,
  TIME_MANUAL_ARCHIVE_SECONDS,
  TIME_WITH_SVELTLY_ARCHIVE_SECONDS,
} from '../lib/time-saved-calcul.ts'

// Un email minimal : tous les champs d'analyse sont absents, donc seul le tri
// est crédité. Chaque test n'ajoute QUE ce qu'il veut mesurer.
function email(extra: Partial<Email> = {}): Email {
  return {
    id: 'e1',
    subject: 'Objet',
    sender: 'Client',
    senderEmail: 'client@exemple.fr',
    preview: '',
    body: '',
    receivedAt: new Date().toISOString(),
    isRead: false,
    tags: [],
    priority: 'normal',
    analysisStatus: 'done',
    ...extra,
  }
}

const GAIN_TRI = TIME_MANUAL_TRI_SECONDS - TIME_WITH_SVELTLY_TRI_SECONDS
const GAIN_RESUME = TIME_MANUAL_RESUME_SECONDS - TIME_WITH_SVELTLY_RESUME_SECONDS
const GAIN_TRI_LOW = TIME_MANUAL_TRI_LOW_EFFORT_SECONDS - TIME_WITH_SVELTLY_TRI_LOW_EFFORT_SECONDS
const GAIN_RESUME_LOW = TIME_MANUAL_RESUME_LOW_EFFORT_SECONDS - TIME_WITH_SVELTLY_RESUME_LOW_EFFORT_SECONDS

// --- 1 · La séparation tri/résumé ne gonfle rien -----------------------------
// C'est la garantie la plus importante du lot : un email complet doit valoir
// EXACTEMENT ce qu'il valait quand triage était une seule ligne de 60 → 15.

test('tri + résumé valent ensemble l’ancien triage (60 s manuelles, 15 s restantes)', () => {
  assert.equal(TIME_MANUAL_TRI_SECONDS + TIME_MANUAL_RESUME_SECONDS, 60)
  assert.equal(TIME_WITH_SVELTLY_TRI_SECONDS + TIME_WITH_SVELTLY_RESUME_SECONDS, 15)
  assert.equal(GAIN_TRI + GAIN_RESUME, 45)
})

test('tri + résumé « coup d’œil » valent ensemble l’ancien triage allégé (12 s / 3 s)', () => {
  assert.equal(TIME_MANUAL_TRI_LOW_EFFORT_SECONDS + TIME_MANUAL_RESUME_LOW_EFFORT_SECONDS, 12)
  assert.equal(TIME_WITH_SVELTLY_TRI_LOW_EFFORT_SECONDS + TIME_WITH_SVELTLY_RESUME_LOW_EFFORT_SECONDS, 3)
  assert.equal(GAIN_TRI_LOW + GAIN_RESUME_LOW, 9)
})

// --- 2 · Le résumé n’est compté que s’il existe ------------------------------

test('un email trié ET résumé compte le tri et le résumé', () => {
  assert.equal(timeSavedForEmail(email({ dailySummary: 'Le client relance.' })), GAIN_TRI + GAIN_RESUME)
})

test('mode dégradé : trié sans résumé, le résumé n’est PAS compté', () => {
  // buildFallback ne produit aucun dailySummary. L'email valait 45 s comme
  // s'il avait été lu ; il vaut maintenant le seul gain de tri.
  assert.equal(timeSavedForEmail(email()), GAIN_TRI)
  assert.ok(timeSavedForEmail(email()) < timeSavedForEmail(email({ dailySummary: 'x' })))
})

test('un résumé vide ne compte pas plus qu’un résumé absent', () => {
  assert.equal(timeSavedForEmail(email({ dailySummary: '' })), GAIN_TRI)
})

// --- 3 · Le réarrangement d’agenda est crédité ------------------------------

test('un rendez-vous qui a déplacé d’autres événements compte le réarrangement', () => {
  const sansConflit = email({ calendarEventDetected: true, autoScheduled: true })
  const avecConflit = email({
    calendarEventDetected: true,
    autoScheduled: true,
    schedulingDisplaced: [{ id: 'evt-1' }],
  })
  assert.equal(
    timeSavedForEmail(avecConflit) - timeSavedForEmail(sansConflit),
    TIME_MANUAL_REARRANGEMENT_SECONDS - TIME_WITH_SVELTLY_REARRANGEMENT_SECONDS
  )
})

test('un tableau de déplacements VIDE ne compte rien', () => {
  const vide = email({ calendarEventDetected: true, autoScheduled: true, schedulingDisplaced: [] })
  const absent = email({ calendarEventDetected: true, autoScheduled: true })
  assert.equal(timeSavedForEmail(vide), timeSavedForEmail(absent))
})

// --- 4 · Chaque action ne compte que si elle a eu lieu ----------------------

test('un email encore en attente d’analyse ne rapporte rien', () => {
  assert.equal(timeSavedForEmail(email({ analysisStatus: 'pending', dailySummary: 'x', hasAIReply: true })), 0)
})

test('un brouillon de réponse compte, mais jamais sur une pub', () => {
  const vraiEmail = email({ hasAIReply: true })
  assert.equal(timeSavedForEmail(vraiEmail), GAIN_TRI + (TIME_MANUAL_REPLY_SECONDS - TIME_WITH_SVELTLY_REPLY_SECONDS))

  // hasAIReply est posé sur TOUS les emails analysés, y compris les pubs, où
  // le brouillon dit « aucune réponse nécessaire ». Personne n'aurait écrit
  // cette réponse à la main : aucun gain de rédaction.
  const pub = email({ hasAIReply: true, emailType: 'promo' })
  assert.equal(timeSavedForEmail(pub), GAIN_TRI_LOW)
})

test('un rendez-vous planifié rapporte plus qu’un rendez-vous seulement détecté', () => {
  const planifie = timeSavedForEmail(email({ calendarEventDetected: true, autoScheduled: true }))
  const detecte = timeSavedForEmail(email({ calendarEventDetected: true }))
  assert.equal(planifie, GAIN_TRI + (TIME_MANUAL_SCHEDULING_SECONDS - TIME_WITH_SVELTLY_SCHEDULING_SECONDS))
  assert.equal(detecte, GAIN_TRI + (TIME_MANUAL_EVENT_REVIEW_SECONDS - TIME_WITH_SVELTLY_EVENT_REVIEW_SECONDS))
  assert.ok(planifie > detecte)
})

test('une tâche créée rapporte plus qu’une action seulement repérée, et jamais les deux', () => {
  const creee = timeSavedForEmail(email({ autoTaskCreated: true, actionItemDetected: true }))
  const reperee = timeSavedForEmail(email({ actionItemDetected: true }))
  assert.equal(creee, GAIN_TRI + (TIME_MANUAL_TASK_NOTE_SECONDS - TIME_WITH_SVELTLY_TASK_SECONDS))
  assert.equal(reperee, GAIN_TRI + (TIME_MANUAL_ACTION_REVIEW_SECONDS - TIME_WITH_SVELTLY_ACTION_REVIEW_SECONDS))
  assert.ok(creee > reperee)
})

test('l’archivage automatique est le seul gain total', () => {
  assert.equal(TIME_WITH_SVELTLY_ARCHIVE_SECONDS, 0)
  assert.equal(timeSavedForEmail(email({ autoArchived: true })), GAIN_TRI + TIME_MANUAL_ARCHIVE_SECONDS)
})

test('les actions s’additionnent : un email qui a tout déclenché', () => {
  const total = timeSavedForEmail(email({
    dailySummary: 'Réunion lundi, devis à envoyer.',
    hasAIReply: true,
    calendarEventDetected: true,
    autoScheduled: true,
    schedulingDisplaced: [{ id: 'a' }, { id: 'b' }],
    autoTaskCreated: true,
    autoArchived: true,
  }))
  assert.equal(
    total,
    GAIN_TRI + GAIN_RESUME +
    (TIME_MANUAL_REPLY_SECONDS - TIME_WITH_SVELTLY_REPLY_SECONDS) +
    (TIME_MANUAL_SCHEDULING_SECONDS - TIME_WITH_SVELTLY_SCHEDULING_SECONDS) +
    (TIME_MANUAL_REARRANGEMENT_SECONDS - TIME_WITH_SVELTLY_REARRANGEMENT_SECONDS) +
    (TIME_MANUAL_TASK_NOTE_SECONDS - TIME_WITH_SVELTLY_TASK_SECONDS) +
    TIME_MANUAL_ARCHIVE_SECONDS
  )
})

// --- 5 · Les types « coup d’œil » --------------------------------------------

test('les cinq types balayés comptent au tarif coup d’œil', () => {
  for (const t of ['newsletter', 'promo', 'spam', 'notification', 'confirmation'] as const) {
    assert.equal(isLowEffort(email({ emailType: t })), true, t)
    assert.equal(timeSavedForEmail(email({ emailType: t, dailySummary: 'x' })), GAIN_TRI_LOW + GAIN_RESUME_LOW, t)
  }
})

test('un email sans type connu est traité comme un vrai email', () => {
  assert.equal(isLowEffort(email()), false)
  assert.equal(isLowEffort(email({ emailType: 'client_request' })), false)
})

// --- 6 · Agrégation et périmètre --------------------------------------------

test('le total est la somme des emails, et le cumul porte sur tous', () => {
  const liste = [email({ dailySummary: 'x' }), email({ id: 'e2' }), email({ id: 'e3', analysisStatus: 'pending' })]
  assert.equal(calculateTimeSavedForEmails(liste), GAIN_TRI + GAIN_RESUME + GAIN_TRI)
  assert.equal(calculateTimeSavedTotal(liste), calculateTimeSavedForEmails(liste))
})

test('une liste vide, ou entièrement en attente, vaut zéro', () => {
  assert.equal(calculateTimeSavedTotal([]), 0)
  assert.equal(calculateTimeSavedTotal([email({ analysisStatus: 'pending' })]), 0)
})

test('les emails du jour sont filtrés sur la date LOCALE', () => {
  const maintenant = new Date(2026, 10, 6, 14, 0, 0)
  const aujourdhui = new Date(2026, 10, 6, 1, 30, 0)
  const hier = new Date(2026, 10, 5, 23, 59, 0)
  const recus = getEmailsReceivedToday(
    [
      { receivedAt: aujourdhui.toISOString(), id: 'a' },
      { receivedAt: hier.toISOString(), id: 'b' },
    ],
    maintenant
  )
  assert.deepEqual(recus.map(e => e.id), ['a'])
})

// --- 7 · Affichage -----------------------------------------------------------

test('le formatage ne rend « 0 min » que pour un total réellement nul', () => {
  assert.equal(formatTimeSaved(0), '0 min')
  assert.equal(formatTimeSaved(15), '< 1 min')
  assert.equal(formatTimeSaved(45), '< 1 min')
  assert.equal(formatTimeSaved(60), '1 min')
  assert.equal(formatTimeSaved(2700), '45 min')
  assert.equal(formatTimeSaved(7200), '2 h')
  assert.equal(formatTimeSaved(4320), '1 h 12 min')
})

test('le formatage ne peut pas rendre NaN', () => {
  assert.equal(formatTimeSaved(NaN), '0 min')
  assert.equal(formatTimeSaved(Infinity), '0 min')
  assert.equal(formatTimeSaved(-10), '0 min')
})

// --- 8 · Le ratio annoncé sur la vitrine ------------------------------------

test('SAVINGS_RATIO reste inchangé par la séparation tri/résumé', () => {
  // La vitrine annonce 75 % — et ce chiffre ne doit pas bouger ici. Les constantes se
  // décomposent sans changer leurs sommes, donc le ratio ne doit pas bouger
  // d'un pouième — sinon une page publique se met à promettre autre chose.
  assert.equal(Math.round(SAVINGS_RATIO * 1000) / 1000, 0.753)
})

test('SAVINGS_RATIO reste une part prudente, strictement entre 0 et 1', () => {
  assert.ok(SAVINGS_RATIO > 0.5 && SAVINGS_RATIO < 0.8)
})
