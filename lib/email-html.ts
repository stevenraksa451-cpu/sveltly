// lib/email-html.ts
// Réécriture des images d'un email déjà assaini.
//
// POURQUOI LES IMAGES NE S'AFFICHAIENT PAS
// Le corps de l'email est rendu dans une iframe `srcDoc`. Une iframe srcDoc
// hérite de la politique de sécurité (CSP) de la page qui la porte, et celle
// du projet dit :
//
//     img-src 'self' data: https://lh3.googleusercontent.com https://*.supabase.co
//
// Autrement dit : AUCUNE image d'un domaine tiers. Toutes celles d'un email
// — c'est-à-dire presque toutes — étaient bloquées, et le navigateur
// affichait le texte alternatif à leur place. Ce n'était pas un défaut de
// l'email ni du nettoyage : c'était notre propre CSP, qui faisait exactement
// ce qu'on lui demandait.
//
// La réponse n'est PAS d'ouvrir la CSP à `img-src *` : ça rendrait au passage
// tous les pixels de suivi opérants. Les images passent par `/api/img`, qui
// est en `'self'` — la CSP est satisfaite sans être affaiblie, et le relais
// masque l'adresse IP du lecteur (voir ce fichier-là).
//
// DEUX ÉTATS, ET LE DÉFAUT EST « BLOQUÉ »
// Charger une image distante annonce à l'expéditeur que le message a été
// ouvert, quand, et par qui. On ne le fait donc pas sans un geste explicite.
//
// ⚠️ Ces fonctions s'appliquent APRÈS DOMPurify, jamais avant. Elles ne sont
// pas un nettoyage de sécurité : elles supposent l'entrée déjà assainie, et
// c'est ce qui autorise une réécriture par expression régulière sur les
// attributs plutôt qu'un vrai analyseur. Inverser l'ordre reviendrait à
// faire confiance à du HTML d'expéditeur inconnu.

/** Un `src` d'image qui sort vers le réseau. `data:` et `cid:` n'en sont pas. */
const DISTANTE = /^https?:\/\//i

// 1×1 transparent : garde la place de l'image sans rien demander au réseau.
const PIXEL_VIDE = 'data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7'

export function urlRelais(brut: string): string {
  return `/api/img?u=${encodeURIComponent(brut)}`
}

/**
 * Combien d'images distantes ce corps contient-il ?
 * Sert à n'afficher la barre « Images masquées » que s'il y a quelque chose
 * à masquer — une barre posée sur un email sans image serait du bruit.
 */
// `matchAll` et l'itération de son résultat exigent une cible ES2015+, alors
// que tsconfig vise `es5`. On compte donc avec `replace`, qui ne dépend
// d'aucune cible — relever la cible du projet pour trois boucles serait un
// effet de bord sans rapport avec cette fonctionnalité.
function compterSi(html: string, motif: RegExp): number {
  let n = 0
  html.replace(motif, (_tout: string, capture: string) => {
    if (DISTANTE.test(capture)) n++
    return ''
  })
  return n
}

export function compterImagesDistantes(html: string): number {
  if (!html) return 0
  return (
    compterSi(html, /<img\b[^>]*?\ssrc\s*=\s*["']([^"']+)["']/gi) +
    compterSi(html, /\bbackground\s*=\s*["']([^"']+)["']/gi) +
    compterSi(html, /url\(\s*["']?([^"')]+)["']?\s*\)/gi)
  )
}

/**
 * `bloquer` : neutralise toute image distante (pixel transparent, srcset
 *             retiré, fonds CSS effacés). Rien ne part sur le réseau.
 * `charger` : réécrit chaque image distante vers `/api/img`.
 *
 * Dans les deux cas, `data:` et `cid:` sont laissés tels quels : la première
 * est déjà dans le message, la seconde est une pièce jointe intégrée que le
 * relais ne saurait pas atteindre.
 */
export function reecrireImages(html: string, mode: 'bloquer' | 'charger'): string {
  if (!html) return html
  const remplace = (u: string) => (mode === 'charger' ? urlRelais(u) : PIXEL_VIDE)

  let t = html

  // src des <img>
  t = t.replace(/(<img\b[^>]*?\ssrc\s*=\s*["'])([^"']+)(["'])/gi,
    (tout, avant, u, apres) => (DISTANTE.test(u) ? avant + remplace(u) + apres : tout))

  // srcset : en mode bloqué on le SUPPRIME. Le laisser annulerait le travail
  // fait sur `src` — le navigateur préfère srcset dès qu'il est présent.
  t = t.replace(/\ssrcset\s*=\s*["'][^"']*["']/gi, (tout) => {
    if (mode === 'bloquer') return ''
    return tout.replace(/(https?:\/\/[^\s,"']+)/gi, (u) => urlRelais(u))
  })

  // background="..." des vieux gabarits en tableaux
  t = t.replace(/(\bbackground\s*=\s*["'])([^"']+)(["'])/gi,
    (tout, avant, u, apres) => (DISTANTE.test(u) ? avant + remplace(u) + apres : tout))

  // url(...) dans les attributs style
  t = t.replace(/url\(\s*(["']?)([^"')]+)\1\s*\)/gi, (tout, q, u) => {
    if (!DISTANTE.test(u)) return tout
    return mode === 'charger' ? `url(${q}${urlRelais(u)}${q})` : 'none'
  })

  // Le pixel de suivi type 1×1 n'a aucune valeur d'affichage : une fois
  // neutralisé il resterait un carré d'un pixel dans le flux du texte.
  // `loading="lazy"` sur ce qui reste évite de tout charger d'un coup quand
  // l'utilisateur accepte les images d'un email long.
  if (mode === 'charger') {
    t = t.replace(/<img\b/gi, '<img loading="lazy" decoding="async"')
  }

  return t
}
