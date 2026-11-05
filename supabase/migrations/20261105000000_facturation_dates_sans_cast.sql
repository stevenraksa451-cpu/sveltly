-- Retire les casts ::timestamptz du déclencheur de facturation.
--
-- LE DÉFAUT, ET IL EST DE MOI
-- La migration 20261022000000 comparait les mois ainsi :
--
--     date_trunc('month', (old.ai_replies_reset_at::timestamptz) at time zone 'UTC')
--
-- Le raisonnement était « tronquer en UTC pour coller à getUTCMonth() de
-- lib/ai-usage.ts ». Il était faux, parce qu'il reposait sur une hypothèse
-- jamais vérifiée : que `ai_replies_reset_at` soit un timestamp.
--
-- C'est une colonne **date**. Une date n'a pas de fuseau. La caster en
-- timestamptz force PostgreSQL à inventer une heure, et il prend celle de la
-- SESSION — ce qui déplace la date, donc parfois le mois. Mesuré :
--
--     date 2026-11-01, session UTC            -> 2026-11-01   (novembre)
--     date 2026-11-01, session Europe/Paris   -> 2026-10-01   (OCTOBRE)
--     date 2026-11-01, sans cast              -> 2026-11-01   (novembre)
--
-- Conséquence si la session n'est pas en UTC : le 1er du mois, le
-- déclencheur voit « mois différent » là où il n'y en a pas — ou l'inverse.
-- Il autoriserait alors une baisse du compteur qu'il doit refuser, ou
-- refuserait la remise à zéro mensuelle légitime.
--
-- Aujourd'hui Supabase tourne en UTC et rien ne diverge. C'est une bombe à
-- retardement, pas une panne : elle attend un changement de `timezone` côté
-- base, ou un pooler configuré autrement.
--
-- LE CORRECTIF EST UNE SUPPRESSION
-- On compare les dates entre elles. `date_trunc('month', <date>)` ne fait
-- intervenir aucun fuseau, et `increment_ai_usage` procède déjà exactement
-- ainsi — les deux lisent enfin le mois de la même façon, ce que la
-- migration précédente croyait faire en ajoutant un cast.
--
-- Idempotente : `create or replace`. Le déclencheur lui-même n'est pas
-- retouché, il pointe déjà sur cette fonction.

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
  -- routes serveur (service_role), administration (postgres), éditeur SQL.
  if current_user <> 'authenticated' then
    return new;
  end if;

  ---------------------------------------------------------------------------
  -- 1 · Le forfait ne bouge jamais depuis le client.
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
  -- lib/ai-usage.ts teste une DIFFÉRENCE de mois, pas un ordre : une date
  -- placée dans un mois passé et une date placée dans un mois futur vident
  -- toutes les deux le quota. Les deux sens doivent être fermés.
  --
  -- Comparaisons de DATE à DATE, sans cast : voir l'en-tête.
  ---------------------------------------------------------------------------
  if old.ai_replies_reset_at is not null then
    if new.ai_replies_reset_at is null then
      raise exception
        'profiles.ai_replies_reset_at ne peut pas être vidée depuis le client'
        using errcode = 'insufficient_privilege';
    end if;

    if new.ai_replies_reset_at < old.ai_replies_reset_at then
      raise exception
        'profiles.ai_replies_reset_at ne peut pas reculer (% -> %)',
        old.ai_replies_reset_at, new.ai_replies_reset_at
        using errcode = 'insufficient_privilege';
    end if;
  end if;

  -- Un jour de marge : le serveur pose la date en UTC, et un client dans un
  -- fuseau en avance ne doit pas se faire refuser une écriture légitime.
  if new.ai_replies_reset_at is not null
     and new.ai_replies_reset_at > ((now() at time zone 'UTC')::date + 1) then
    raise exception
      'profiles.ai_replies_reset_at ne peut pas être placée dans le futur (%)',
      new.ai_replies_reset_at
      using errcode = 'insufficient_privilege';
  end if;

  ---------------------------------------------------------------------------
  -- 3 · Le compteur ne baisse QUE lors d'un changement de mois.
  --
  -- C'est ce qui permet de tenir sans connaître le corps de
  -- `increment_ai_usage` : qu'elle soit SECURITY DEFINER (exemptée par
  -- `current_user`) ou SECURITY INVOKER, elle ne fait jamais que deux choses
  -- — incrémenter, ou repartir de zéro en changeant de mois.
  ---------------------------------------------------------------------------
  if coalesce(new.ai_replies_count, 0) < coalesce(old.ai_replies_count, 0) then
    ancien_mois  := date_trunc('month', old.ai_replies_reset_at);
    nouveau_mois := date_trunc('month', new.ai_replies_reset_at);

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
