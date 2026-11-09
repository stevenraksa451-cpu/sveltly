// lib/expediteur.ts sert a AFFICHER un expediteur : initiales, couleur,
// domaine. Chaque fonction y corrige un defaut constate a l'ecran sur de
// vrais emails - ces cas-la sont figes ici, nommement.
import { test } from 'node:test'
import assert from 'node:assert/strict'
import {
  initialesExpediteur,
  domaineExpediteur,
  couleurExpediteur,
} from '../lib/expediteur.ts'

// --- Initiales ---------------------------------------------------------------

test('la ponctuation ne produit jamais d’initiale', () => {
  // Les deux cas relevés à l'écran. L'ancienne version prenait le premier
  // caractère de chaque « mot », tiret compris.
  assert.equal(initialesExpediteur('Aides - CDJ'), 'AC')
  assert.equal(initialesExpediteur('Anthropic Ireland, Limited'), 'AI')
})

test('deux mots donnent deux initiales, un seul mot une seule', () => {
  assert.equal(initialesExpediteur('Ipsos iSay'), 'II')
  assert.equal(initialesExpediteur('ChatGPT'), 'C')
  assert.equal(initialesExpediteur('Marine Lecomte'), 'ML')
})

test('les particules ne comptent pas comme second mot', () => {
  assert.equal(initialesExpediteur('Agence de Com'), 'AC')
  assert.equal(initialesExpediteur('Ludwig van Beethoven'), 'LB')
})

test('un nom vide ou purement symbolique rend « ? »', () => {
  assert.equal(initialesExpediteur(''), '?')
  assert.equal(initialesExpediteur('--- ***'), '?')
})

test('les accents et majuscules sont normalisés', () => {
  assert.equal(initialesExpediteur('équipe Électricité'), 'ÉÉ')
  assert.equal(initialesExpediteur('zeno from resend'), 'ZF')
})

// --- Domaine -----------------------------------------------------------------

test('le domaine est extrait, en minuscules', () => {
  assert.equal(domaineExpediteur('Noreply@Exemple.FR'), 'exemple.fr')
  assert.equal(domaineExpediteur('a@b.co.uk'), 'b.co.uk')
})

test('les préfixes d’envoi sont retirés pour trouver un vrai favicon', () => {
  // news.decathlon.fr n'a pas d'icône ; decathlon.fr en a une.
  assert.equal(domaineExpediteur('x@news.decathlon.fr'), 'decathlon.fr')
  assert.equal(domaineExpediteur('x@mail.github.com'), 'github.com')
  assert.equal(domaineExpediteur('x@no-reply.exemple.fr'), 'exemple.fr')
})

test('un préfixe ne décapite jamais le domaine jusqu’à le rendre invalide', () => {
  // « mail.fr » ne doit PAS devenir « fr ».
  assert.equal(domaineExpediteur('x@mail.fr'), 'mail.fr')
})

test('une adresse sans domaine exploitable rend null', () => {
  assert.equal(domaineExpediteur('pas-une-adresse'), null)
  assert.equal(domaineExpediteur('x@localhost'), null)
  assert.equal(domaineExpediteur(''), null)
  // Caractères qui n'ont rien à faire dans un nom d'hôte : refusés, parce
  // que cette valeur part ensuite dans une URL.
  assert.equal(domaineExpediteur('x@exem ple.fr'), null)
  assert.equal(domaineExpediteur('x@exemple.fr/../etc'), null)
})

// --- Couleur -----------------------------------------------------------------

test('la couleur est STABLE pour un même nom', () => {
  const a = couleurExpediteur('Marine Lecomte')
  const b = couleurExpediteur('Marine Lecomte')
  assert.deepEqual(a, b)
})

test('deux noms courants ne tombent pas tous sur la même teinte', () => {
  const noms = ['ChatGPT', 'Anthropic', 'Ipsos', 'Decathlon', 'Marine', 'Thomas']
  const teintes = new Set(noms.map(n => couleurExpediteur(n).fond))
  assert.ok(teintes.size >= 3, 'trop peu de teintes distinctes : ' + teintes.size)
})

test('la couleur est toujours une paire fond/encre exploitable', () => {
  const { fond, encre } = couleurExpediteur('X')
  assert.match(fond, /^hsl\(\d+ \d+% \d+%\)$/)
  assert.match(encre, /^hsl\(\d+ \d+% \d+%\)$/)
})
