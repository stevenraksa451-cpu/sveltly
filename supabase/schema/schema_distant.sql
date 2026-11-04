-- Schéma public de Sveltly, extrait le 2026-11-04 20:50
-- Généré par supabase/schema/EXTRAIRE_LE_SCHEMA.sql — ne pas éditer à la main.

-- ─────────────────────────────────────────────────────────────
-- TABLE public.calendar_accounts
-- ─────────────────────────────────────────────────────────────
CREATE TABLE public.calendar_accounts (
  id uuid NOT NULL DEFAULT uuid_generate_v4(),
  user_id uuid NOT NULL,
  provider text NOT NULL DEFAULT 'google'::text,
  email text,
  access_token text,
  refresh_token text,
  is_connected boolean NOT NULL DEFAULT true,
  created_at timestamp with time zone DEFAULT now()
);
ALTER TABLE public.calendar_accounts ENABLE ROW LEVEL SECURITY;

ALTER TABLE public.calendar_accounts ADD CONSTRAINT calendar_accounts_user_id_provider_key UNIQUE (user_id, provider);
ALTER TABLE public.calendar_accounts ADD CONSTRAINT calendar_accounts_pkey PRIMARY KEY (id);
ALTER TABLE public.calendar_accounts ADD CONSTRAINT calendar_accounts_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;

CREATE POLICY "Users manage own calendar accounts" ON public.calendar_accounts AS PERMISSIVE FOR ALL TO PUBLIC
  USING ((auth.uid() = user_id));

-- ─────────────────────────────────────────────────────────────
-- TABLE public.calendar_events
-- ─────────────────────────────────────────────────────────────
CREATE TABLE public.calendar_events (
  id uuid NOT NULL DEFAULT uuid_generate_v4(),
  user_id uuid NOT NULL,
  from_email_id text,
  title text NOT NULL,
  date date NOT NULL,
  start_time time without time zone NOT NULL,
  end_time time without time zone NOT NULL,
  description text,
  color text DEFAULT '#3B82F6'::text,
  created_at timestamp with time zone DEFAULT now(),
  google_event_id text,
  priority text NOT NULL DEFAULT 'normal'::text,
  origin text NOT NULL DEFAULT 'inflo'::text,
  has_attendees boolean NOT NULL DEFAULT false,
  locked boolean NOT NULL DEFAULT false,
  google_sync_pending boolean NOT NULL DEFAULT false
);
ALTER TABLE public.calendar_events ENABLE ROW LEVEL SECURITY;

ALTER TABLE public.calendar_events ADD CONSTRAINT calendar_events_user_email_unique UNIQUE (user_id, from_email_id);
ALTER TABLE public.calendar_events ADD CONSTRAINT calendar_events_pkey PRIMARY KEY (id);
ALTER TABLE public.calendar_events ADD CONSTRAINT calendar_events_user_id_fkey FOREIGN KEY (user_id) REFERENCES profiles(id) ON DELETE CASCADE;
ALTER TABLE public.calendar_events ADD CONSTRAINT calendar_events_origin_check CHECK ((origin = ANY (ARRAY['inflo'::text, 'google_import'::text])));
ALTER TABLE public.calendar_events ADD CONSTRAINT calendar_events_priority_check CHECK ((priority = ANY (ARRAY['urgent'::text, 'important'::text, 'normal'::text])));

CREATE UNIQUE INDEX calendar_events_email_unique ON public.calendar_events USING btree (user_id, from_email_id) WHERE (from_email_id IS NOT NULL);
CREATE INDEX idx_calendar_events_user_date ON public.calendar_events USING btree (user_id, date);

CREATE POLICY "Users manage own events" ON public.calendar_events AS PERMISSIVE FOR ALL TO PUBLIC
  USING ((( SELECT auth.uid() AS uid) = user_id));

-- ─────────────────────────────────────────────────────────────
-- TABLE public.contacts
-- ─────────────────────────────────────────────────────────────
CREATE TABLE public.contacts (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  email text NOT NULL,
  reply_tone text,
  created_at timestamp with time zone DEFAULT now()
);
ALTER TABLE public.contacts ENABLE ROW LEVEL SECURITY;

ALTER TABLE public.contacts ADD CONSTRAINT contacts_user_id_email_key UNIQUE (user_id, email);
ALTER TABLE public.contacts ADD CONSTRAINT contacts_pkey PRIMARY KEY (id);
ALTER TABLE public.contacts ADD CONSTRAINT contacts_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;
ALTER TABLE public.contacts ADD CONSTRAINT contacts_reply_tone_check CHECK ((reply_tone = ANY (ARRAY['professional'::text, 'formal'::text, 'casual'::text])));

