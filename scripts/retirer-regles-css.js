/**
 * Retire une règle CSS et le commentaire contigu qui la précède, en COMPTANT
 * LES ACCOLADES — jamais par expression régulière.
 *
 * Pourquoi : un script de nettoyage précédent utilisait
 * `(?:^\/\*[\s\S]*?\*\/\n)?^<sélecteur>\s*\{[^}]*\}` en multiligne. Le
 * `[\s\S]*?` pouvait démarrer sur un commentaire situé des centaines de
 * lignes plus haut : supprimer UNE règle emportait tout le bloc intermédiaire.
 * Le hero entier a disparu de app/page.module.css sans la moindre erreur de
 * build — CSS Modules continuait de générer les noms de classes, seules les
 * règles manquaient, et ça ne s'est vu qu'à la capture d'écran.
 *
 * Garde-fous ici :
 *   - le sélecteur doit être EXACTEMENT la classe visée (pseudo-classes
 *     admises), jamais un sélecteur composé ni une classe dont le nom en
 *     contient une autre (.footer ne doit pas emporter .footerText) ;
 *   - la fin de règle est trouvée en comptant les accolades, pas en cherchant
 *     le premier `}` ;
 *   - un commentaire n'est emporté que s'il est COLLÉ à la règle ;
 *   - le fichier est refusé si les accolades ne sont plus équilibrées.
 *
 * Usage : node scripts/retirer-regles-css.js <fichier.css> <classe> [classe…]
 */
const fs = require('fs')

function accoladesEquilibrees(src) {
  let n = 0
  for (const c of src) {
    if (c === '{') n++
    else if (c === '}') { n--; if (n < 0) return false }
  }
  return n === 0
}

/**
 * Début du sélecteur courant : juste après le dernier `{`, `}` ou `;`, puis
 * on AVANCE jusqu'au premier caractère non blanc.
 *
 * ⚠️ Sans cette avance, la position rendue était le saut de ligne qui suit
 * le `}` de la règle précédente. L'appelant remonte ensuite au début de SA
 * ligne — c'est-à-dire la ligne du `}` — et la suppression emportait cette
 * accolade fermante. Le garde-fou d'équilibre l'a refusé au premier essai ;
 * sans lui le fichier partait cassé, exactement comme la fois où le hero
 * entier a disparu.
 */
function debutSelecteur(src, posAccolade) {
  let i = posAccolade - 1
  while (i >= 0 && src[i] !== '{' && src[i] !== '}' && src[i] !== ';') i--
  i++
  // Avancer au-delà des blancs ET des commentaires : sans ce second saut, le
  // commentaire qui précède une règle était happé DANS le sélecteur, et la
  // règle n'était jamais reconnue (cas réel : .statChip, précédé de trois
  // lignes de commentaire).
  for (;;) {
    while (i < posAccolade && /\s/.test(src[i])) i++
    if (src.startsWith('/*', i)) {
      const fin = src.indexOf('*/', i + 2)
      if (fin === -1 || fin > posAccolade) break
      i = fin + 2
      continue
    }
    break
  }
  return i
}

/** Remonte sur les lignes de commentaire COLLÉES juste au-dessus. */
function avecCommentaireContigu(src, debut) {
  let i = debut
  // reculer jusqu'au début de la ligne
  while (i > 0 && src[i - 1] !== '\n') i--
  let garde = i
  for (;;) {
    // la ligne précédente se termine-t-elle par la fin d'un commentaire ?
    if (garde === 0) break
    const finLignePrec = garde - 1
    let debutLignePrec = finLignePrec
    while (debutLignePrec > 0 && src[debutLignePrec - 1] !== '\n') debutLignePrec--
    const ligne = src.slice(debutLignePrec, finLignePrec).trim()
    if (ligne.endsWith('*/')) {
      // remonter jusqu'au /* ouvrant
      const ouvrant = src.lastIndexOf('/*', finLignePrec)
      if (ouvrant === -1) break
      let d = ouvrant
      while (d > 0 && src[d - 1] !== '\n') d--
      garde = d
      continue
    }
    if (ligne.startsWith('/*') || ligne.startsWith('*')) { garde = debutLignePrec; continue }
    break
  }
  return garde
}

/**
 * Un sélecteur GROUPÉ n'est retiré que si CHACUNE de ses parties vise une
 * classe condamnée. `.photoSection, .photoSectionReverse { … }` disparaît
 * parce que les deux sont mortes ; si une seule l'était, la règle resterait
 * intacte — retirer le groupe entier emporterait une classe encore vivante.
 */
function retirer(src, classe, toutesLesClasses) {
  const motifDe = (c) =>
    new RegExp('^\\.' + c.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + '(\\s*:{1,2}[a-zA-Z-]+(\\([^)]*\\))?)*$')
  const motif = motifDe(classe)
  const motifsAutorises = toutesLesClasses.map(motifDe)
  const groupeEntierementMort = (sel) => {
    const parties = sel.split(',').map(s => s.trim()).filter(Boolean)
    if (parties.length < 2) return false
    if (!parties.some(p => motif.test(p))) return false
    return parties.every(p => motifsAutorises.some(m => m.test(p)))
  }

  let retraits = 0

  for (;;) {
    let trouve = -1
    for (let i = 0; i < src.length; i++) {
      if (src[i] !== '{') continue
      const d = debutSelecteur(src, i)
      const selecteur = src.slice(d, i).trim()
      if (motif.test(selecteur) || groupeEntierementMort(selecteur)) { trouve = i; break }
    }
    if (trouve === -1) break

    // fin de la règle, en comptant
    let profondeur = 0, fin = -1
    for (let i = trouve; i < src.length; i++) {
      if (src[i] === '{') profondeur++
      else if (src[i] === '}') { profondeur--; if (profondeur === 0) { fin = i; break } }
    }
    if (fin === -1) throw new Error('accolade fermante introuvable pour .' + classe)

    const debut = avecCommentaireContigu(src, debutSelecteur(src, trouve))
    let apres = fin + 1
    while (apres < src.length && (src[apres] === '\n' || src[apres] === '\r')) apres++

    src = src.slice(0, debut) + src.slice(apres)
    retraits++
  }
  return { src, retraits }
}

const [fichier, ...classes] = process.argv.slice(2)
if (!fichier || classes.length === 0) {
  console.error('usage : node scripts/retirer-regles-css.js <fichier.css> <classe> [classe…]')
  process.exit(1)
}

let src = fs.readFileSync(fichier, 'utf8')
const crlf = src.includes('\r\n')
if (crlf) src = src.split('\r\n').join('\n')

if (!accoladesEquilibrees(src)) {
  console.error('REFUS : ' + fichier + ' a déjà des accolades déséquilibrées')
  process.exit(1)
}

const avant = src.split('\n').length
const resume = []
for (const c of classes) {
  const r = retirer(src, c, classes)
  src = r.src
  resume.push('  .' + c + ' : ' + r.retraits + ' règle(s)')
}

if (!accoladesEquilibrees(src)) {
  console.error('REFUS : le retrait déséquilibre ' + fichier + ' — rien écrit')
  process.exit(1)
}

fs.writeFileSync(fichier, crlf ? src.split('\n').join('\r\n') : src)
console.log(fichier + ' : ' + avant + ' → ' + src.split('\n').length + ' lignes')
console.log(resume.join('\n'))
