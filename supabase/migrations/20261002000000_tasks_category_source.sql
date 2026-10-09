-- Sépare la CATÉGORIE d'une tâche de sa PROVENANCE.
--
-- Jusqu'ici, tasks.category portait deux choses incompatibles :
--   - tâche créée à la main  → une vraie catégorie ('Client', 'Finance'…) ;
--   - tâche créée depuis un email → le nom de l'expéditeur ('Google',
--     'Lydia from Claude Code'…), écrit par app/api/emails/route.ts.
-- Le filtre latéral de /tasks, construit à partir des valeurs réellement
-- présentes en base, listait donc des contacts parmi les catégories, et
-- filtrer sur « Client » ne ramenait aucune tâche issue d'un email.
--
-- Additif et non destructif : aucune ligne supprimée, aucune colonne retirée.
-- Les valeurs d'expéditeur sont DÉPLACÉES (pas effacées) vers source_label.

-- 1. La provenance a maintenant sa propre colonne.
alter table public.tasks add column if not exists source_label text;

-- 2. Les tâches nées d'un email portent leur expéditeur dans category.
--    On le déplace dans source_label sans rien perdre.
update public.tasks
   set source_label = category
 where from_email_id is not null
   and source_label is null
   and category is not null
   and category not in (
     'Client','Finance','Administratif','Rendez-vous',
     'Opportunités','Équipe','Marketing','Personnel','Autre'
   );

-- 3. Ces mêmes tâches n'ont alors plus de catégorie valide. On les range dans
--    'Autre' plutôt que de laisser null : la colonne sert de filtre, et une
--    tâche sans catégorie disparaîtrait de tout filtrage par catégorie.
--    Les tâches suivantes recevront une vraie catégorie à la création
--    (voir resolveTaskCategory dans lib/tasks.ts).
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

-- 4. Reliquat historique : quelques tâches portaient le littéral 'email'
--    comme catégorie (valeur de repli d'une version antérieure du code).
update public.tasks set category = 'Autre' where category = 'email';

-- Index sur le couple réellement filtré par /tasks.
create index if not exists idx_tasks_user_category on public.tasks(user_id, category);
