// Quota mensuel de réponses IA — lib/ai-usage.ts
//
// Ce fichier est le jumeau applicatif du déclencheur SQL de la migration
// 20261022000000 : la base autorise une BAISSE du compteur uniquement quand le
// mois de `ai_replies_reset_at` change. Si la règle de lecture ci-dessous
// changeait sans que le déclencheur suive, le quota deviendrait contournable
// sans que rien ne le signale.
import { test, describe } from 'node:test'
import assert from 'node:assert/strict'
import { resolveMonthlyUsage, plafondQuotidien } from '../lib/ai-usage.ts'

/** Un instant au milieu d'un mois décalé de N mois, en UTC. */
function moisDecale(decalage: number): string {
  const n = new Date()
  return new Date(Date.UTC(n.getUTCFullYear(), n.getUTCMonth() + decalage, 15, 12)).toISOString()
}

describe('resolveMonthlyUsage', () => {
  test('même mois : le compteur est conservé', () => {
    const r = resolveMonthlyUsage({ ai_replies_count: 37, ai_replies_reset_at: moisDecale(0) })
    assert.equal(r.isNewMonth, false)
    assert.equal(r.currentCount, 37)
  })

  test('mois précédent : le compteur repart de zéro', () => {
    const r = resolveMonthlyUsage({ ai_replies_count: 50, ai_replies_reset_at: moisDecale(-1) })
    assert.equal(r.isNewMonth, true)
    assert.equal(r.currentCount, 0)
  })

  // ⚠️ Le piège. La comparaison porte sur une DIFFÉRENCE de mois, pas sur un
  // ordre : une date placée dans le futur vide le quota exactement comme une
  // date passée. Fermer seulement le passé côté base laisserait la porte
  // grande ouverte — c'est pour ça que le déclencheur interdit les deux sens.
  test('mois FUTUR : vide aussi le compteur — les deux sens comptent', () => {
    const r = resolveMonthlyUsage({ ai_replies_count: 50, ai_replies_reset_at: moisDecale(+1) })
    assert.equal(r.isNewMonth, true)
    assert.equal(r.currentCount, 0)
  })

  test('un an plus tôt, même mois : c’est bien un nouveau mois', () => {
    const r = resolveMonthlyUsage({ ai_replies_count: 50, ai_replies_reset_at: moisDecale(-12) })
    assert.equal(r.isNewMonth, true)
    assert.equal(r.currentCount, 0)
  })

  test('profil absent : zéro, et pas de plantage', () => {
    const r = resolveMonthlyUsage(null)
    assert.equal(r.currentCount, 0)
    assert.equal(r.isNewMonth, false)
  })

  test('date de remise à zéro absente : traitée comme aujourd’hui', () => {
    const r = resolveMonthlyUsage({ ai_replies_count: 12, ai_replies_reset_at: null })
    assert.equal(r.isNewMonth, false)
    assert.equal(r.currentCount, 12)
  })

  test('compteur absent : zéro plutôt que NaN ou undefined', () => {
    const r = resolveMonthlyUsage({ ai_replies_count: null, ai_replies_reset_at: moisDecale(0) })
    assert.equal(r.currentCount, 0)
  })
})

describe('plafondQuotidien — 50 sur le mois, sans tout brûler le 1er jour', () => {
  // Juin 2026 : 30 jours. Les dates sont lues en UTC.
  const juin = (jour: number) => new Date(Date.UTC(2026, 5, jour, 12))

  test('le 1er du mois, le plafond est bas mais JAMAIS nul', () => {
    // Le point de tout l’exercice : l’IA ne doit jamais être muette.
    assert.equal(plafondQuotidien(50, juin(1)), 2)
  })

  test('il monte avec les jours', () => {
    assert.equal(plafondQuotidien(50, juin(5)), 9)
    assert.equal(plafondQuotidien(50, juin(15)), 25)
    assert.equal(plafondQuotidien(50, juin(30)), 50)
  })

  test('il ne dépasse jamais la limite mensuelle', () => {
    for (let j = 1; j <= 31; j++) {
      assert.ok(plafondQuotidien(50, new Date(Date.UTC(2026, 0, j, 12))) <= 50)
    }
  })

  test('il atteint EXACTEMENT la limite le dernier jour, quel que soit le mois', () => {
    // Février 2026 (28 j), avril (30 j), janvier (31 j).
    assert.equal(plafondQuotidien(50, new Date(Date.UTC(2026, 1, 28, 12))), 50)
    assert.equal(plafondQuotidien(50, new Date(Date.UTC(2026, 3, 30, 12))), 50)
    assert.equal(plafondQuotidien(50, new Date(Date.UTC(2026, 0, 31, 12))), 50)
  })

  test('février bissextile : 29 jours, et le 29 donne bien 50', () => {
    assert.equal(plafondQuotidien(50, new Date(Date.UTC(2028, 1, 29, 12))), 50)
  })

  test('il ne recule jamais d’un jour au suivant', () => {
    let precedent = 0
    for (let j = 1; j <= 31; j++) {
      const v = plafondQuotidien(50, new Date(Date.UTC(2026, 0, j, 12)))
      assert.ok(v >= precedent, `jour ${j} : ${v} < ${precedent}`)
      precedent = v
    }
  })

  // Le forfait Pro passe null comme limite : l’appelant ne doit jamais
  // arriver ici, mais une limite absurde ne doit pas rendre NaN.
  test('une limite nulle ou négative rend zéro, pas NaN', () => {
    assert.equal(plafondQuotidien(0, juin(15)), 0)
    assert.equal(plafondQuotidien(-5, juin(15)), 0)
  })
})
