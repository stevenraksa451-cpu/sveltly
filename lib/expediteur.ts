// lib/expediteur.ts
// Tout ce qui sert a AFFICHER un expediteur : initiales, couleur, domaine.
//
// Le fichier a aussi porte un formatage de date et un nettoyage d'apercu,
// retires avec la refonte visuelle de la liste : ils ne servaient plus a
// personne, et une fonction exportee que rien n'appelle finit par etre
// reprise sans etre relue.
//
// Fonctions pures, sans React ni DOM, donc testables par `node --test` —
// c'est la raison du fichier séparé. Chacune corrige un défaut qu'on voyait
// à l'écran sur de vrais emails, et les cas constatés sont dans les tests.

/** Caractères qui ne portent jamais d'initiale : ponctuation, puces, symboles.
 *
 * ⚠️ PAS de `\p{L}` ni de drapeau `u` : tsconfig vise `es5`, où les classes
 * Unicode ne sont pas disponibles. La plage explicite couvre le latin étendu —
 * la MÊME que scripts/apostrophes.js, et pour la même raison : s'arrêter à
 * `ÿ` laisserait tomber les ligatures `œ` et `æ` (voir CLAUDE.md). */
const NON_LETTRE = /[^A-Za-z0-9À-ÖØ-öø-ÿĀ-ſ]/g

/**
 * Initiales d'un expéditeur, 1 ou 2 lettres.
 *
 * L'ancienne version faisait `sender.split(' ').map(w => w[0]).slice(0, 2)` —
 * elle prenait le premier caractère de chaque mot, quel qu'il soit :
 *
 *   « Aides - CDJ »           -> « A- »   (le tiret comptait comme un mot)
 *   « Anthropic Ireland, Limited » -> « AI » mais sur la virgule du 2e mot
 *   « ChatGPT »               -> « C »    (correct par chance)
 *
 * Ici, on ne garde que les mots qui COMMENCENT par une lettre ou un chiffre.
 * Un mot d'une seule lettre isolé (« - », « & », « de ») ne compte pas.
 *
 * ⚠️ Deux initiales seulement si le second mot est un vrai nom : les
 * particules (de, du, la, van, von…) n'en sont pas. « Ipsos iSay » donne
 * « II » parce que « iSay » est un nom ; « Agence de Com » donne « AC ».
 */
const PARTICULES = new Set(['de', 'du', 'des', 'la', 'le', 'les', 'van', 'von', 'da', 'di', 'el', 'al', 'and', 'et'])

export function initialesExpediteur(nom: string): string {
  const mots = (nom || '')
    .split(/[\s,./\\|·–—-]+/)
    .map(m => m.replace(NON_LETTRE, ''))
    .filter(m => m.length > 0)

  if (mots.length === 0) return '?'

  const premier = mots[0]
  const suivant = mots.slice(1).find(m => !PARTICULES.has(m.toLowerCase()))

  if (!suivant) return premier.charAt(0).toUpperCase()
  return (premier.charAt(0) + suivant.charAt(0)).toUpperCase()
}

/**
 * Domaine d'une adresse, sans `www.` ni sous-domaine d'envoi courant.
 * Sert à demander le favicon du site plutôt qu'une initiale.
 *
 * `mail.`, `email.`, `news.`, `e.` sont les préfixes que les routeurs
 * d'emailing posent devant le vrai domaine : `news.decathlon.fr` doit
 * chercher le favicon de `decathlon.fr`, qui existe, pas celui de `news.`,
 * qui n'existe pas.
 */
const PREFIXES_ENVOI = /^(?:www|mail|email|e|news|newsletter|info|no-?reply|notifications?|send|smtp|mg|em|ml)\./i

export function domaineExpediteur(adresse: string): string | null {
  const at = (adresse || '').lastIndexOf('@')
  if (at < 0) return null
  let d = adresse.slice(at + 1).trim().toLowerCase()
  if (!d || !d.includes('.')) return null
  // On ne retire qu'UN préfixe : `news.mail.exemple.fr` reste `mail.exemple.fr`
  // plutôt que de risquer de décapiter un vrai domaine à rallonge.
  const court = d.replace(PREFIXES_ENVOI, '')
  if (court.includes('.')) d = court
  return /^[a-z0-9.-]+$/.test(d) ? d : null
}

/**
 * Teinte stable dérivée du nom, dans la famille de la palette.
 *
 * Le même expéditeur garde toujours la même couleur, d'une session à l'autre
 * et d'un appareil à l'autre — c'est ce qui rend la pastille reconnaissable
 * du coin de l'œil. Un hash, pas un aléatoire.
 *
 * Les teintes sont celles de la palette du produit (indigo, bleu du logo,
 * menthe, ardoise) plus deux voisines, toutes en faible saturation et en
 * clarté haute : ce sont des pastilles de fond, elles ne doivent jamais
 * rivaliser avec le bouton principal. L'encre est systématiquement la version
 * sombre de la même teinte, ce qui garantit le contraste sans le mesurer
 * couleur par couleur.
 */
const TEINTES = [238, 212, 162, 258, 199, 174, 220, 280]

export function couleurExpediteur(nom: string): { fond: string; encre: string } {
  let h = 0
  const s = nom || '?'
  for (let i = 0; i < s.length; i++) {
    h = (h * 31 + s.charCodeAt(i)) >>> 0
  }
  const teinte = TEINTES[h % TEINTES.length]
  return {
    fond: `hsl(${teinte} 62% 94%)`,
    encre: `hsl(${teinte} 52% 36%)`,
  }
}
