-- ============================================================
-- SVELTLY — SCHEMA SUPABASE
-- Exécuter dans l'éditeur SQL de Supabase
-- ============================================================

-- Extension UUID
create extension if not exists "uuid-ossp";

-- ============================================================
-- TABLE: profiles
-- Complète auth.users avec les infos utilisateur
-- ============================================================
create table public.profiles (
  id          uuid references auth.users(id) on delete cascade primary key,
  full_name   text,
  display_name text,
  avatar_url  text,
  reply_tone  text default 'professional' check (reply_tone in ('professional','formal','casual')),
  theme       text default 'light' check (theme in ('light','dark','system')),
  notifs_enabled boolean default true,
  onboarded   boolean default false,
  created_at  timestamptz default now()
);

-- Trigger : crée automatiquement un profil à l'inscription
create or replace function public.handle_new_user()
returns trigger as $$
begin
  insert into public.profiles (id, full_name)
  values (new.id, new.raw_user_meta_data->>'full_name');
  return new;
end;
$$ language plpgsql security definer;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

-- ============================================================
-- TABLE: mailboxes
-- Boîtes mail connectées par utilisateur
-- ============================================================
create table public.mailboxes (
  id           uuid default uuid_generate_v4() primary key,
  user_id      uuid references public.profiles(id) on delete cascade not null,
  provider     text not null check (provider in ('gmail','outlook','other')),
  email        text not null,
  label        text,
  access_token text,       -- Chiffré côté app
  refresh_token text,      -- Chiffré côté app
  is_connected boolean default true,
  last_sync    timestamptz,
  created_at   timestamptz default now(),
  -- Point de repère Gmail History API pour la synchro incrémentale (voir
  -- app/api/emails/route.ts) — null tant qu'aucune synchro complète n'a
  -- encore amorcé ce repère.
  history_id   text
);

-- ============================================================
-- TABLE: emails
-- Emails récupérés et classés par l'IA
-- ============================================================
create table public.emails (
  id                   uuid default uuid_generate_v4() primary key,
  user_id              uuid references public.profiles(id) on delete cascade not null,
  mailbox_id           uuid references public.mailboxes(id) on delete cascade,
  external_id          text,          -- ID dans Gmail/Outlook
  subject              text not null,
  sender_name          text,
  sender_email         text not null,
  body                 text,
  preview              text,
  received_at          timestamptz not null,
  is_read              boolean default false,
  is_archived          boolean default false,
  priority             text default 'normal' check (priority in ('urgent','important','normal')),
  tags                 text[] default '{}',
  ai_draft_reply       text,          -- Brouillon généré par l'IA
  has_ai_reply         boolean default false,
  calendar_event_detected boolean default false,
  created_at           timestamptz default now()
);

create index idx_emails_user_id on public.emails(user_id);
create index idx_emails_priority on public.emails(priority);
create index idx_emails_is_read on public.emails(is_read);
create index idx_emails_received_at on public.emails(received_at desc);

-- ============================================================
-- TABLE: calendar_events
-- Événements liés aux emails ou créés manuellement
-- ============================================================
create table public.calendar_events (
  id           uuid default uuid_generate_v4() primary key,
  user_id      uuid references public.profiles(id) on delete cascade not null,
  -- text, pas uuid/FK vers public.emails : les emails ne sont jamais
  -- persistés dans Postgres (ils vivent côté Gmail API + cache applicatif en
  -- mémoire, voir lib/email-cache.ts) — from_email_id stocke directement
  -- l'id de message Gmail, une chaîne quelconque, pas une clé de public.emails.
  from_email_id text,
  title        text not null,
  date         date not null,
  start_time   time not null,
  end_time     time not null,
  description  text,
  color        text default '#3B82F6',
  created_at   timestamptz default now()
);

create index idx_calendar_events_user_date on public.calendar_events(user_id, date);

-- ============================================================
-- TABLE: tasks
-- Tâches créées manuellement ou depuis un email
-- ============================================================
create table public.tasks (
  id          uuid default uuid_generate_v4() primary key,
  user_id     uuid references public.profiles(id) on delete cascade not null,
  title       text not null,
  category    text,
  due_date    date,
  priority    text default 'medium' check (priority in ('urgent','high','medium','low')),
  completed   boolean default false,
  position    integer default 0,
  created_at  timestamptz default now(),
  -- text, même raison que calendar_events.from_email_id ci-dessus (pas de
  -- table public.emails persistée). Unique avec user_id (contrainte plus
  -- bas) pour qu'un même email ne génère jamais deux tâches (upsert
  -- onConflict côté app/api/emails/route.ts).
  from_email_id text,
  unique (user_id, from_email_id)
);

create index idx_tasks_user_id on public.tasks(user_id);

-- ============================================================
-- TABLE: reply_history
-- Historique des réponses envoyées
-- ============================================================
create table public.reply_history (
  id         uuid default uuid_generate_v4() primary key,
  user_id    uuid references public.profiles(id) on delete cascade not null,
  email_id   uuid references public.emails(id) on delete cascade,
  body       text not null,
  sent_at    timestamptz default now(),
  was_ai     boolean default true    -- Vrai si réponse IA, faux si manuelle
);

