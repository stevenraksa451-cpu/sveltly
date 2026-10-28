-- ============================================================================
-- EXTRACTION DU SCHÉMA RÉEL — à coller dans l'éditeur SQL de Supabase
-- ============================================================================
--
-- POURQUOI CE FICHIER EXISTE
-- `supabase db pull` et `supabase db dump` lancent pg_dump DANS UN CONTENEUR :
-- sans Docker Desktop, les deux échouent sur LegacyDockerRunError. Et `db pull`
-- refuse de toute façon de s'exécuter tant que l'historique local et distant
-- divergent (voir supabase/schema/README.md).
--
-- Cette requête fait le même travail en lisant les catalogues système. Elle ne
-- MODIFIE rien : que des SELECT.
--
-- MODE D'EMPLOI
-- 1. Supabase → SQL Editor → coller tout ce fichier → Run.
-- 2. Le résultat est UNE cellule de texte. La copier en entier.
-- 3. La coller dans supabase/schema/schema_distant.sql et commiter.
--
-- Si la cellule paraît tronquée à l'écran : bouton « Download CSV » en haut à
-- droite des résultats, le fichier contient le texte complet.
--
-- CE QUI EST CAPTURÉ
-- Tables, colonnes, types, valeurs par défaut, NOT NULL, contraintes (clés
-- primaires, étrangères, uniques, CHECK), index, état RLS, TOUTES les
-- politiques RLS, fonctions et déclencheurs du schéma `public`.
-- ============================================================================

with

-- --- Tables et colonnes ----------------------------------------------------
colonnes as (
  select
    c.oid as table_oid,
    c.relname as table_nom,
    string_agg(
      '  ' || quote_ident(a.attname)
           || ' ' || format_type(a.atttypid, a.atttypmod)
           || case when a.attnotnull then ' NOT NULL' else '' end
           || coalesce(' DEFAULT ' || pg_get_expr(d.adbin, d.adrelid), ''),
      E',\n' order by a.attnum
    ) as corps
  from pg_class c
  join pg_namespace n on n.oid = c.relnamespace
  join pg_attribute a on a.attrelid = c.oid
  left join pg_attrdef d on d.adrelid = a.attrelid and d.adnum = a.attnum
  where n.nspname = 'public'
    and c.relkind = 'r'
    and a.attnum > 0
    and not a.attisdropped
  group by c.oid, c.relname
),

-- --- Contraintes : clés primaires, étrangères, uniques, CHECK --------------
contraintes as (
  select
    c.oid as table_oid,
    string_agg(
      'ALTER TABLE public.' || quote_ident(c.relname)
        || ' ADD CONSTRAINT ' || quote_ident(co.conname)
        || ' ' || pg_get_constraintdef(co.oid) || ';',
      E'\n' order by co.contype desc, co.conname
    ) as texte
  from pg_constraint co
  join pg_class c on c.oid = co.conrelid
  join pg_namespace n on n.oid = c.relnamespace
  where n.nspname = 'public'
  group by c.oid, c.relname
),

-- --- Index (hors ceux créés automatiquement par une contrainte) ------------
index_ as (
  select
    c.oid as table_oid,
    string_agg(pg_get_indexdef(i.indexrelid) || ';', E'\n' order by ic.relname) as texte
  from pg_index i
  join pg_class ic on ic.oid = i.indexrelid
  join pg_class c on c.oid = i.indrelid
  join pg_namespace n on n.oid = c.relnamespace
  where n.nspname = 'public'
    and not exists (
      select 1 from pg_constraint co where co.conindid = i.indexrelid
    )
  group by c.oid
),

