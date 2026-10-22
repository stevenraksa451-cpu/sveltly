-- Empêche un utilisateur de se mettre lui-même en Pro, ou de remettre son
-- compteur de réponses IA à zéro, depuis son navigateur.
--
-- Idempotente : `create or replace` + `drop trigger if exists`. La rejouer
-- ne coûte rien.
--
-- LE PROBLÈME
-- Le navigateur écrit directement dans `profiles` (réglages, onboarding —
-- voir app/(app)/settings/page.tsx:194, app/onboarding/name/page.tsx:23).
-- La politique RLS autorise donc UPDATE au propriétaire de la ligne. Or RLS
-- s'applique à la LIGNE, pas à la COLONNE : rien n'empêchait, depuis la
-- console du navigateur, avec la clé anon qui est publique par construction :
--
--     supabase.from('profiles').update({ plan: 'pro' }).eq('id', monId)
--     supabase.from('profiles').update({ ai_replies_count: 0 }).eq('id', monId)
--
-- Le forfait Pro était gratuit pour qui savait ouvrir un onglet développeur,
-- et le quota mensuel se rechargeait à volonté. Comme aucun paiement n'est
-- branché, aucun recoupement de facturation ne l'aurait révélé.
--
-- POURQUOI UN DÉCLENCHEUR ET PAS UNE PERMISSION DE COLONNE
-- `revoke update (plan) on profiles from authenticated` ne fonctionne pas tel
-- quel : en PostgreSQL, une permission UPDATE au niveau de la TABLE couvre
-- toutes les colonnes et ne se retire pas colonne par colonne. Il faudrait
-- révoquer la permission de table puis la re-accorder sur chaque colonne
-- autorisée — donc énumérer tout le schéma de `profiles`, et casser
-- silencieusement chaque colonne ajoutée plus tard, qui ne serait alors plus
-- modifiable par personne. Un déclencheur ne dépend pas du schéma : il nomme
-- les trois colonnes à protéger et ignore le reste.
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
declare
  ancien_mois timestamp;
  nouveau_mois timestamp;