-- ============================================================
-- ROW LEVEL SECURITY (RLS)
-- Chaque utilisateur ne voit que ses propres données
-- ============================================================

alter table public.profiles enable row level security;
alter table public.mailboxes enable row level security;
alter table public.emails enable row level security;
alter table public.calendar_events enable row level security;
alter table public.tasks enable row level security;
alter table public.reply_history enable row level security;

-- Profiles
-- (select auth.uid()) plutôt que auth.uid() nu : Postgres n'évalue l'appel
-- qu'une fois par requête au lieu d'une fois par ligne (recommandation
-- Supabase, cf. advisor "auth_rls_initplan").
create policy "Users can view own profile"
  on public.profiles for select using ((select auth.uid()) = id);
create policy "Users can update own profile"
  on public.profiles for update using ((select auth.uid()) = id);

-- Mailboxes
create policy "Users manage own mailboxes"
  on public.mailboxes for all using ((select auth.uid()) = user_id);

-- Emails
create policy "Users manage own emails"
  on public.emails for all using ((select auth.uid()) = user_id);

-- Calendar
create policy "Users manage own events"
  on public.calendar_events for all using ((select auth.uid()) = user_id);

-- Tasks
create policy "Users manage own tasks"
  on public.tasks for all using ((select auth.uid()) = user_id);

-- Reply history
create policy "Users manage own replies"
  on public.reply_history for all using ((select auth.uid()) = user_id);

-- ============================================================
-- MIGRATION : suivi d'usage pour l'application réelle des limites
-- du plan gratuit (jusqu'ici purement décoratives). Idempotent —
-- peut être rejoué sans risque sur une base existante.
-- ============================================================
alter table public.profiles add column if not exists ai_replies_count integer not null default 0;
alter table public.profiles add column if not exists ai_replies_reset_at date not null default current_date;

-- ============================================================
-- MIGRATION : ton de réponse par contact (surcharge de profiles.reply_tone
-- pour un expéditeur précis). Idempotent.
-- ============================================================
create table if not exists public.contacts (
  id          uuid default gen_random_uuid() primary key,
  user_id     uuid references auth.users(id) on delete cascade not null,
  email       text not null,
  reply_tone  text check (reply_tone in ('professional','formal','casual')),
  created_at  timestamptz default now(),
  unique (user_id, email)
);

create index if not exists idx_contacts_user_id on public.contacts(user_id);

alter table public.contacts enable row level security;

drop policy if exists "Users manage own contacts" on public.contacts;
create policy "Users manage own contacts"
  on public.contacts for all using ((select auth.uid()) = user_id);

-- ============================================================
-- MIGRATION : colonnes profiles ajoutées progressivement en production
-- mais jamais reportées ici jusqu'à présent (plan, préférences de
-- planification/notifications, fuseau horaire...) — ce bloc rattrape le
-- schéma déclaratif pour qu'il redevienne la source de vérité réelle de la
-- base. Idempotent, sans effet sur les données existantes.
-- ============================================================
alter table public.profiles add column if not exists plan text not null default 'free' check (plan in ('free','pro'));
alter table public.profiles add column if not exists reply_language text default 'fr';
alter table public.profiles add column if not exists auto_schedule boolean default false;
alter table public.profiles add column if not exists auto_tasks boolean default true;
alter table public.profiles add column if not exists timezone text default 'Europe/Paris';
alter table public.profiles add column if not exists default_event_duration integer default 30;
alter table public.profiles add column if not exists work_start time default '09:00';
alter table public.profiles add column if not exists work_end time default '18:00';
alter table public.profiles add column if not exists buffer_minutes integer default 15;
alter table public.profiles add column if not exists auto_decline_outside_hours boolean default false;
alter table public.profiles add column if not exists calendar_provider text;
alter table public.profiles add column if not exists calendar_auto_sync boolean default true;
alter table public.profiles add column if not exists email_digest_enabled boolean default true;
alter table public.profiles add column if not exists urgent_only_notifs boolean default false;
alter table public.profiles add column if not exists digest_send_hour integer default 8;
-- Archivage automatique (Réglages > IA) : existait déjà comme simple
-- interrupteur visuel dans l'interface, jamais chargé ni sauvegardé, jamais
-- consommé par aucune logique serveur — un réglage entièrement factice
-- malgré sa description explicite ("déplace les emails normaux après 7
-- jours"). Voir app/api/emails/route.ts pour la logique réelle ajoutée.
alter table public.profiles add column if not exists auto_archive boolean default false;

-- ============================================================
-- MIGRATION : table calendar_accounts (connexion Google Calendar Pro,
-- distincte de mailboxes) — existe déjà en production, absente du schéma
-- déclaratif jusqu'ici. Idempotent.
-- ============================================================
create table if not exists public.calendar_accounts (
  id            uuid default uuid_generate_v4() primary key,
  user_id       uuid references public.profiles(id) on delete cascade not null,
  provider      text not null default 'google',
  email         text,
  access_token  text,   -- Chiffré côté app (voir lib/token-crypto.ts)
  refresh_token text,   -- Chiffré côté app
  is_connected  boolean default true,
  created_at    timestamptz default now(),
  unique (user_id, provider)
);

create index if not exists idx_calendar_accounts_user_id on public.calendar_accounts(user_id);

alter table public.calendar_accounts enable row level security;

drop policy if exists "Users manage own calendar accounts" on public.calendar_accounts;
create policy "Users manage own calendar accounts"
  on public.calendar_accounts for all using ((select auth.uid()) = user_id);

-- calendar_events.google_event_id — lien vers l'événement Google Calendar
-- correspondant quand la synchro Pro a copié l'événement (voir
-- /api/calendar/events). Idempotent.
alter table public.calendar_events add column if not exists google_event_id text;

