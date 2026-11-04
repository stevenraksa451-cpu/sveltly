// « Quel jour on est » — lib/dates.ts
//
// Ces tests figent le bug qui a motivé le fichier : toISOString() rend la
// date en UTC, et croise la date locale tous les jours, dans les deux sens.
import { test, describe } from 'node:test'
import assert from 'node:assert/strict'
import { isoLocal, isoLocalDansNJours, isoDansFuseau } from '../lib/dates.ts'

describe('isoDansFuseau — le cœur du correctif', () => {
  // 15 juin 2026, 00h30 à Paris = 14 juin 22h30 UTC.
  const nuitParisienne = new Date('2026-06-15T00:30:00+02:00')

  test('juste après minuit à Paris, on est bien le 15 — pas le 14', () => {
    assert.equal(isoDansFuseau('Europe/Paris', nuitParisienne), '2026-06-15')
    // Ce que faisait l'ancien code, conservé en regard :
    assert.equal(nuitParisienne.toISOString().slice(0, 10), '2026-06-14')
  })

  // 15 juin 2026, 20h00 à Montréal = 16 juin 00h00 UTC.
  const soireeMontrealaise = new Date('2026-06-15T20:00:00-04:00')

  test('en soirée à Montréal, on est le 15 — pas le 16', () => {
    assert.equal(isoDansFuseau('America/Montreal', soireeMontrealaise), '2026-06-15')
    assert.equal(soireeMontrealaise.toISOString().slice(0, 10), '2026-06-16')
  })

  test('le même instant donne deux dates selon le fuseau', () => {
    const instant = new Date('2026-06-16T01:00:00Z')
    assert.equal(isoDansFuseau('Europe/Paris', instant), '2026-06-16')
    assert.equal(isoDansFuseau('America/Montreal', instant), '2026-06-15')
  })

  test('UTC reste UTC quand on le demande explicitement', () => {
    assert.equal(isoDansFuseau('UTC', nuitParisienne), '2026-06-14')
  })

  test('le format est toujours YYYY-MM-DD, zéros compris', () => {
    const janvier = new Date('2026-01-05T12:00:00Z')
    assert.equal(isoDansFuseau('Europe/Paris', janvier), '2026-01-05')
  })

  // Un fuseau absent ou invalide ne doit jamais faire planter une page.
  test('fuseau absent : repli sur la date locale, sans lever', () => {
    assert.match(isoDansFuseau(null), /^\d{4}-\d{2}-\d{2}$/)
    assert.match(isoDansFuseau(undefined), /^\d{4}-\d{2}-\d{2}$/)
  })

  test('fuseau invalide : repli sur la date locale, sans lever', () => {
    assert.match(isoDansFuseau('Pas/UnFuseau'), /^\d{4}-\d{2}-\d{2}$/)
  })
})

describe('isoLocal', () => {
  test('rend la date LOCALE, pas la date UTC', () => {
    // Construit en heure locale : par définition, isoLocal doit la rendre
    // telle quelle, quel que soit le fuseau de la machine de test.
    const d = new Date(2026, 5, 15, 0, 30) // 15 juin, 00h30 locales
    assert.equal(isoLocal(d), '2026-06-15')
  })

  test('zéros de tête sur le mois et le jour', () => {
    assert.equal(isoLocal(new Date(2026, 0, 3)), '2026-01-03')
  })

  test('31 décembre reste le 31 décembre', () => {
    assert.equal(isoLocal(new Date(2026, 11, 31, 23, 59)), '2026-12-31')
  })
})

describe('isoLocalDansNJours', () => {
  const base = new Date(2026, 5, 15, 23, 30)

  test('demain', () => assert.equal(isoLocalDansNJours(1, base), '2026-06-16'))
  test('hier', () => assert.equal(isoLocalDansNJours(-1, base), '2026-06-14'))
  test('aujourd’hui', () => assert.equal(isoLocalDansNJours(0, base), '2026-06-15'))

  test('franchit la fin de mois', () => {
    assert.equal(isoLocalDansNJours(1, new Date(2026, 5, 30, 12)), '2026-07-01')
  })

  test('franchit la fin d’année', () => {
    assert.equal(isoLocalDansNJours(1, new Date(2026, 11, 31, 12)), '2027-01-01')
  })

  // Le piège de l'arithmétique en millisecondes : Date.now() + 86400000 saute
  // 23 ou 25 heures lors d'un changement d'heure, et peut donc rendre le même
  // jour, ou sauter le lendemain. Passer par le constructeur l'évite.
  test('reste juste au passage à l’heure d’hiver', () => {
    // Nuit du 25 octobre 2026 en Europe : la journée dure 25 heures.
    assert.equal(isoLocalDansNJours(1, new Date(2026, 9, 24, 12)), '2026-10-25')
    assert.equal(isoLocalDansNJours(1, new Date(2026, 9, 25, 12)), '2026-10-26')
  })
})
