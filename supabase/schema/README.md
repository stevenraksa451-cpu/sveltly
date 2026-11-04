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

## Le régénérer

```bash
npx supabase db query --linked -f supabase/schema/EXTRAIRE_LE_SCHEMA.sql
```

La requête ne lit que les catalogues système : elle ne modifie rien.

## ⚠️ `supabase db query --linked` — la commande qui change tout

Elle exécute du SQL sur le projet lié **via l'API de gestion** : pas de
Docker, pas de mot de passe de base, pas de copier-coller dans le tableau de
bord.

Elle n'était pas dans la liste de sous-commandes consultée en premier — la
sortie était tronquée à `reset`, et `query` vient après. Conséquence : une
marche à suivre manuelle entière (extraire à la main, recoller le résultat)
a été écrite pour un obstacle qui n'existait pas. **Relire la liste complète
d'une CLI avant de conclure qu'une capacité manque.**

Ce qui reste vrai : `db pull` et `db dump` exigent Docker, et `db pull` refuse
en plus de tourner tant que les historiques divergent.

```bash
npx supabase db query --linked -f supabase/migrations/<fichier>.sql   # appliquer
npx supabase db query --linked "select …"                             # inspecter
```

## État des migrations

`npx supabase migration list` : 14 migrations distantes sans fichier local
(antérieures à ce dépôt), 4 fichiers locaux absents de l'historique distant,
**0 qui concordent**. Les quatre locales sont pourtant bien appliquées et
vérifiées en base — l'éditeur SQL n'écrit rien dans la table d'historique.

Ce désaccord n'empêche plus rien d'important : le schéma est dans le dépôt,
et `db query` applique les migrations. Il bloque seulement `db push` et
`db pull`. Pour en sortir, il faut Docker — et **d'abord** vérifier chaque
migration avant de la déclarer appliquée : la réparation que propose la CLI
marquerait tout sans rien contrôler.

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

Résultat une fois le test correct : `plan`, `ai_replies_count` et
`ai_replies_reset_at` tous les trois **bloqués**, et l'écriture légitime
(`full_name`) passe.

Pour que le test ne puisse rien écrire quelle que soit l'issue, l'envelopper
dans un bloc `DO` dont chaque sous-bloc lève — y compris en cas de succès —
et terminer par un `raise exception`. Ne PAS se fier à `begin … rollback` :
rien ne garantit que l'API n'exécute pas les instructions séparément, auquel
cas l'`UPDATE` serait validé.

## Ce que l'extraction a révélé

`increment_ai_usage` — invisible depuis ce dépôt pendant toute la mise en
place du verrou — est en **SECURITY DEFINER**, avec `search_path` fixé et
surtout `where id = (select auth.uid())`. Elle est donc correctement bornée
à l'appelant, et exemptée du déclencheur par `current_user`. Le compteur
continue d'avancer, ce que le test confirme.

Sa logique correspond exactement à la règle écrite à l'aveugle : même mois →
incrément ; mois différent → repart à `p_n` **et** déplace `ai_replies_reset_at`.
C'est précisément la seule baisse que le déclencheur autorise.

⚠️ Nuance restante : la fonction tronque le mois avec
`date_trunc('month', ai_replies_reset_at)` — donc dans le fuseau de la
session — alors que le déclencheur et `lib/ai-usage.ts` tronquent en **UTC**.
Sans conséquence aujourd'hui (la fonction est exemptée), mais les deux
pourraient diverger de quelques heures au basculement du 1er du mois.

## Ce dossier

| Fichier | Rôle |
|---|---|
| `schema_distant.sql` | L'instantané. **Généré — ne pas éditer.** |
| `EXTRAIRE_LE_SCHEMA.sql` | La requête qui le produit. Ne modifie rien. |
| `README.md` | Ce fichier. |
