# Le schéma de la base, et pourquoi il n'est pas encore ici

## L'état réel, mesuré

`npx supabase migration list` au 28/10/2026 :

| | nombre | |
|---|---|---|
| Migrations **distantes sans fichier local** | 14 | `20260920144516` → `20260925215843` |
| Migrations **locales absentes de l'historique distant** | 4 | `20261001000000` → `20261022000000` |
| Migrations dont les deux côtés concordent | **0** | |

Les 14 premières ont été appliquées à la main dans l'éditeur SQL avant que ce
dépôt existe. Les 4 locales ont été appliquées de la même façon : l'éditeur SQL
n'écrit rien dans la table d'historique, d'où les deux colonnes qui ne se
rencontrent jamais.

**Conséquence : le schéma — tables, colonnes, contraintes, index, et surtout
les politiques RLS — n'existe qu'à un seul endroit, le projet Supabase.** Pas
de second environnement, pas de retour arrière, pas de relecture en revue de
code. Si le projet est perdu, le schéma l'est avec.

Trois fois pendant l'audit d'octobre, cette absence a coûté du temps :
impossible de vérifier qu'une colonne était protégée (la faille `profiles.plan`
est restée invisible jusqu'à ce qu'on la cherche), impossible de lire
`increment_ai_usage` (il a fallu contourner), impossible de savoir si une table
avait RLS.

## Pourquoi `supabase db pull` ne suffit pas ici

Deux obstacles, dans cet ordre :

1. **`db pull` et `db dump` lancent `pg_dump` dans un conteneur.** Sans Docker
   Desktop installé, les deux échouent sur `LegacyDockerRunError`. `psql` n'est
   pas installé non plus.
2. **`db pull` refuse de s'exécuter** tant que les deux historiques divergent
   (`LegacyDbPullMigrationConflictError`).

## ⚠️ Le piège de la réparation suggérée par la CLI

Devant ce conflit, la CLI propose une liste de commandes toutes faites. La
dernière est :

```
supabase migration repair --status applied 20261022000000
```

**Ne pas la lancer en l'état.** Cette migration — le verrou qui empêche un
utilisateur de se mettre en Pro depuis sa console — **n'est pas appliquée**.
La marquer « applied » inscrirait un mensonge durable dans l'historique : la
base n'aurait pas le déclencheur, le dépôt croirait que si, et plus personne
ne l'appliquerait jamais.

Les trois autres (`20261001`, `20261002`, `20261012`) sont bien appliquées et
vérifiées en base — pour celles-là, `--status applied` dit la vérité.

## La marche à suivre, dans l'ordre

### 1. Appliquer la migration en attente

Coller `supabase/APPLIQUER_CES_MIGRATIONS.sql` dans l'éditeur SQL, puis
dérouler le protocole de vérification écrit en fin de ce fichier. Il demande
un `set local role authenticated` : sans lui, l'éditeur s'exécute en
`postgres`, qui est exempté du déclencheur, et les tentatives d'attaque
passeraient toutes — on conclurait à tort que le verrou ne marche pas.

### 2. Faire entrer le schéma dans le dépôt — sans rien installer

Coller `supabase/schema/EXTRAIRE_LE_SCHEMA.sql` dans l'éditeur SQL. La requête
ne lit que les catalogues système, elle ne modifie rien. Elle rend une seule
cellule de texte contenant tables, colonnes, contraintes, index, état RLS,
**toutes les politiques RLS**, fonctions et déclencheurs.

Copier le résultat dans `supabase/schema/schema_distant.sql` et commiter.

C'est un **instantané de référence**, pas une chaîne de migrations rejouable.
Il règle la relecture, la perte du projet et l'audit des politiques — pas le
déploiement.

### 3. Sortir du régime manuel — quand vous pourrez installer Docker

Une fois Docker Desktop en place, et **seulement après l'étape 1** :

```bash
# Les 14 migrations historiques n'ont pas de fichier : on les retire de
# l'historique distant. Rien n'est défait en base — ces lignes ne contiennent
# qu'un numéro de version, jamais de SQL.
npx supabase migration repair --status reverted 20260920144516
# … les 13 autres, la CLI donne la liste complète

# Les 4 locales sont alors réellement appliquées : là, c'est vrai.
npx supabase migration repair --status applied 20261001000000
npx supabase migration repair --status applied 20261002000000
npx supabase migration repair --status applied 20261012000000
npx supabase migration repair --status applied 20261022000000

# Les deux historiques concordent : db pull génère enfin une base de départ.
npx supabase db pull
```

À partir de là, `supabase db push` fonctionne et
`APPLIQUER_CES_MIGRATIONS.sql` n'a plus de raison d'être.

## Ce que ce dossier contient

| Fichier | Rôle |
|---|---|
| `EXTRAIRE_LE_SCHEMA.sql` | La requête à coller. Ne modifie rien. |
| `schema_distant.sql` | L'instantané. **Généré — ne pas éditer à la main.** |
| `README.md` | Ce fichier. |
