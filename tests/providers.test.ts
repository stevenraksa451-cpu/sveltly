// Source unique des fournisseurs — lib/providers.ts
//
// Ces tests gardent l'invariant pour lequel ce fichier a été écrit : le site
// s'est contredit pendant plusieurs versions, annonçant « Gmail & Outlook »
// dans le hero pendant que la FAQ disait qu'Outlook n'était pas supporté.
// Une phrase décrivant le fonctionnement RÉEL ne doit jamais nommer un
// fournisseur encore `planned`.
import { test, describe } from 'node:test'
import assert from 'node:assert/strict'
import {
  PROVIDERS,
  LIVE_PROVIDERS,
  PLANNED_PROVIDERS,
  PROVIDERS_LIVE_LABEL,
  PROVIDERS_PLANNED_LABEL,
  PROVIDERS_ANSWER,
} from '../lib/providers.ts'

describe('lib/providers', () => {
  test('les identifiants sont uniques', () => {
    const ids = PROVIDERS.map(p => p.id)
    assert.equal(new Set(ids).size, ids.length)
  })

  test('chaque fournisseur est soit live, soit planned', () => {
    for (const p of PROVIDERS) {
      assert.ok(p.status === 'live' || p.status === 'planned', `statut inattendu : ${p.status}`)
    }
  })

  test('les deux listes partitionnent exactement PROVIDERS', () => {
    assert.equal(LIVE_PROVIDERS.length + PLANNED_PROVIDERS.length, PROVIDERS.length)
    assert.ok(LIVE_PROVIDERS.every(p => p.status === 'live'))
    assert.ok(PLANNED_PROVIDERS.every(p => p.status === 'planned'))
  })

  // L'invariant central : c'est CETTE étiquette que lisent les CGU, la
  // politique de confidentialité et les étapes de mise en route.
  test('PROVIDERS_LIVE_LABEL ne nomme jamais un fournisseur non branché', () => {
    for (const p of PLANNED_PROVIDERS) {
      assert.ok(
        !PROVIDERS_LIVE_LABEL.includes(p.name),
        `« ${p.name} » est annoncé comme connectable alors qu'il est encore planned`
      )
    }
  })

  test('PROVIDERS_PLANNED_LABEL ne nomme jamais un fournisseur déjà branché', () => {
    for (const p of LIVE_PROVIDERS) {
      assert.ok(!PROVIDERS_PLANNED_LABEL.includes(p.name))
    }
  })

  test('la réponse « quelles boîtes ? » n’annonce aucune date', () => {
    // ⚠️ Les limites de mot sont indispensables : sans elles, « mai » se
    // trouve dans « Gmail » et le test échouait sur une chaîne parfaitement
    // correcte. Premier faux positif de cette suite, attrapé au premier run.
    const mois = /\b(janvier|février|mars|avril|mai|juin|juillet|août|septembre|octobre|novembre|décembre|20\d\d)\b/i
    assert.ok(!mois.test(PROVIDERS_ANSWER), 'une date annoncée est une promesse — voir CLAUDE.md')
  })

  test('la réponse accorde le verbe au nombre de fournisseurs prévus', () => {
    if (PLANNED_PROVIDERS.length === 1) assert.ok(PROVIDERS_ANSWER.includes('est prévu'))
    if (PLANNED_PROVIDERS.length > 1) assert.ok(PROVIDERS_ANSWER.includes('sont prévus'))
    if (PLANNED_PROVIDERS.length === 0) assert.ok(!PROVIDERS_ANSWER.includes('prévu'))
  })

  test('au moins un fournisseur est connectable — sinon le produit ne marche pas', () => {
    assert.ok(LIVE_PROVIDERS.length >= 1)
  })
})