begin
  -- Tout ce qui n'est pas le navigateur d'un utilisateur connecté passe :
  -- routes serveur (service_role), tâches d'administration (postgres), et
  -- l'éditeur SQL de Supabase, qui reste le seul endroit où changer un
  -- forfait tant qu'aucun paiement n'est branché.
  if current_user <> 'authenticated' then
    return new;
  end if;

  ---------------------------------------------------------------------------
  -- 1 · Le forfait ne bouge jamais depuis le client.
  -- Vérifié avant d'écrire cette règle : AUCUN code de l'application n'écrit
  -- `plan`. Ce verrou ne peut donc rien casser.
  ---------------------------------------------------------------------------
  if new.plan is distinct from old.plan then
    raise exception
      'profiles.plan est en lecture seule depuis le client (tentative : % -> %)',
      old.plan, new.plan
      using errcode = 'insufficient_privilege';
  end if;

  ---------------------------------------------------------------------------
  -- 2 · La date de remise à zéro ne recule pas, et ne part pas dans le futur.
  --
  -- lib/ai-usage.ts lit le quota ainsi : si le MOIS de `ai_replies_reset_at`
  -- diffère du mois courant, le compteur est considéré comme remis à zéro.
  -- La comparaison porte sur une différence, pas sur un ordre — déplacer la
  -- date vers un mois PASSÉ ou vers un mois FUTUR produit donc exactement le
  -- même résultat : un quota vide. Les deux sens doivent être fermés.
  --
  -- La seule écriture légitime est celle de `increment_ai_usage`, qui pose la
  -- date du jour : elle avance, et jamais au-delà d'aujourd'hui.
  ---------------------------------------------------------------------------
  if old.ai_replies_reset_at is not null then
    if new.ai_replies_reset_at is null then
      raise exception
        'profiles.ai_replies_reset_at ne peut pas être vidée depuis le client'
        using errcode = 'insufficient_privilege';
    end if;

    if new.ai_replies_reset_at::timestamptz < old.ai_replies_reset_at::timestamptz then
      raise exception
        'profiles.ai_replies_reset_at ne peut pas reculer (% -> %)',
        old.ai_replies_reset_at, new.ai_replies_reset_at
        using errcode = 'insufficient_privilege';
    end if;
  end if;

  -- Un jour de marge : le serveur pose la date en UTC, et un client dans un
  -- fuseau en avance ne doit pas se faire refuser une écriture légitime.
  if new.ai_replies_reset_at is not null
     and new.ai_replies_reset_at::timestamptz > now() + interval '1 day' then
    raise exception
      'profiles.ai_replies_reset_at ne peut pas être placée dans le futur (%)',
      new.ai_replies_reset_at
      using errcode = 'insufficient_privilege';
  end if;

  ---------------------------------------------------------------------------
  -- 3 · Le compteur ne baisse QUE lors d'un changement de mois.
  --
  -- C'est la règle qui permet de poser ce verrou SANS connaître le corps de
  -- `increment_ai_usage` — fonction écrite directement dans Supabase, absente
  -- de ce dépôt. Qu'elle soit SECURITY DEFINER (exemptée par `current_user`
  -- plus haut) ou SECURITY INVOKER (elle arrive ici comme `authenticated`),
  -- elle ne fait jamais que deux choses : incrémenter, ou repartir de zéro en
  -- changeant de mois. Les deux passent. Toute autre baisse est refusée.
  --
  -- Le mois est tronqué en UTC pour coller exactement à getUTCMonth() de
  -- lib/ai-usage.ts : sur un décalage de fuseau, la base et l'application
  -- doivent voir le même mois, sinon l'une autoriserait ce que l'autre
  -- considère comme un mois différent.
  ---------------------------------------------------------------------------
  if coalesce(new.ai_replies_count, 0) < coalesce(old.ai_replies_count, 0) then
    ancien_mois  := date_trunc('month', (old.ai_replies_reset_at::timestamptz) at time zone 'UTC');
    nouveau_mois := date_trunc('month', (new.ai_replies_reset_at::timestamptz) at time zone 'UTC');

    if ancien_mois is null or nouveau_mois is null or ancien_mois = nouveau_mois then
      raise exception
        'profiles.ai_replies_count ne peut baisser que lors du changement de mois (% -> %)',
        old.ai_replies_count, new.ai_replies_count
        using errcode = 'insufficient_privilege';
    end if;
  end if;

  return new;
end
$$;

drop trigger if exists profiles_facturation_lecture_seule on public.profiles;

create trigger profiles_facturation_lecture_seule
  before update on public.profiles
  for each row
  execute function public.profiles_facturation_lecture_seule();


-- ---------------------------------------------------------------------------
-- À l'INSERT : le forfait repart toujours de 'free'
-- ---------------------------------------------------------------------------
-- `upsert` depuis l'onboarding crée la ligne si elle n'existe pas, et
-- pourrait la créer directement avec plan = 'pro'. Le compteur, lui, n'a pas
-- besoin d'être protégé ici : une ligne neuve part à zéro de toute façon.
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
-- Vérifier que ça marche, depuis l'éditeur SQL de Supabase
-- ---------------------------------------------------------------------------
-- L'éditeur SQL s'exécute en `postgres`, donc exempté : les trois tentatives
-- ci-dessous PASSERAIENT telles quelles. Pour tester réellement, il faut se
-- faire passer pour le rôle du navigateur :
--
--     begin;
--     set local role authenticated;
--     update public.profiles set plan = 'pro' where id = '<un-uuid>';
--     -- attendu : ERROR  profiles.plan est en lecture seule depuis le client
--     rollback;
--
--     begin;
--     set local role authenticated;
--     update public.profiles set ai_replies_count = 0 where id = '<un-uuid>';
--     -- attendu : ERROR  ne peut baisser que lors du changement de mois
--     rollback;
--
--     begin;
--     set local role authenticated;
--     update public.profiles set ai_replies_reset_at = now() - interval '2 months'
--       where id = '<un-uuid>';
--     -- attendu : ERROR  ne peut pas reculer
--     rollback;
--
-- Et que le chemin légitime passe toujours — à lancer en `postgres`, donc
-- sans `set role`, exactement comme le font les routes serveur :
--
--     select public.increment_ai_usage(1, current_date);
--     select plan, ai_replies_count, ai_replies_reset_at
--       from public.profiles where id = auth.uid();