-- --- Politiques RLS : le cœur du sujet -------------------------------------
politiques as (
  select
    c.oid as table_oid,
    string_agg(
      'CREATE POLICY ' || quote_ident(p.polname)
        || ' ON public.' || quote_ident(c.relname)
        || ' AS ' || case when p.polpermissive then 'PERMISSIVE' else 'RESTRICTIVE' end
        || ' FOR ' || case p.polcmd
             when 'r' then 'SELECT' when 'a' then 'INSERT'
             when 'w' then 'UPDATE' when 'd' then 'DELETE' else 'ALL' end
        || ' TO ' || coalesce(
             (select string_agg(quote_ident(r.rolname), ', ')
              from pg_roles r where r.oid = any(p.polroles)), 'PUBLIC')
        || coalesce(E'\n  USING (' || pg_get_expr(p.polqual, p.polrelid) || ')', '')
        || coalesce(E'\n  WITH CHECK (' || pg_get_expr(p.polwithcheck, p.polrelid) || ')', '')
        || ';',
      E'\n' order by p.polname
    ) as texte
  from pg_policy p
  join pg_class c on c.oid = p.polrelid
  join pg_namespace n on n.oid = c.relnamespace
  where n.nspname = 'public'
  group by c.oid
),

-- --- Un bloc complet par table ---------------------------------------------
blocs_tables as (
  select
    1 as ordre,
    col.table_nom as nom,
    '-- ─────────────────────────────────────────────────────────────' || E'\n'
    || '-- TABLE public.' || col.table_nom || E'\n'
    || '-- ─────────────────────────────────────────────────────────────' || E'\n'
    || 'CREATE TABLE public.' || quote_ident(col.table_nom) || ' (' || E'\n'
    || col.corps || E'\n' || ');' || E'\n'
    || case when c.relrowsecurity
         then 'ALTER TABLE public.' || quote_ident(col.table_nom) || ' ENABLE ROW LEVEL SECURITY;' || E'\n'
         else '-- ⚠️ RLS DÉSACTIVÉE sur cette table' || E'\n' end
    || coalesce(E'\n' || ct.texte || E'\n', '')
    || coalesce(E'\n' || ix.texte || E'\n', '')
    || coalesce(E'\n' || po.texte || E'\n', E'\n-- (aucune politique RLS)\n')
    as texte
  from colonnes col
  join pg_class c on c.oid = col.table_oid
  left join contraintes ct on ct.table_oid = col.table_oid
  left join index_ ix on ix.table_oid = col.table_oid
  left join politiques po on po.table_oid = col.table_oid
),

-- --- Fonctions (dont increment_ai_usage) -----------------------------------
blocs_fonctions as (
  select
    2 as ordre,
    p.proname as nom,
    '-- ─────────────────────────────────────────────────────────────' || E'\n'
    || '-- FONCTION public.' || p.proname
    || case when p.prosecdef then '   [SECURITY DEFINER]' else '   [SECURITY INVOKER]' end || E'\n'
    || '-- ─────────────────────────────────────────────────────────────' || E'\n'
    || pg_get_functiondef(p.oid) || ';' || E'\n'
    as texte
  from pg_proc p
  join pg_namespace n on n.oid = p.pronamespace
  where n.nspname = 'public'
    and p.prokind in ('f', 'p')
),

-- --- Déclencheurs -----------------------------------------------------------
blocs_declencheurs as (
  select
    3 as ordre,
    t.tgname as nom,
    pg_get_triggerdef(t.oid) || ';' as texte
  from pg_trigger t
  join pg_class c on c.oid = t.tgrelid
  join pg_namespace n on n.oid = c.relnamespace
  where n.nspname = 'public'
    and not t.tgisinternal
)

select
  '-- Schéma public de Sveltly, extrait le ' || to_char(now(), 'YYYY-MM-DD HH24:MI') || E'\n'
  || '-- Généré par supabase/schema/EXTRAIRE_LE_SCHEMA.sql — ne pas éditer à la main.' || E'\n\n'
  || string_agg(texte, E'\n' order by ordre, nom)
  as schema_complet
from (
  select ordre, nom, texte from blocs_tables
  union all
  select ordre, nom, texte from blocs_fonctions
  union all
  select ordre, nom, texte from blocs_declencheurs
) tout;
