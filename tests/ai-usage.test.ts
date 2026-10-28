// Quota mensuel de réponses IA — lib/ai-usage.ts
//
// Ce fichier est le jumeau applicatif du déclencheur SQL de la migration
// 20261022000000 : la base autorise une BAISSE du compteur uniquement quand le
// mois de `ai_replies_reset_at` change. Si la règle de lecture ci-dessous
// changeait sans que le déclencheur suive, le quota deviendrait contournable
// sans que rien ne le signale.
import { test, describe } from 'node:test'
import assert from 'node:assert/strict'
import { resolveMonthlyUsage } from '../lib/ai-usage.ts'

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
