/**
 * Classes orphelines dans les deux sens :
 *   - un `className` sans règle CSS  → effet silencieusement absent ;
 *   - une règle sans `className`     → CSS mort.
 *
 * Usage : node scripts/audit-css.js
 *
 * ⚠️ Trois pièges, tous rencontrés — une version naïve de ce script a produit
 * deux rapports faux avant d'être corrigée :
 *
 * 1. Se fier au .tsx DE MÊME NOM que le module. app/page.module.css est
 *    importé par app/LandingPage.tsx, pas par app/page.tsx : le script
 *    annonçait 122 règles mortes qui étaient toutes utilisées. On résout donc
 *    les imports réels.
 *
 * 2. N'extraire que la PREMIÈRE classe d'un sélecteur. Dans
 *    `.connectedBadge.disconnected { … }`, une regex ancrée en début de ligne
 *    ne voit que `connectedBadge` — et `disconnected` est alors déclarée
 *    « sans règle » alors que la règle existe.
 *
 * 3. Ignorer `composes`. Une classe tirée depuis un autre module y est
 *    utilisée sans qu'aucun `className` ne la nomme.
 *
 * Et une limite assumée : `styles[variable]` rend l'analyse statique
 * inopérante. Les modules concernés sont exclus du compte des règles mortes.
 */
const fs = require('fs')
const path = require('path')

function parcourir(d, sortie = []) {
  for (const e of fs.readdirSync(d, { withFileTypes: true })) {
    if (['node_modules', '.next', '.git', '.claude', 'scripts'].includes(e.name)) continue
    const p = path.join(d, e.name)
    e.isDirectory() ? parcourir(p, sortie) : sortie.push(p)
  }
  return sortie
}

/** Toutes les classes d'un module, y compris en seconde position. */
function classesDeclarees(css) {
  const sansCommentaires = css.replace(/\/\*[\s\S]*?\*\//g, '')
  const noms = new Set()
  for (const morceau of sansCommentaires.split('{')) {
    const selecteur = morceau.split('}').pop()
    for (const m of selecteur.matchAll(/\.([A-Za-z][\w-]*)/g)) noms.add(m[1])
  }
  return noms
}

const tous = parcourir('.')
const sources = tous.filter(f => f.endsWith('.tsx') || f.endsWith('.ts'))

const consommateurs = new Map()
for (const f of sources) {
  const s = fs.readFileSync(f, 'utf8')
  for (const m of s.matchAll(/import\s+(\w+)\s+from\s+['"]([^'"]+\.module\.css)['"]/g)) {
    const resolu = m[2].startsWith('@/')
      ? path.normalize(m[2].slice(2))
      : path.normalize(path.join(path.dirname(f), m[2]))
    if (!consommateurs.has(resolu)) consommateurs.set(resolu, [])
    consommateurs.get(resolu).push({ fichier: f, alias: m[1] })
  }
}

// Classes tirées par `composes` depuis un autre module.
const tireesParComposes = new Map()
for (const f of tous.filter(f => f.endsWith('.module.css'))) {
  const css = fs.readFileSync(f, 'utf8')
  for (const m of css.matchAll(/composes:\s*([\w\s]+)\s+from\s+['"]([^'"]+)['"]/g)) {
    const cible = path.normalize(path.join(path.dirname(f), m[2]))
    if (!tireesParComposes.has(cible)) tireesParComposes.set(cible, new Set())
    for (const nom of m[1].trim().split(/\s+/)) tireesParComposes.get(cible).add(nom)
  }
}

let mort = 0, muet = 0
const listeMuets = [], parFichier = {}

for (const css of tous.filter(f => f.endsWith('.module.css'))) {
  const cle = path.normalize(css)
  const usagers = consommateurs.get(cle) || []
  const declarees = classesDeclarees(fs.readFileSync(css, 'utf8'))
  const composees = tireesParComposes.get(cle) || new Set()

  let dynamique = false
  const utilisees = new Set(composees)
  for (const { fichier, alias } of usagers) {
    const s = fs.readFileSync(fichier, 'utf8')
    if (s.includes(alias + '[')) dynamique = true
    for (const m of s.matchAll(new RegExp(alias + '\\.([A-Za-z]\\w*)', 'g'))) utilisees.add(m[1])
  }

  if (usagers.length > 0) {
    for (const c of utilisees) {
      if (!declarees.has(c) && !composees.has(c)) {
        muet++
        listeMuets.push([usagers.map(u => u.fichier).join(', '), c, css])
      }
    }
  }

  if (dynamique) continue
  const morts = [...declarees].filter(c => !utilisees.has(c))
  if (morts.length) { mort += morts.length; parFichier[css] = morts }
}

console.log('className SANS AUCUNE RÈGLE (effet absent) : ' + muet)
for (const [f, c, css] of listeMuets) {
  console.log('  styles.' + c + '  — ' + f + '  (attendu dans ' + css + ')')
}

console.log('\nRÈGLES CSS JAMAIS RÉFÉRENCÉES : ' + mort)
for (const [f, cs] of Object.entries(parFichier).sort((a, b) => b[1].length - a[1].length)) {
  console.log('  ' + String(cs.length).padStart(3) + '  ' + f)
  console.log('       ' + cs.join(', '))
}

process.exit(muet > 0 ? 1 : 0)