-- Contrainte unique (user_id, from_email_id) — existe déjà en production
-- (utilisée par les upsert onConflict de /api/emails et
-- /api/calendar/schedule-from-email pour qu'un même email ne génère jamais
-- deux événements), absente du schéma déclaratif jusqu'ici. NULL ne viole
-- jamais l'unicité (NULL ≠ NULL en SQL), donc les événements créés
-- manuellement (from_email_id = null) ne sont jamais concernés.
do $$ begin
  if not exists (
    select 1 from pg_constraint where conname = 'calendar_events_user_email_unique'
  ) then
    alter table public.calendar_events
      add constraint calendar_events_user_email_unique unique (user_id, from_email_id);
  end if;
end $$;

-- ============================================================
-- MIGRATION : stockage des tâches terminées — jusqu'ici conservées pour
-- toujours sans horodatage de complétion, donc impossible de ne charger que
-- les tâches terminées récentes (voir hooks/useTasks.ts) : chaque visite de
-- /tasks rapatriait l'historique complet depuis la création du compte.
-- completed_at est posé/retiré par l'app à chaque bascule de `completed`
-- (jamais par la base) — une colonne générée aurait figé la date de
-- complétion la plus récente sans distinguer "jamais terminée" de "re-ouverte".
-- Idempotent.
-- ============================================================
alter table public.tasks add column if not exists completed_at timestamptz;
create index if not exists idx_tasks_completed_at on public.tasks(user_id, completed_at);

-- Rattrape tasks.from_email_id + sa contrainte unique pour une base déjà
-- provisionnée avec l'ancienne définition de la table (sans cette colonne).
-- Idempotent, sans effet sur les données existantes.
alter table public.tasks add column if not exists from_email_id text;
do $$ begin
  if not exists (
    select 1 from pg_constraint where conname = 'tasks_user_email_unique'
  ) then
    alter table public.tasks
      add constraint tasks_user_email_unique unique (user_id, from_email_id);
  end if;
end $$;

-- Rattrape mailboxes.history_id et profiles.display_name/onboarded pour une
-- base déjà provisionnée avec l'ancienne définition de ces tables.
-- Idempotent.
alter table public.mailboxes add column if not exists history_id text;
alter table public.profiles add column if not exists display_name text;
alter table public.profiles add column if not exists onboarded boolean default false;

-- ============================================================
-- MIGRATION : priorité des événements d'agenda + réarrangement de journée
-- (voir lib/scheduling.ts) — jusqu'ici calendar_events n'avait aucune notion
-- de priorité ni de provenance, donc impossible de déterminer automatiquement
-- quel événement doit céder sa place en cas de conflit, ni quels événements
-- ne doivent jamais être déplacés (importés depuis Google, avec invités, ou
-- verrouillés manuellement par l'utilisateur). Idempotent.
-- ============================================================
alter table public.calendar_events add column if not exists priority text not null default 'normal' check (priority in ('urgent','important','normal'));
-- 'google_import' : événement créé directement dans Google Calendar et
-- importé tel quel (voir app/api/calendar/import) — jamais déplacé par le
-- réarrangement automatique, à la différence d'un événement créé par Sveltly.
alter table public.calendar_events add column if not exists origin text not null default 'inflo' check (origin in ('inflo','google_import'));
-- Connu uniquement pour les événements importés depuis Google (Sveltly
-- n'ajoute lui-même jamais d'invités) — un événement avec invités n'est
-- jamais déplacé automatiquement.
alter table public.calendar_events add column if not exists has_attendees boolean not null default false;
-- Verrouillage manuel explicite par l'utilisateur sur un événement précis.
alter table public.calendar_events add column if not exists locked boolean not null default false;
-- true si le dernier déplacement n'a pas pu être répercuté vers Google
-- Calendar (voir lib/google-calendar-sync.ts updateGoogleCalendarEvent) —
-- Supabase reste la source de vérité ; ce flag garde une trace de l'échec
-- pour une resynchronisation ultérieure plutôt que de le faire disparaître
-- silencieusement.
alter table public.calendar_events add column if not exists google_sync_pending boolean not null default false;