CREATE INDEX idx_contacts_user_id ON public.contacts USING btree (user_id);

CREATE POLICY "Users manage own contacts" ON public.contacts AS PERMISSIVE FOR ALL TO PUBLIC
  USING ((( SELECT auth.uid() AS uid) = user_id));

-- ─────────────────────────────────────────────────────────────
-- TABLE public.email_analyses
-- ─────────────────────────────────────────────────────────────
CREATE TABLE public.email_analyses (
  user_id uuid NOT NULL,
  email_id text NOT NULL,
  priority text,
  email_type text,
  daily_summary text,
  key_points jsonb,
  ai_reply text,
  has_event boolean DEFAULT false,
  event_title text,
  event_date text,
  event_start_time text,
  event_end_time text,
  has_action boolean DEFAULT false,
  action_title text,
  action_priority text,
  action_category text,
  action_due_date text,
  reply_tone text,
  reply_language text,
  analysis_version integer NOT NULL DEFAULT 1,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  analyzed_at timestamp with time zone DEFAULT now()
);
ALTER TABLE public.email_analyses ENABLE ROW LEVEL SECURITY;

ALTER TABLE public.email_analyses ADD CONSTRAINT email_analyses_pkey PRIMARY KEY (user_id, email_id);
ALTER TABLE public.email_analyses ADD CONSTRAINT email_analyses_user_id_fkey FOREIGN KEY (user_id) REFERENCES profiles(id) ON DELETE CASCADE;

CREATE POLICY email_analyses_delete_own ON public.email_analyses AS PERMISSIVE FOR DELETE TO PUBLIC
  USING ((auth.uid() = user_id));
CREATE POLICY email_analyses_insert_own ON public.email_analyses AS PERMISSIVE FOR INSERT TO PUBLIC
  WITH CHECK ((auth.uid() = user_id));
CREATE POLICY email_analyses_select_own ON public.email_analyses AS PERMISSIVE FOR SELECT TO PUBLIC
  USING ((auth.uid() = user_id));
CREATE POLICY email_analyses_update_own ON public.email_analyses AS PERMISSIVE FOR UPDATE TO PUBLIC
  USING ((auth.uid() = user_id))
  WITH CHECK ((auth.uid() = user_id));

-- ─────────────────────────────────────────────────────────────
-- TABLE public.emails
-- ─────────────────────────────────────────────────────────────
CREATE TABLE public.emails (
  id uuid NOT NULL DEFAULT uuid_generate_v4(),
  user_id uuid NOT NULL,
  mailbox_id uuid,
  external_id text,
  subject text NOT NULL,
  sender_name text,
  sender_email text NOT NULL,
  body text,
  preview text,
  received_at timestamp with time zone NOT NULL,
  is_read boolean DEFAULT false,
  is_archived boolean DEFAULT false,
  priority text DEFAULT 'normal'::text,
  tags text[] DEFAULT '{}'::text[],
  ai_draft_reply text,
  has_ai_reply boolean DEFAULT false,
  calendar_event_detected boolean DEFAULT false,
  created_at timestamp with time zone DEFAULT now(),
  event_title text,
  event_date date,
  event_start_time time without time zone,
  event_end_time time without time zone,
  event_scheduled boolean DEFAULT false
);
ALTER TABLE public.emails ENABLE ROW LEVEL SECURITY;

ALTER TABLE public.emails ADD CONSTRAINT emails_pkey PRIMARY KEY (id);
ALTER TABLE public.emails ADD CONSTRAINT emails_mailbox_id_fkey FOREIGN KEY (mailbox_id) REFERENCES mailboxes(id) ON DELETE CASCADE;
ALTER TABLE public.emails ADD CONSTRAINT emails_user_id_fkey FOREIGN KEY (user_id) REFERENCES profiles(id) ON DELETE CASCADE;
ALTER TABLE public.emails ADD CONSTRAINT emails_priority_check CHECK ((priority = ANY (ARRAY['urgent'::text, 'important'::text, 'normal'::text])));

CREATE INDEX idx_emails_is_read ON public.emails USING btree (is_read);
CREATE INDEX idx_emails_priority ON public.emails USING btree (priority);
CREATE INDEX idx_emails_received_at ON public.emails USING btree (received_at DESC);
CREATE INDEX idx_emails_user_id ON public.emails USING btree (user_id);

CREATE POLICY "Users manage own emails" ON public.emails AS PERMISSIVE FOR ALL TO PUBLIC
  USING ((( SELECT auth.uid() AS uid) = user_id));

