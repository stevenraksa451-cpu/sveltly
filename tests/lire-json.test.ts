// Lecture défensive des réponses API — lib/lire-json.ts
//
// Le cas qui compte : une page HTML renvoyée par l'hébergeur (502, 504,
// portail Wi-Fi). `await res.json()` y lève un SyntaxError non rattrapé, et
// l'interface reste figée sur « Envoi… » sans le moindre message.
import { test, describe } from 'node:test'
import assert from 'node:assert/strict'
import { lireJson } from '../lib/lire-json.ts'

describe('lireJson — ne lève jamais', () => {
  test('du JSON valide passe tel quel', async () => {
    const res = Response.json({ ok: true, valeur: 42 })
    assert.deepEqual(await lireJson(res), { ok: true, valeur: 42 })
  })

  test('une erreur applicative garde SON message', async () => {
    const res = Response.json({ error: 'Non autorisé' }, { status: 401 })
    assert.equal((await lireJson(res)).error, 'Non autorisé')
  })

  // Le scénario central : une passerelle rend du HTML.
  test('une page HTML d’erreur devient un message lisible', async () => {
    const res = new Response('<html><body><h1>504 Gateway Timeout</h1></body></html>', {
      status: 504,
      headers: { 'content-type': 'text/html' },
    })
    const json = await lireJson(res)
    assert.match(json.error ?? '', /504/)
    assert.doesNotMatch(json.error ?? '', /<html>/)
  })

  test('un corps vide rend un objet vide, pas une erreur', async () => {
    // Une route qui ne renvoie rien : ce n'est pas une anomalie.
    assert.deepEqual(await lireJson(new Response('', { status: 200 })), {})
  })

  test('un vrai 204 sans corps rend un objet vide', async () => {
    // ⚠️ `new Response('', { status: 204 })` LÈVE : la spécification interdit
    // un corps sur un 204, et le constructeur refuse même la chaîne vide.
    // Première écriture de ce test, et c'est le test qui avait tort.
    assert.deepEqual(await lireJson(new Response(null, { status: 204 })), {})
  })

  test('un corps tronqué en plein milieu est rattrapé', async () => {
    const res = new Response('{"events":[{"id":"a"', { status: 200 })
    assert.match((await lireJson(res)).error ?? '', /inattendue/)
  })

  // JSON.parse('null') et JSON.parse('42') RÉUSSISSENT : sans ce garde-fou,
  // l'appelant ferait `json.error` sur un nombre ou sur null.
  test('un JSON valide mais non-objet est traité comme une anomalie', async () => {
    for (const corps of ['null', '42', '"texte"', 'true']) {
      const json = await lireJson(new Response(corps, { status: 200 }))
      assert.equal(typeof json, 'object')
      assert.ok(json !== null)
      assert.match(json.error ?? '', /inattendue/)
    }
  })

  test('un tableau reste un tableau — c’est bien un objet', async () => {
    const json = await lireJson(new Response('[1,2,3]', { status: 200 }))
    assert.deepEqual(json, [1, 2, 3] as never)
  })

  test('le code HTTP apparaît dans le message, pour que l’utilisateur puisse le rapporter', async () => {
    const json = await lireJson(new Response('pas du json', { status: 502 }))
    assert.match(json.error ?? '', /502/)
  })

  // ⚠️ Le corps d'une réponse ne se lit qu'une fois. Si l'implémentation
  // appelait .json() puis .text() dans un catch, elle lèverait
  // « body stream already read » — une seconde erreur par-dessus la première.
  test('le corps n’est lu qu’une fois, même sur un corps illisible', async () => {
    const res = new Response('<html>', { status: 500 })
    await lireJson(res)
    assert.equal(res.bodyUsed, true)
  })
})
