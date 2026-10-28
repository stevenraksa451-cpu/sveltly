# Tests

```bash
npm test
```

**Aucune dépendance ajoutée.** Ni Vitest, ni Jest, ni ts-node : le lanceur
intégré de Node (`node:test`) et ses assertions (`node:assert/strict`), et
Node 24 qui exécute le TypeScript nativement. `CLAUDE.md` interdit d'ajouter
une dépendance sans demander — et ici il n'y en avait pas besoin.

## Ce qui est couvert, et pourquoi

Quatre modules **purs** : aucune base, aucun réseau, aucun navigateur. Ce sont
aussi les quatre où une régression se paie le plus cher.

| Module | Ce que les tests gardent |
|---|---|
| `lib/scheduling.ts` | Qu'un rendez-vous importé de Google, ou portant des invités, ne soit **jamais** déplacé par Sveltly. 419 lignes, la logique la plus délicate du projet. |
| `lib/ai-usage.ts` | La règle de remise à zéro mensuelle — le jumeau applicatif du déclencheur SQL de `20261022000000`. |
| `lib/tasks.ts` | Que `category` ne contienne qu'une valeur du jeu fermé, et qu'un email urgent produise bien une tâche urgente. |
| `lib/providers.ts` | Qu'une phrase décrivant le fonctionnement réel ne nomme jamais un fournisseur encore `planned`. |

Trois de ces invariants correspondent à des bugs **déjà survenus**, consignés
dans `CLAUDE.md` : des noms de contacts dans le filtre par catégorie, la ligne
« Urgent » de `/tasks` restée à zéro, et le site qui annonçait Outlook comme
connectable pendant que la FAQ disait le contraire.

## Ce qui n'est pas couvert, et pourquoi

- **`lib/time-saved.tsx` et `lib/plans.tsx`** — extension `.tsx` et import de
  composants React. Le dépouillement de types de Node ne gère pas le JSX ; les
  tester demanderait un vrai lanceur, donc une dépendance.
- **`countBillableReplies`** — défini dans `app/api/analyze/route.ts` sans être
  exporté. L'extraire dans `lib/` le rendrait testable ; c'est un petit
  remaniement, pas fait ici.
- **Tout ce qui touche la base, Gmail ou Groq** — ce sont des tests
  d'intégration, un autre chantier. `playwright` est d'ailleurs déjà installé
  et n'a jamais servi.

## Deux pièges rencontrés en écrivant ces tests

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

**Et un faux positif, attrapé au premier run** : un test vérifiait que la
réponse « quelles boîtes puis-je connecter ? » n'annonce aucune date. La regex
cherchait `mai` en sous-chaîne… que « G**mai**l » contient. Les limites de mot
étaient indispensables. Le test avait tort, pas le code.