-- ─────────────────────────────────────────────────────────────
-- TABLE public.mailboxes
-- ─────────────────────────────────────────────────────────────
CREATE TABLE public.mailboxes (
  id uuid NOT NULL DEFAULT uuid_generate_v4(),
  user_id uuid NOT NULL,
  provider text NOT NULL,
  email text NOT NULL,
  label text,
  access_token text,
  refresh_token text,
  is_connected boolean DEFAULT true,
  last_sync timestamp with time zone,
  created_at timestamp with time zone DEFAULT now(),
  history_id text
);
ALTER TABLE public.mailboxes ENABLE ROW LEVEL SECURITY;

ALTER TABLE public.mailboxes ADD CONSTRAINT mailboxes_user_id_email_key UNIQUE (user_id, email);
ALTER TABLE public.mailboxes ADD CONSTRAINT mailboxes_pkey PRIMARY KEY (id);
ALTER TABLE public.mailboxes ADD CONSTRAINT mailboxes_user_id_fkey FOREIGN KEY (user_id) REFERENCES profiles(id) ON DELETE CASCADE;
ALTER TABLE public.mailboxes ADD CONSTRAINT mailboxes_provider_check CHECK ((provider = ANY (ARRAY['gmail'::text, 'outlook'::text, 'other'::text])));

CREATE POLICY "Users manage own mailboxes" ON public.mailboxes AS PERMISSIVE FOR ALL TO PUBLIC
  USING ((( SELECT auth.uid() AS uid) = user_id));

-- ─────────────────────────────────────────────────────────────
-- TABLE public.profiles
-- ─────────────────────────────────────────────────────────────
CREATE TABLE public.profiles (
  id uuid NOT NULL,
  full_name text,
  avatar_url text,
  reply_tone text DEFAULT 'professional'::text,
  theme text DEFAULT 'light'::text,
  notifs_enabled boolean DEFAULT true,
  created_at timestamp with time zone DEFAULT now(),
  display_name text,
  onboarded boolean DEFAULT false,
  auto_schedule boolean DEFAULT false,
  timezone text DEFAULT 'Europe/Paris'::text,
  default_event_duration integer DEFAULT 30,
  work_start time without time zone DEFAULT '09:00:00'::time without time zone,
  work_end time without time zone DEFAULT '18:00:00'::time without time zone,
  buffer_minutes integer DEFAULT 15,
  auto_decline_outside_hours boolean DEFAULT false,
  calendar_provider text,
  email_digest_enabled boolean DEFAULT true,
  urgent_only_notifs boolean DEFAULT false,
  digest_send_hour integer DEFAULT 8,
  plan text DEFAULT 'free'::text,
  ai_replies_count integer NOT NULL DEFAULT 0,
  ai_replies_reset_at date NOT NULL DEFAULT CURRENT_DATE,
  reply_language text DEFAULT 'fr'::text,
  auto_tasks boolean NOT NULL DEFAULT true,
  calendar_auto_sync boolean NOT NULL DEFAULT true,
  auto_archive boolean DEFAULT false
);
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

ALTER TABLE public.profiles ADD CONSTRAINT profiles_pkey PRIMARY KEY (id);
ALTER TABLE public.profiles ADD CONSTRAINT profiles_id_fkey FOREIGN KEY (id) REFERENCES auth.users(id) ON DELETE CASCADE;
ALTER TABLE public.profiles ADD CONSTRAINT profiles_digest_send_hour_check CHECK (((digest_send_hour >= 0) AND (digest_send_hour <= 23)));
ALTER TABLE public.profiles ADD CONSTRAINT profiles_reply_language_check CHECK ((reply_language = ANY (ARRAY['fr'::text, 'en'::text, 'auto'::text])));
ALTER TABLE public.profiles ADD CONSTRAINT profiles_reply_tone_check CHECK ((reply_tone = ANY (ARRAY['professional'::text, 'formal'::text, 'casual'::text])));
ALTER TABLE public.profiles ADD CONSTRAINT profiles_theme_check CHECK ((theme = ANY (ARRAY['light'::text, 'dark'::text, 'system'::text])));

CREATE POLICY "Users can update own profile" ON public.profiles AS PERMISSIVE FOR UPDATE TO PUBLIC
  USING ((( SELECT auth.uid() AS uid) = id));
CREATE POLICY "Users can view own profile" ON public.profiles AS PERMISSIVE FOR SELECT TO PUBLIC
  USING ((( SELECT auth.uid() AS uid) = id));

