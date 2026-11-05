// Filet de sécurité des routes API — lib/api-handler.ts
//
// Le défaut d'origine a été reproduit sans modifier une ligne de code :
//
//   curl -X POST /api/save-token -H 'Content-Type: application/json' -d 'pas-du-json'
//   → statut 500, aucun Content-Type, corps VIDE
//   → côté client, res.json() lève « Unexpected end of JSON input »
//
// Ces tests figent les trois garanties : toujours un corps JSON lisible,
// jamais de détail interne, et la porte de sortie des callbacks OAuth.
import { test, describe } from 'node:test'
import assert from 'node:assert/strict'
import { routeJson, ERREUR_GENERIQUE } from '../lib/api-handler.ts'

// Un objet minimal qui suffit au contrat utilisé par routeJson : `method`
// et `url`. Évite d'instancier un vrai NextRequest, qui tirerait tout le
// runtime de Next dans la suite de tests.
function fausseRequete(url = 'https://exemple.test/api/essai', method = 'POST') {
  return { url, method } as never
}

describe('routeJson — un throw ne produit jamais une réponse vide', () => {
  test('une erreur inattendue devient un JSON 500 lisible', async () => {
    const route = routeJson(async () => { throw new Error('boum interne') })
    const res = await route(fausseRequete())

    assert.equal(res.status, 500)
    assert.match(res.headers.get('content-type') ?? '', /application\/json/)

    const corps = await res.json()
    assert.equal(corps.error, ERREUR_GENERIQUE)
  })

  // C'est le point qui comptait : le client fait `await res.json()`.
  test('le corps est toujours parsable — c’est tout le sujet', async () => {
    const route = routeJson(async () => { throw new Error('boum') })
    const res = await route(fausseRequete())
    const texte = await res.text()
    assert.doesNotThrow(() => JSON.parse(texte))
  })

  // err.message peut contenir un fragment de requête SQL, un chemin serveur
  // ou un bout de jeton. Rien de tout ça ne doit sortir.
  test('aucun détail interne ne fuit vers le client', async () => {
    const secret = 'postgresql://postgres:MOTDEPASSE@db.interne/sveltly'
    const route = routeJson(async () => { throw new Error(secret) })
    const corps = await (await route(fausseRequete())).text()

    assert.ok(!corps.includes('MOTDEPASSE'))
    assert.ok(!corps.includes('postgresql'))
  })

  test('un corps JSON malformé rend 400, pas 500 — c’est le client qui a tort', async () => {
    const route = routeJson(async () => { throw new SyntaxError('Unexpected token p in JSON') })
    const res = await route(fausseRequete())

    assert.equal(res.status, 400)
    assert.equal((await res.json()).error, 'Requête illisible.')
  })

  test('une valeur non-Error lancée ne fait pas tomber le filet', async () => {
    const route = routeJson(async () => { throw 'une chaîne nue' })
    const res = await route(fausseRequete())
    assert.equal(res.status, 500)
    assert.doesNotThrow(() => JSON.parse(JSON.stringify(res.status)))
  })
})

describe('routeJson — le chemin normal reste intact', () => {
  test('une réponse réussie traverse sans être touchée', async () => {
    const attendue = Response.json({ ok: true, valeur: 42 })
    const route = routeJson(async () => attendue)
    const res = await route(fausseRequete())

    assert.equal(res, attendue)
    assert.deepEqual(await res.json(), { ok: true, valeur: 42 })
  })

  test('une erreur métier délibérée garde SON statut et SON message', async () => {
    // Une route qui répond 401 ne doit pas se faire réécrire en 500.
    const route = routeJson(async () => Response.json({ error: 'Non autorisé' }, { status: 401 }))
    const res = await route(fausseRequete())

    assert.equal(res.status, 401)
    assert.equal((await res.json()).error, 'Non autorisé')
  })

  test('les arguments supplémentaires (params des routes dynamiques) passent', async () => {
    const route = routeJson(async (_req, ctx: { params: Promise<{ id: string }> }) => {
      const { id } = await ctx.params
      return Response.json({ id })
    })
    const res = await route(fausseRequete(), { params: Promise.resolve({ id: 'abc' }) })
    assert.deepEqual(await res.json(), { id: 'abc' })
  })
})

describe('routeJson — la porte de sortie des callbacks OAuth', () => {
  // Un callback est atteint par une navigation : du JSON s'afficherait en
  // texte brut dans la fenêtre de l'utilisateur.
  test('surErreur l’emporte sur la réponse JSON', async () => {
    const route = routeJson(
      async () => { throw new Error('échange OAuth raté') },
      { surErreur: () => new Response(null, { status: 307, headers: { Location: '/settings?erreur=1' } }) }
    )
    const res = await route(fausseRequete('https://exemple.test/api/x/callback', 'GET'))

    assert.equal(res.status, 307)
    assert.equal(res.headers.get('location'), '/settings?erreur=1')
  })
})
