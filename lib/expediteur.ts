// lib/expediteur.ts
// Tout ce qui sert à AFFICHER un expéditeur et un email dans la liste :
// initiales, couleur, domaine, date courte, nettoyage de l'aperçu.
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

/**
 * Date de liste, au format attendu d'un client mail :
 *   aujourd'hui        -> « 11:15 »
 *   cette année        -> « 9 nov. »
 *   année précédente   -> « 09/11/2025 »
 *
 * L'ancienne version rendait toujours « 9 nov. », y compris pour un email
 * reçu il y a dix minutes et pour un email de l'an dernier — deux
 * informations très différentes, affichées pareil.
 *
 * Comparaison sur la date LOCALE (getFullYear/getMonth/getDate), jamais en
 * UTC : voir lib/dates.ts, même règle et même raison.
 */
export function dateCourte(iso: string, maintenant: Date = new Date()): string {
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return ''

  const memeJour =
    d.getFullYear() === maintenant.getFullYear() &&
    d.getMonth() === maintenant.getMonth() &&
    d.getDate() === maintenant.getDate()
  if (memeJour) {
    return d.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })
  }

  if (d.getFullYear() === maintenant.getFullYear()) {
    return d.toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' })
  }

  return d.toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit', year: 'numeric' })
}

/**
 * Nettoie l'aperçu avant troncature.
 *
 * Gmail rend un `snippet` construit sur le corps BRUT : il y traîne des
 * restes de balises, des textes alternatifs d'images, des compteurs de
 * tracking et des entités HTML. Cas réel relevé à l'écran :
 *
 *   « 80 Bonjour Steven, de n »
 *
 * Le « 80 » est la largeur d'une image, pas un mot. Afficher ça donne
 * l'impression que le produit lit mal les emails — alors qu'il recopie
 * fidèlement ce que Gmail lui donne.
 *
 * Ordre volontaire : on enlève les balises AVANT de décoder les entités,
 * sinon un `&lt;script&gt;` décodé redeviendrait une balise à retirer. Le
 * résultat ne sert qu'à du texte (jamais à du HTML), mais l'ordre inverse
 * serait un piège pour la prochaine personne qui y touche.
 */
export function nettoyerApercu(brut: string): string {
  if (!brut) return ''
  let t = brut

  t = t.replace(/<[^>]*>/g, ' ')

  // Entités les plus fréquentes dans un email, puis les numériques.
  const ENTITES: Record<string, string> = {
    '&nbsp;': ' ', '&amp;': '&', '&lt;': '<', '&gt;': '>', '&quot;': '"',
    '&#39;': '’', '&apos;': '’', '&zwnj;': '', '&shy;': '', '&ensp;': ' ', '&emsp;': ' ',
  }
  t = t.replace(/&[a-z]+;|&#\d+;/gi, e => {
    const connu = ENTITES[e.toLowerCase()]
    if (connu !== undefined) return connu
    const num = /^&#(\d+);$/.exec(e)
    if (num) {
      const code = Number(num[1])
      // Les caractères de contrôle et les invisibles ne doivent pas revenir.
      return code >= 32 && code !== 127 ? String.fromCodePoint(code) : ' '
    }
    return ' '
  })

  // Liens bruts : ils occupent la moitié d'un aperçu sans rien en dire.
  t = t.replace(/\bhttps?:\/\/\S+/gi, ' ')
  t = t.replace(/\bwww\.\S+/gi, ' ')

  // Invisibles de mise en page des emailings (jointeurs, espaces nulles).
  t = t.replace(/[​-‍﻿­]/g, '')

  // Parasites de TÊTE uniquement : dimensions d'images, puces, séparateurs.
  // Répété tant que ça mord — « 80 600 | Bonjour » doit tomber entièrement.
  let avant
  do {
    avant = t
    t = t.replace(/^[\s|•·–—*_=>+#:,.\-]+/, '')
    t = t.replace(/^\d{1,4}(?:px)?(?=\s|$)/i, '')
  } while (t !== avant)

  return t.replace(/\s+/g, ' ').trim()
}
