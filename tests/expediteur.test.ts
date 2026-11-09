// lib/expediteur.ts sert à AFFICHER la liste d'emails : initiales, couleur,
// date, aperçu. Chaque fonction y corrige un défaut constaté à l'écran sur de
// vrais emails — ces cas-là sont figés ici, nommément.
import { test } from 'node:test'
import assert from 'node:assert/strict'
import {
  initialesExpediteur,
  domaineExpediteur,
  couleurExpediteur,
  dateCourte,
  nettoyerApercu,
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

// --- Date --------------------------------------------------------------------

test('aujourd’hui affiche l’heure, cette année le jour, avant l’année', () => {
  const maintenant = new Date(2026, 10, 9, 14, 0, 0)

  const ceMatin = new Date(2026, 10, 9, 11, 15, 0)
  assert.equal(dateCourte(ceMatin.toISOString(), maintenant), '11:15')

  const plusTot = new Date(2026, 10, 2, 9, 0, 0)
  assert.match(dateCourte(plusTot.toISOString(), maintenant), /^2 nov/)

  const anDernier = new Date(2025, 10, 9, 9, 0, 0)
  assert.equal(dateCourte(anDernier.toISOString(), maintenant), '09/11/2025')
})

test('la comparaison porte sur la date LOCALE, pas UTC', () => {
  // 23h50 heure locale le 9 : c'est « aujourd'hui », même si l'UTC est au 10.
  const maintenant = new Date(2026, 10, 9, 23, 55, 0)
  const tard = new Date(2026, 10, 9, 23, 50, 0)
  assert.equal(dateCourte(tard.toISOString(), maintenant), '23:50')
})

test('une date illisible ne casse pas la ligne', () => {
  assert.equal(dateCourte('pas-une-date'), '')
})

// --- Aperçu ------------------------------------------------------------------

test('le cas réel « 80 Bonjour Steven, de n » perd son parasite de tête', () => {
  assert.equal(nettoyerApercu('80 Bonjour Steven, de n'), 'Bonjour Steven, de n')
})

test('plusieurs parasites de tête tombent ensemble', () => {
  assert.equal(nettoyerApercu('  600 | • 80px — Bonjour'), 'Bonjour')
})

test('un nombre AU MILIEU du texte est conservé', () => {
  // On ne nettoie que la TÊTE : « 21,60 € » est une information.
  assert.equal(nettoyerApercu('Un reçu de 21 euros a été reçu'), 'Un reçu de 21 euros a été reçu')
})

test('les balises et entités disparaissent', () => {
  assert.equal(nettoyerApercu('<p>Bonjour&nbsp;Marine</p>'), 'Bonjour Marine')
  assert.equal(nettoyerApercu('Tom &amp; Jerry'), 'Tom & Jerry')
  assert.equal(nettoyerApercu('caf&#233;'), 'café')
})

test('les liens bruts sont retirés', () => {
  assert.equal(
    nettoyerApercu('Voir ici https://exemple.fr/tres/long/lien?utm=1 merci'),
    'Voir ici merci'
  )
  assert.equal(nettoyerApercu('Rendez-vous sur www.exemple.fr aujourd’hui'), 'Rendez-vous sur aujourd’hui')
})

test('les invisibles de mise en page des emailings sont retirés', () => {
  assert.equal(nettoyerApercu('Bon​jour﻿'), 'Bonjour')
})

test('les espaces multiples sont réduits et les bords coupés', () => {
  assert.equal(nettoyerApercu('  Bonjour    Marine  \n\n  '), 'Bonjour Marine')
})

test('un aperçu vide ou entièrement parasite rend une chaîne vide', () => {
  assert.equal(nettoyerApercu(''), '')
  assert.equal(nettoyerApercu('   |  •  — '), '')
  assert.equal(nettoyerApercu('<img alt="">'), '')
})
