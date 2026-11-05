# Tests

```bash
npm test
```

**Aucune dépendance ajoutée.** Ni Vitest, ni Jest, ni ts-node : le lanceur
intégré de Node (`node:test`) et ses assertions (`node:assert/strict`), et
Node 24 qui exécute le TypeScript nativement. `CLAUDE.md` interdit d'ajouter
une dépendance sans demander — et ici il n'y en avait pas besoin.

## Ce qui est couvert, et pourquoi

**115 tests, 8 fichiers, ~0,2 s.** Que des modules **purs** : aucune base,
aucun réseau, aucun navigateur. Ce sont aussi ceux où une régression se paie
le plus cher.

| Module | Ce que les tests gardent |
|---|---|
| `lib/scheduling.ts` | Qu'un rendez-vous importé de Google, ou portant des invités, ne soit **jamais** déplacé par Sveltly. 419 lignes, la logique la plus délicate du projet. |
| `lib/ai-usage.ts` | La règle de remise à zéro mensuelle — le jumeau applicatif du déclencheur SQL de `20261022000000` — et la répartition quotidienne du quota (`plafondQuotidien`). |
| `lib/tasks.ts` | Que `category` ne contienne qu'une valeur du jeu fermé, et qu'un email urgent produise bien une tâche urgente. |
| `lib/providers.ts` | Qu'une phrase décrivant le fonctionnement réel ne nomme jamais un fournisseur encore `planned`. |
| `lib/dates.ts` | Qu'« aujourd'hui » soit la date LOCALE. 17 endroits utilisaient `toISOString().slice(0,10)`, donc la date UTC : à Paris, après 1 h du matin, « aujourd'hui » désignait la veille. |
| `lib/api-handler.ts` | Qu'un corps d'erreur reste **parsable** : 400 sur un JSON malformé, 500 avec un message générique sur tout autre `throw`, redirection pour les callbacks OAuth. |
| `lib/lire-json.ts` | Qu'une réponse vide ou non-JSON (un 502 HTML de l'hébergeur) ne fasse plus lever le client sur le parsing. |
| `lib/time-saved-calcul.ts` | Que chaque seconde annoncée corresponde à une action qui a **eu lieu** : un email trié sans résumé ne compte pas de résumé, un rendez-vous sans conflit ne compte pas de réarrangement. Et que `SAVINGS_RATIO`, affiché sur la vitrine, ne bouge pas quand on retouche les constantes. |

Cinq de ces invariants correspondent à des bugs **déjà survenus**, consignés
dans `CLAUDE.md` : des noms de contacts dans le filtre par catégorie, la ligne
« Urgent » de `/tasks` restée à zéro, le site qui annonçait Outlook comme
connectable pendant que la FAQ disait le contraire, le décalage UTC de la date
du jour, et les routes API qui rendaient un corps vide sur 500.

### ⚠️ `lib/time-saved.tsx` ne contient plus le calcul

Il ne garde que `TIME_SAVED_METHOD_NOTE`, qui embarque `<Brand />`. Le
dépouillement de types de Node ne gère pas le JSX : tant que les constantes
vivaient dans ce fichier, **un modèle chiffré affiché à l'utilisateur n'était
pas testable**. Elles sont dans `lib/time-saved-calcul.ts`, réexporté par
`lib/time-saved.tsx` — les imports existants n'ont pas changé.

Ne pas renommer ce fichier en `.ts` et ne pas créer `lib/time-saved.ts` à côté
du `.tsx` : deux modules de même nom et d'extensions différentes rendent la
résolution ambiguë. C'est la raison du nom distinct.

## Ce qui n'est pas couvert, et pourquoi

- **`lib/plans.tsx`** — extension `.tsx` et import de composants React, pour
  les mêmes raisons que ci-dessus. Le découpage appliqué à `time-saved` est
  possible ici aussi, mais il n'y a pas de calcul à garder : ce sont des
  données.
- **`countBillableReplies`** — défini dans `app/api/analyze/route.ts` sans être
  exporté. L'extraire dans `lib/` le rendrait testable ; c'est un petit
  remaniement, pas fait ici.
- **Tout ce qui touche la base, Gmail ou Groq** — ce sont des tests
  d'intégration, un autre chantier. `playwright` est d'ailleurs déjà installé
  et n'a jamais servi.

## Pièges rencontrés en écrivant ces tests

**Les imports relatifs doivent porter l'extension `.ts`.** La résolution ESM de
Node l'exige quand il exécute du TypeScript directement. TypeScript la refuse
par défaut : `allowImportingTsExtensions` est posé dans `tsconfig.json` pour
concilier les deux (il autorise sans imposer — le code applicatif continue
d'importer sans extension).

**`import { Priority } from '@/types'` cassait l'exécution.** Un import de type
écrit comme un import de valeur : Node tente de le résoudre à l'exécution, et
l'alias `@/` n'existe pas pour lui. Écrit `import type`, il disparaît au
dépouillement. Corrigé dans `lib/scheduling.ts` et `lib/tasks.ts` — aucun
changement de comportement, et l'intention devient explicite.

**Un module testé ne doit pas importer `next/server`.** `lib/api-handler.ts`
échouait sur `ERR_MODULE_NOT_FOUND`. Il importe `NextRequest` en `import type`
et rend un `Response.json()` standard, pas un `NextResponse.json()`.

**`new Response('', { status: 204 })` lève.** La spécification interdit un
corps sur un 204, et la vérification a lieu à la construction. Le test
distingue donc un 200 à corps vide d'un vrai 204 (construit avec `null`).

**Et un faux positif, attrapé au premier run** : un test vérifiait que la
réponse « quelles boîtes puis-je connecter ? » n'annonce aucune date. La regex
cherchait `mai` en sous-chaîne… que « G**mai**l » contient. Les limites de mot
étaient indispensables. Le test avait tort, pas le code.
