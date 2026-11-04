/**
 * Remplace l'apostrophe droite ' par l'apostrophe française ’ (U+2019) dans
 * le TEXTE VISIBLE uniquement.
 *
 * Usage :
 *   node scripts/apostrophes.js            # rapport, n'écrit rien
 *   node scripts/apostrophes.js --ecrire   # applique
 *
 * POURQUOI PAS UNE REGEX SUR LE FICHIER ENTIER
 * Parce qu'elle toucherait `import x from '@/y'`, les noms de classes, les
 * clés d'objet, les chemins. On passe donc par l'AST de TypeScript — déjà
 * présent dans le projet, aucune dépendance ajoutée — et on ne modifie que
 * trois sortes de nœuds :
 *   - JsxText            : du texte rendu, par définition ;
 *   - StringLiteral      : chaînes de caractères ;
 *   - templates sans substitution et leurs morceaux.
 *
 * TROIS GARDE-FOUS
 * 1. Les spécificateurs de module (`from '…'`) sont ignorés.
 * 2. Une chaîne COMPARÉE (=== !== == != ou `case`) est ignorée : changer un
 *    caractère y changerait le résultat du test, pas l'affichage.
 * 3. Une chaîne qui sert de CLÉ d'objet ou de nom de propriété est ignorée.
 *
 * Le motif lui-même est étroit : une lettre, une apostrophe (échappée ou
 * non), une lettre. « l'email », « jusqu'à », « aujourd'hui ». Il ne peut pas
 * matcher 'use client', './card.module.css' ni '@/lib/plans'.
 */
const fs = require('fs')
const path = require('path')
const ts = require('typescript')

const ECRIRE = process.argv.includes('--ecrire')

const IGNORES = ['node_modules', '.next', '.git', '.claude', 'scripts', 'supabase']
// ⚠️ La plage doit couvrir le latin étendu, pas seulement le latin-1.
// Première version : 'A-Za-zÀ-ÖØ-öø-ÿ', qui s'arrête à U+00FF. Les ligatures
// françaises œ et æ vivent à U+0152-U+0153 et U+00E6 : « d'œil » n'était donc
// pas converti, alors que « qu'un » l'était deux mots plus loin, dans la même
// phrase. Repéré dans le diff du premier passage.
const LETTRE = 'A-Za-zÀ-ÖØ-öø-ÿĀ-ſ'
const MOTIF = new RegExp('([' + LETTRE + '])\\\\?\'([' + LETTRE + '])', 'g')

function parcourir(d, sortie = []) {
  for (const e of fs.readdirSync(d, { withFileTypes: true })) {
    if (IGNORES.includes(e.name)) continue
    const p = path.join(d, e.name)
    e.isDirectory() ? parcourir(p, sortie) : sortie.push(p)
  }
  return sortie
}

function estComparee(noeud) {
  const p = noeud.parent
  if (!p) return false
  if (ts.isCaseClause(p)) return true
  if (ts.isBinaryExpression(p)) {
    const k = p.operatorToken.kind
    return k === ts.SyntaxKind.EqualsEqualsEqualsToken
      || k === ts.SyntaxKind.ExclamationEqualsEqualsToken
      || k === ts.SyntaxKind.EqualsEqualsToken
      || k === ts.SyntaxKind.ExclamationEqualsToken
  }
  return false
}

/**
 * Vrai si le nœud est quelque part à l'intérieur d'un `__html` — donc du
 * code ou du balisage injecté, pas du texte à composer.
 *
 * Cas réel : le script anti-flash du thème dans app/layout.tsx est un
 * template literal passé à dangerouslySetInnerHTML. Le codemod voulait y
 * convertir les apostrophes de ses COMMENTAIRES JavaScript. Sans effet ici,
 * mais on ne laisse pas un outil de typographie réécrire du code exécutable :
 * la prochaine fois, l'apostrophe sera dans une chaîne.
 */
function dansDuHtmlBrut(noeud) {
  for (let p = noeud.parent; p; p = p.parent) {
    if (ts.isPropertyAssignment(p) && p.name && p.name.getText() === '__html') return true
  }
  return false
}

function estStructurel(noeud) {
  if (dansDuHtmlBrut(noeud)) return true
  const p = noeud.parent
  if (!p) return false
  // from '…' / require('…')
  if (ts.isImportDeclaration(p) || ts.isExportDeclaration(p)) return true
  if (ts.isCallExpression(p) && p.arguments[0] === noeud
      && p.expression.getText && /require|import/.test(p.expression.getText())) return true
  // clé d'objet, nom de propriété, accès indexé
  if (ts.isPropertyAssignment(p) && p.name === noeud) return true
  if (ts.isElementAccessExpression(p) && p.argumentExpression === noeud) return true
  if (ts.isLiteralTypeNode(p)) return true
  return false
}

const fichiers = parcourir('.').filter(f => /\.(ts|tsx)$/.test(f) && !f.endsWith('.d.ts'))
let totalRemplacements = 0
const parFichier = []

for (const fichier of fichiers) {
  const brut = fs.readFileSync(fichier, 'utf8')
  const crlf = brut.includes('\r\n')
  const src = crlf ? brut.split('\r\n').join('\n') : brut

  const sf = ts.createSourceFile(fichier, src, ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX)
  const plages = []

  const visiter = (n) => {
    const estTexte = ts.isJsxText(n)
      || ts.isStringLiteral(n)
      || n.kind === ts.SyntaxKind.NoSubstitutionTemplateLiteral
      || n.kind === ts.SyntaxKind.TemplateHead
      || n.kind === ts.SyntaxKind.TemplateMiddle
      || n.kind === ts.SyntaxKind.TemplateTail

    if (estTexte && !estComparee(n) && !estStructurel(n)) {
      plages.push([n.getStart(sf), n.getEnd()])
    }
    n.forEachChild(visiter)
  }
  sf.forEachChild(visiter)

  if (plages.length === 0) continue

  plages.sort((a, b) => b[0] - a[0]) // de la fin vers le début : les index restent valides
  let resultat = src
  let n = 0
  for (const [debut, fin] of plages) {
    const avant = resultat.slice(debut, fin)
    const apres = avant.replace(MOTIF, '$1’$2')
    if (apres !== avant) {
      n += (avant.match(MOTIF) || []).length
      resultat = resultat.slice(0, debut) + apres + resultat.slice(fin)
    }
  }

  if (n > 0) {
    totalRemplacements += n
    parFichier.push([fichier, n])
    if (ECRIRE) fs.writeFileSync(fichier, crlf ? resultat.split('\n').join('\r\n') : resultat)
  }
}

parFichier.sort((a, b) => b[1] - a[1])
for (const [f, n] of parFichier) console.log('  ' + String(n).padStart(4) + '  ' + f)
console.log()
console.log((ECRIRE ? 'APPLIQUÉ : ' : 'SIMULATION : ') + totalRemplacements + ' apostrophes dans ' + parFichier.length + ' fichiers')
if (!ECRIRE) console.log('Relancer avec --ecrire pour appliquer.')
