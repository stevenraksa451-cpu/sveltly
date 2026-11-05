# Le schéma de la base

`schema_distant.sql` est un **instantané** du schéma `public` réel : tables,
colonnes, contraintes, index, état RLS, **toutes les politiques RLS**,
fonctions et déclencheurs. Généré — ne pas l'éditer à la main.

| | |
|---|---|
| Tables | 9 |
| Politiques RLS | 13 |
| Fonctions | 4 |
| Déclencheurs | 2 |
| Tables **sans** RLS | **0** |

## Le flux normal

```bash
npx supabase db push                                        # appliquer les migrations
npx supabase db query --linked -f supabase/schema/EXTRAIRE_LE_SCHEMA.sql
npx supabase db query --linked "select …"                   # inspecter
```

`db push` fonctionne depuis que les deux historiques concordent (voir plus
bas). Il n'y a plus de copier-coller à faire dans le tableau de bord — le
fichier `APPLIQUER_CES_MIGRATIONS.sql` qui servait à ça a été supprimé.

## ⚠️ `supabase db query --linked`

Exécute du SQL sur le projet lié **via l'API de gestion** : pas de Docker,
pas de mot de passe de base, pas de copier-coller.

Elle n'apparaissait pas dans la liste de sous-commandes consultée en premier
— la sortie était tronquée à `reset`, et `query` vient après. Conséquence :
une marche à suivre manuelle entière a été écrite pour un obstacle qui
n'existait pas. **Relire la liste complète d'une CLI avant de conclure qu'une
capacité manque.**

`db pull` et `db dump` exigent toujours Docker : ils lancent `pg_dump` dans
un conteneur. Ce n'est plus gênant — l'instantané est dans le dépôt, et
`db query` couvre l'inspection.

## L'historique des migrations, et comment il a été réconcilié

Il y avait **14 migrations distantes sans fichier local** (antérieures à ce
dépôt) et **4 fichiers locaux absents de l'historique distant** — zéro qui
concordait. Les quatre locales étaient pourtant bien appliquées : elles
l'avaient été par l'éditeur SQL, qui n'écrit rien dans la table d'historique.

La CLI propose une réparation toute faite devant ce conflit. **Elle marque
tout sans rien vérifier.** Chaque migration a donc été contrôlée par son
EFFET en base avant d'être déclarée appliquée :

| Migration | Vérifiée par |
|---|---|
| `20261001000000` | colonne `tasks.completed_at` |
| `20261002000000` | colonne `tasks.source_label` |
| `20261012000000` | table `email_analyses` |
| `20261022000000` | les 2 déclencheurs sur `profiles` |

Puis les 14 orphelines sont passées en `reverted` — rien n'est défait en
base, ces lignes ne portent qu'un numéro de version, jamais de SQL — et les
4 locales en `applied`. Les deux historiques concordent, `db push` répond
« Remote database is up to date ».

## Vérifier un verrou : trois tests faux d'affilée

Le déclencheur de facturation (`20261022000000`) a semblé inopérant **trois
fois**, pour trois raisons différentes. Aucune n'était un défaut du verrou.
C'est le mode d'emploi de toute vérification future sur cette base :

1. **`set local role authenticated` sans JWT.** La RLS ne laisse alors voir
   aucune ligne : l'`UPDATE` touche 0 ligne et le déclencheur BEFORE UPDATE
   ne se déclenche jamais. Il faut poser les claims comme le fait PostgREST :
   `set_config('request.jwt.claims', '{"sub":"<uuid>","role":"authenticated"}', true)`.

2. **Un `when others` trop large** dans le bloc de test attrapait l'échec du
   `set role` lui-même et le rapportait comme un échec du verrou.

3. **La cible était déjà en `plan = 'pro'`.** `new.plan is distinct from
   old.plan` était faux, et le déclencheur a laissé passer **à juste titre**.
   Tester sur un profil réellement en `free`.

Pour que le test ne puisse rien écrire quelle que soit l'issue, l'envelopper
dans un bloc `DO` dont chaque sous-bloc lève — y compris en cas de succès —
et terminer par un `raise exception`. Ne PAS se fier à `begin … rollback` :
rien ne garantit que l'API n'exécute pas les instructions séparément, auquel
cas l'`UPDATE` serait validé.

## Ce que l'extraction a révélé

`increment_ai_usage` — invisible depuis ce dépôt pendant toute la mise en
place du verrou — est en **SECURITY DEFINER**, avec `search_path` fixé et
surtout `where id = (select auth.uid())`. Elle est donc correctement bornée
à l'appelant, et exemptée du déclencheur par `current_user`.

Elle tronque le mois avec `date_trunc('month', ai_replies_reset_at)`, sans
aucun cast — et c'est la bonne façon de faire, parce que la colonne est de
type **date**. C'est le DÉCLENCHEUR qui avait tort : il castait en
timestamptz, ce qui faisait dépendre le mois du fuseau de la session.
Corrigé par la migration `20261105000000`.

## Ce dossier

| Fichier | Rôle |
|---|---|
| `schema_distant.sql` | L'instantané. **Généré — ne pas éditer.** |
| `EXTRAIRE_LE_SCHEMA.sql` | La requête qui le produit. Ne modifie rien. |
| `README.md` | Ce fichier. |
