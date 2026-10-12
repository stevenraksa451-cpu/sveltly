-- Conserve le RÉSULTAT de l'analyse IA d'un email, pour ne jamais le refaire.
--
-- Avant : le seul cache était une Map en mémoire avec 5 minutes de durée de
-- vie (lib/email-cache.ts). Passé ce délai — ou au premier démarrage à froid
-- d'une instance serverless, donc en pratique presque toujours en production
-- — toute l'analyse était perdue et refaite de zéro auprès de Groq. C'est la
-- raison principale de l'épuisement du budget de 200 000 tokens par jour :
-- les mêmes emails repayaient leur analyse plusieurs fois par jour.
--
-- CE QUI EST STOCKÉ, ET CE QUI NE L'EST PAS
-- Uniquement le RÉSULTAT de l'analyse : classement, résumé, brouillon,
-- rendez-vous et action détectés. Le corps de l'email n'est PAS stocké — il
-- continue d'être relu depuis Gmail à chaque synchro. C'est délibéré :
-- dupliquer durablement le contenu des boîtes mail dans notre base changerait
-- la nature des données conservées, ce qui demande une décision explicite et
-- une mise à jour de la politique de confidentialité.
--
-- reply_tone / reply_language sont mémorisés avec l'analyse : si
-- l'utilisateur change son ton de réponse, le brouillon stocké devient
-- obsolète et l'email doit être réanalysé (voir app/api/emails/route.ts).

create table if not exists public.email_analyses (
  user_id          uuid references public.profiles(id) on delete cascade not null,
  -- id du message côté Gmail. text (pas uuid) : même raison que
  -- tasks.from_email_id — il vient du fournisseur, pas de nous.
  email_id         text not null,

  priority         text,
  email_type       text,
  daily_summary    text,
  key_points       jsonb,
  ai_reply         text,

  has_event        boolean default false,
  event_title      text,
  -- text et non date : ces valeurs transitent telles quelles entre l'IA, le
  -- cache et le client. Les convertir ici ferait échouer toute l'écriture sur
  -- une seule date mal formée, au lieu de dégrader cet email-là uniquement.
  event_date       text,
  event_start_time text,
  event_end_time   text,

  has_action       boolean default false,
  action_title     text,
  action_priority  text,
  action_category  text,
  action_due_date  text,

  -- Réglages utilisés pour produire ce brouillon — voir plus haut.
  reply_tone       text,
  reply_language   text,

  analyzed_at      timestamptz default now(),

  primary key (user_id, email_id)
);

-- Les lectures se font toujours « mes analyses, pour cette liste d'ids ».
create index if not exists idx_email_analyses_user on public.email_analyses(user_id);

alter table public.email_analyses enable row level security;

-- (select auth.uid()) plutôt que auth.uid() nu : Postgres n'évalue l'appel
-- qu'une fois par requête au lieu d'une fois par ligne (même convention que
-- le reste du schéma, cf. advisor Supabase "auth_rls_initplan").
create policy "Users can view own email analyses"
  on public.email_analyses for select using ((select auth.uid()) = user_id);
create policy "Users can insert own email analyses"
  on public.email_analyses for insert with check ((select auth.uid()) = user_id);
create policy "Users can update own email analyses"
  on public.email_analyses for update using ((select auth.uid()) = user_id);
create policy "Users can delete own email analyses"
  on public.email_analyses for delete using ((select auth.uid()) = user_id);