-- ─────────────────────────────────────────────────────────────
-- TABLE public.reply_history
-- ─────────────────────────────────────────────────────────────
CREATE TABLE public.reply_history (
  id uuid NOT NULL DEFAULT uuid_generate_v4(),
  user_id uuid NOT NULL,
  email_id uuid,
  body text NOT NULL,
  sent_at timestamp with time zone DEFAULT now(),
  was_ai boolean DEFAULT true
);
ALTER TABLE public.reply_history ENABLE ROW LEVEL SECURITY;

ALTER TABLE public.reply_history ADD CONSTRAINT reply_history_pkey PRIMARY KEY (id);
ALTER TABLE public.reply_history ADD CONSTRAINT reply_history_email_id_fkey FOREIGN KEY (email_id) REFERENCES emails(id) ON DELETE CASCADE;
ALTER TABLE public.reply_history ADD CONSTRAINT reply_history_user_id_fkey FOREIGN KEY (user_id) REFERENCES profiles(id) ON DELETE CASCADE;

CREATE POLICY "Users manage own replies" ON public.reply_history AS PERMISSIVE FOR ALL TO PUBLIC
  USING ((( SELECT auth.uid() AS uid) = user_id));

-- ─────────────────────────────────────────────────────────────
-- TABLE public.tasks
-- ─────────────────────────────────────────────────────────────
CREATE TABLE public.tasks (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  title text NOT NULL,
  category text,
  due_date date,
  completed boolean DEFAULT false,
  created_at timestamp with time zone DEFAULT now(),
  priority text DEFAULT 'medium'::text,
  "position" integer DEFAULT 0,
  from_email_id text,
  completed_at timestamp with time zone,
  source_label text
);
ALTER TABLE public.tasks ENABLE ROW LEVEL SECURITY;

ALTER TABLE public.tasks ADD CONSTRAINT tasks_user_email_unique UNIQUE (user_id, from_email_id);
ALTER TABLE public.tasks ADD CONSTRAINT tasks_pkey PRIMARY KEY (id);
ALTER TABLE public.tasks ADD CONSTRAINT tasks_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id);

CREATE INDEX idx_tasks_completed_at ON public.tasks USING btree (user_id, completed_at);
CREATE INDEX idx_tasks_user_category ON public.tasks USING btree (user_id, category);

CREATE POLICY "Users manage their own tasks" ON public.tasks AS PERMISSIVE FOR ALL TO PUBLIC
  USING ((( SELECT auth.uid() AS uid) = user_id));

-- ─────────────────────────────────────────────────────────────
-- FONCTION public.handle_new_user   [SECURITY DEFINER]
-- ─────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.handle_new_user()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'pg_temp'
AS $function$
begin
  insert into public.profiles (id, full_name)
  values (new.id, new.raw_user_meta_data->>'full_name');
  return new;
end;
$function$
;

-- ─────────────────────────────────────────────────────────────
-- FONCTION public.increment_ai_usage   [SECURITY DEFINER]
-- ─────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.increment_ai_usage(p_n integer, p_today date)
 RETURNS TABLE(new_count integer, new_reset_at date)
 LANGUAGE sql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  update public.profiles
  set
    ai_replies_count = case
      when date_trunc('month', ai_replies_reset_at) = date_trunc('month', p_today)
        then ai_replies_count + p_n
      else p_n
    end,
    ai_replies_reset_at = case
      when date_trunc('month', ai_replies_reset_at) = date_trunc('month', p_today)
        then ai_replies_reset_at
      else p_today
    end
  where id = (select auth.uid())
  returning ai_replies_count, ai_replies_reset_at;
$function$
;

-- ─────────────────────────────────────────────────────────────
-- FONCTION public.profiles_facturation_lecture_seule   [SECURITY INVOKER]
-- ─────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.profiles_facturation_lecture_seule()
 RETURNS trigger
 LANGUAGE plpgsql
 SET search_path TO 'public'
AS $function$
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
$function$
;

-- ─────────────────────────────────────────────────────────────
-- FONCTION public.profiles_insert_plan_par_defaut   [SECURITY INVOKER]
-- ─────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.profiles_insert_plan_par_defaut()
 RETURNS trigger
 LANGUAGE plpgsql
 SET search_path TO 'public'
AS $function$
begin
  if current_user = 'authenticated' and new.plan is distinct from 'free' then
    new.plan := 'free';
  end if;
  return new;
end
$function$
;

CREATE TRIGGER profiles_facturation_lecture_seule BEFORE UPDATE ON public.profiles FOR EACH ROW EXECUTE FUNCTION profiles_facturation_lecture_seule();
CREATE TRIGGER profiles_insert_plan_par_defaut BEFORE INSERT ON public.profiles FOR EACH ROW EXECUTE FUNCTION profiles_insert_plan_par_defaut();