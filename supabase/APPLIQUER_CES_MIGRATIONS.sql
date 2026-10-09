-- ============================================================
-- À COLLER DANS L'ÉDITEUR SQL DU TABLEAU DE BORD SUPABASE
-- ============================================================
-- Regroupe les deux migrations en attente, dans l'ordre :
--   supabase/migrations/20261001000000_tasks_completed_at.sql
--   supabase/migrations/20261002000000_tasks_category_source.sql
--
-- Pourquoi un fichier à part : `supabase db push` refuse de tourner tant
-- que 14 migrations appliquées à distance n'ont pas de fichier local
-- (elles ont été passées à la main dans le tableau de bord). Réparer cet
-- historique est une opération à part, à décider séparément — elle n'a
-- rien à voir avec ces deux-ci.
--
-- Entièrement additif : aucune colonne retirée, aucune ligne supprimée.
-- Rejouable sans risque (add column if not exists, update idempotents).
-- ============================================================

begin;

-- ---------- 1/2 : horodatage de complétion ----------
-- Nécessaire pour ne charger par défaut que les tâches actives + celles
-- terminées récemment, au lieu de tout l'historique du compte à chaque
-- visite (voir hooks/useTasks.ts).
alter table public.tasks add column if not exists completed_at timestamptz;
create index if not exists idx_tasks_completed_at on public.tasks(user_id, completed_at);

-- ---------- 2/2 : séparer la catégorie de la provenance ----------
-- `category` portait deux choses incompatibles : une vraie catégorie pour
-- une tâche créée à la main, le nom de l'expéditeur pour une tâche créée
-- depuis un email. Le filtre par catégorie listait donc des contacts.
alter table public.tasks add column if not exists source_label text;

-- Déplace (sans perdre) le nom de l'expéditeur vers sa propre colonne.
update public.tasks
   set source_label = category
 where from_email_id is not null
   and source_label is null
   and category is not null
   and category not in (
     'Client','Finance','Administratif','Rendez-vous',
     'Opportunités','Équipe','Marketing','Personnel','Autre'
   );

-- Ces lignes n'ont alors plus de catégorie valide : 'Autre' en attendant
-- qu'une vraie catégorie leur soit attribuée à la prochaine analyse.
update public.tasks
   set category = 'Autre'
 where from_email_id is not null
   and source_label is not null
   and (
     category is null
     or category not in (
       'Client','Finance','Administratif','Rendez-vous',
       'Opportunités','Équipe','Marketing','Personnel','Autre'
     )
   );

-- Reliquat d'une version antérieure du code.
update public.tasks set category = 'Autre' where category = 'email';

create index if not exists idx_tasks_user_category on public.tasks(user_id, category);

commit;

-- Contrôle après exécution (doit renvoyer 0 ligne) :
--   select id, category, source_label from public.tasks
--    where category is not null
--      and category not in ('Client','Finance','Administratif','Rendez-vous',
--                           'Opportunités','Équipe','Marketing','Personnel','Autre');
