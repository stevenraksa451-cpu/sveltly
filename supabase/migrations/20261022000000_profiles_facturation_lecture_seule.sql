-- Empêche un utilisateur de se mettre lui-même en Pro depuis son navigateur.
--
-- LE PROBLÈME
-- Le navigateur écrit directement dans `profiles` (réglages, onboarding —
-- voir app/(app)/settings/page.tsx:194, app/onboarding/name/page.tsx:23).
-- La politique RLS autorise donc UPDATE au propriétaire de la ligne. Or RLS
-- s'applique à la LIGNE, pas à la COLONNE : rien n'empêchait, depuis la
-- console du navigateur, avec la clé anon qui est publique par construction :
--
--     supabase.from('profiles').update({ plan: 'pro' }).eq('id', monId)
--
-- Le forfait Pro était donc gratuit pour qui savait ouvrir un onglet
-- développeur. Et comme aucun paiement n'est branché (pas de Stripe), aucun
-- recoupement de facturation n'aurait révélé un compte passé Pro tout seul.
--
-- POURQUOI UN DÉCLENCHEUR ET PAS UNE PERMISSION DE COLONNE
-- `revoke update (plan) on profiles from authenticated` ne fonctionne pas
-- tel quel : en PostgreSQL, une permission UPDATE au niveau de la TABLE
-- couvre toutes les colonnes et ne peut pas être retirée colonne par
-- colonne. Il faudrait révoquer la permission de table puis la re-accorder
-- sur chaque colonne autorisée — donc énumérer tout le schéma de `profiles`,
-- et casser silencieusement chaque colonne ajoutée plus tard, qui ne serait
-- alors plus modifiable par personne. Un déclencheur ne dépend pas du
-- schéma : il nomme les trois colonnes à protéger et ignore le reste.
--
-- POURQUOI `current_user` ET PAS LE RÔLE DU JETON
-- Les routes serveur utilisent la clé service-role : elles arrivent comme
-- `service_role`. Le navigateur arrive comme `authenticated`. Une fonction
-- SECURITY DEFINER s'exécute sous son propriétaire. Ne bloquer QUE
-- `authenticated` laisse donc passer tout ce qui est légitime, sans avoir à
-- énumérer ce qui l'est.

create or replace function public.profiles_facturation_lecture_seule()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  -- Tout ce qui n'est pas le navigateur d'un utilisateur connecté passe :
  -- routes serveur (service_role), tâches d'administration (postgres), et
  -- l'éditeur SQL de Supabase, qui reste le seul endroit où changer un
  -- forfait tant qu'aucun paiement n'est branché.
  if current_user <> 'authenticated' then
    return new;
  end if;

  if new.plan is distinct from old.plan then
    raise exception
      'profiles.plan est en lecture seule depuis le client (tentative : % -> %)',
      old.plan, new.plan
      using errcode = 'insufficient_privilege';
  end if;

  return new;
end
$$;

drop trigger if exists profiles_facturation_lecture_seule on public.profiles;

create trigger profiles_facturation_lecture_seule
  before update on public.profiles
  for each row
  execute function public.profiles_facturation_lecture_seule();

-- Même verrou à l'INSERT : `upsert` depuis l'onboarding crée la ligne si elle
-- n'existe pas, et pourrait la créer directement avec plan = 'pro'.
-- Le défaut de la colonne reprend la main.
create or replace function public.profiles_insert_plan_par_defaut()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  if current_user = 'authenticated' and new.plan is distinct from 'free' then
    new.plan := 'free';
  end if;
  return new;
end
$$;

drop trigger if exists profiles_insert_plan_par_defaut on public.profiles;

create trigger profiles_insert_plan_par_defaut
  before insert on public.profiles
  for each row
  execute function public.profiles_insert_plan_par_defaut();


-- ---------------------------------------------------------------------------
-- RESTE À FAIRE : le compteur de réponses IA
-- ---------------------------------------------------------------------------
-- `ai_replies_count` et `ai_replies_reset_at` sont encore modifiables depuis
-- le navigateur. C'est moins grave — on s'offre des réponses IA en plus, pas
-- le forfait Pro — mais ça coûte des tokens Groq, déjà la ressource la plus
-- serrée du projet.
--
-- Ces deux colonnes ne peuvent PAS être protégées de la même façon sans
-- vérification préalable : elles sont écrites par la fonction
-- `increment_ai_usage` (app/api/analyze/route.ts:476), dont le corps ne se
-- trouve nulle part dans ce dépôt — la base a été construite directement
-- dans Supabase. Si cette fonction est SECURITY INVOKER, elle s'exécute en
-- tant qu'`authenticated` et le déclencheur ci-dessus la bloquerait : le
-- compteur cesserait d'avancer, et toutes les réponses IA deviendraient
-- gratuites. L'inverse exact du but recherché.
--
-- 1. Regarder ce que fait la fonction, et sous quel régime :
--
--      select p.prosecdef as security_definer,
--             pg_get_functiondef(p.oid) as corps
--      from pg_proc p
--      where p.pronamespace = 'public'::regnamespace
--        and p.proname = 'increment_ai_usage';
--
-- 2. Si `security_definer` vaut false, NE PAS se contenter de basculer la
--    fonction : vérifier d'abord que son UPDATE porte bien un
--    `where id = auth.uid()`. Une fonction SECURITY DEFINER ignore RLS ; si
--    elle comptait sur RLS pour ne toucher que la ligne de l'appelant, la
--    basculer lui ferait incrémenter le compteur de TOUS les comptes.
--
-- 3. Une fois les deux points vérifiés, étendre le déclencheur ci-dessus aux
--    deux colonnes.
