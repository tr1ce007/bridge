-- THE BRIDGE: initial schema, row level security and helper functions.
-- Apply with the Supabase CLI (`supabase db push`) or paste into the SQL editor.
-- Notes:
--  * Client-created ids (sessions, reports, journal) are text so the app can
--    create them offline in local mode and keep the same ids later.
--  * saved_* and experiment_completions have no foreign key to the content
--    tables on purpose: content may be served from the bundled JSON files.
--  * ai_failures and analytics_events have no insert policy: only the service
--    role (which bypasses RLS) can write to them. They never hold a user id.

-- ---------------------------------------------------------------- profiles

create table public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  display_name text,
  role text not null default 'user' check (role in ('user', 'moderator', 'admin')),
  created_at timestamptz not null default now()
);

create table public.user_preferences (
  user_id uuid primary key references auth.users (id) on delete cascade,
  memory_consent boolean not null default false,
  locale text check (locale in ('ru', 'kk', 'en')),
  updated_at timestamptz not null default now()
);

-- ---------------------------------------------------------------- helper functions

-- Security definer so policies can ask "is this user staff?" without recursing
-- into the profiles policies.
create or replace function public.is_staff()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.profiles
    where id = auth.uid() and role in ('moderator', 'admin')
  );
$$;

create or replace function public.is_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.profiles
    where id = auth.uid() and role = 'admin'
  );
$$;

-- Create a profile (and default preferences) for every new auth user.
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, display_name)
  values (new.id, coalesce(new.raw_user_meta_data ->> 'name', split_part(new.email, '@', 1)))
  on conflict (id) do nothing;
  insert into public.user_preferences (user_id)
  values (new.id)
  on conflict (user_id) do nothing;
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- ---------------------------------------------------------------- questionnaire and reports

create table public.questionnaire_sessions (
  id text primary key,
  user_id uuid not null references auth.users (id) on delete cascade,
  current_id text,
  started_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index questionnaire_sessions_user_idx on public.questionnaire_sessions (user_id, updated_at desc);

create table public.answers (
  session_id text not null references public.questionnaire_sessions (id) on delete cascade,
  question_id text not null,
  value jsonb not null,
  skipped boolean not null default false,
  position integer not null default 0,
  primary key (session_id, question_id)
);

create table public.discovery_reports (
  id text primary key,
  user_id uuid not null references auth.users (id) on delete cascade,
  locale text not null check (locale in ('ru', 'kk', 'en')),
  demo boolean not null default false,
  data jsonb not null,
  created_at timestamptz not null default now()
);
create index discovery_reports_user_idx on public.discovery_reports (user_id, created_at desc);

-- ---------------------------------------------------------------- stories

create table public.stories (
  id text primary key default gen_random_uuid()::text,
  kind text not null check (kind in ('verified', 'documented', 'user', 'demo')),
  status text not null default 'pending' check (status in ('pending', 'approved', 'rejected')),
  lang text not null check (lang in ('ru', 'kk', 'en')),
  author_id uuid references auth.users (id) on delete set null,
  source_url text,
  source_name text,
  attribution jsonb not null default '{}'::jsonb,
  published_at text,
  -- title, before, challenges, turningPoint, actions, now, advice (each {ru,kk,en} or original language only)
  content jsonb not null,
  -- {start, interests, fears, education, challenges, motives, decisions, transitions}: string arrays
  tags jsonb not null default '{}'::jsonb,
  incomplete jsonb not null default '[]'::jsonb,
  reviewed_by uuid references auth.users (id) on delete set null,
  reviewed_at timestamptz,
  created_at timestamptz not null default now()
);
create index stories_status_idx on public.stories (status);

create table public.story_sources (
  id uuid primary key default gen_random_uuid(),
  story_id text not null references public.stories (id) on delete cascade,
  url text not null,
  name text,
  checked_at timestamptz,
  note text
);
create index story_sources_story_idx on public.story_sources (story_id);

create table public.saved_stories (
  user_id uuid not null references auth.users (id) on delete cascade,
  story_id text not null,
  created_at timestamptz not null default now(),
  primary key (user_id, story_id)
);

-- ---------------------------------------------------------------- experiments

create table public.experiments (
  id text primary key,
  direction text not null,
  difficulty text not null check (difficulty in ('easy', 'medium', 'hard')),
  -- title, steps, timeEstimate, resources, outcome, reflection (each {ru,kk,en})
  content jsonb not null,
  published boolean not null default true,
  created_at timestamptz not null default now()
);

create table public.experiment_completions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  experiment_id text not null,
  rating smallint not null check (rating between 1 and 5),
  enjoyed_process boolean not null,
  reflection text not null default '',
  completed_at timestamptz not null default now(),
  unique (user_id, experiment_id)
);

-- ---------------------------------------------------------------- opportunities

create table public.opportunities (
  id text primary key,
  name text not null,
  kind text not null check (kind in ('scholarship', 'exchange', 'volunteering', 'course')),
  levels text[] not null default '{any}',
  description jsonb not null,
  eligibility jsonb not null,
  url text not null,
  -- only a deadline checked on the official site; otherwise null
  deadline date,
  verified_at date,
  status text not null default 'unverified' check (status in ('verified', 'unverified', 'outdated')),
  created_at timestamptz not null default now()
);

create table public.saved_opportunities (
  user_id uuid not null references auth.users (id) on delete cascade,
  opportunity_id text not null,
  created_at timestamptz not null default now(),
  primary key (user_id, opportunity_id)
);

-- ---------------------------------------------------------------- dashboard

create table public.roadmaps (
  user_id uuid primary key references auth.users (id) on delete cascade,
  data jsonb not null,
  updated_at timestamptz not null default now()
);

create table public.journal_entries (
  id text primary key,
  user_id uuid not null references auth.users (id) on delete cascade,
  text text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz
);
create index journal_entries_user_idx on public.journal_entries (user_id, created_at desc);

-- ---------------------------------------------------------------- chat

create table public.conversations (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  title text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index conversations_user_idx on public.conversations (user_id, updated_at desc);

create table public.messages (
  id uuid primary key default gen_random_uuid(),
  conversation_id uuid not null references public.conversations (id) on delete cascade,
  role text not null check (role in ('user', 'assistant')),
  content text not null,
  created_at timestamptz not null default now()
);
create index messages_conversation_idx on public.messages (conversation_id, created_at);

-- ---------------------------------------------------------------- moderation and operations

create table public.content_reports (
  id uuid primary key default gen_random_uuid(),
  reporter_id uuid references auth.users (id) on delete set null,
  target_kind text not null check (target_kind in ('story', 'opportunity', 'experiment')),
  target_id text not null,
  reason text not null,
  status text not null default 'open' check (status in ('open', 'resolved', 'dismissed')),
  created_at timestamptz not null default now(),
  resolved_by uuid references auth.users (id) on delete set null,
  resolved_at timestamptz
);

-- No user id: failures and analytics must not be traceable to a person.
create table public.ai_failures (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  provider text,
  kind text not null,
  message text,
  locale text
);

create table public.analytics_events (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  name text not null,
  props jsonb not null default '{}'::jsonb,
  locale text
);

-- ---------------------------------------------------------------- row level security

alter table public.profiles enable row level security;
alter table public.user_preferences enable row level security;
alter table public.questionnaire_sessions enable row level security;
alter table public.answers enable row level security;
alter table public.discovery_reports enable row level security;
alter table public.stories enable row level security;
alter table public.story_sources enable row level security;
alter table public.saved_stories enable row level security;
alter table public.experiments enable row level security;
alter table public.experiment_completions enable row level security;
alter table public.opportunities enable row level security;
alter table public.saved_opportunities enable row level security;
alter table public.roadmaps enable row level security;
alter table public.journal_entries enable row level security;
alter table public.conversations enable row level security;
alter table public.messages enable row level security;
alter table public.content_reports enable row level security;
alter table public.ai_failures enable row level security;
alter table public.analytics_events enable row level security;

-- profiles: own row (role cannot be changed by the user); admins see and edit all
create policy profiles_select_own on public.profiles for select to authenticated
  using (id = auth.uid() or public.is_admin());
create policy profiles_update_own on public.profiles for update to authenticated
  using (id = auth.uid())
  with check (id = auth.uid() and role = (select p.role from public.profiles p where p.id = auth.uid()));
create policy profiles_update_admin on public.profiles for update to authenticated
  using (public.is_admin()) with check (public.is_admin());

-- personal tables: owner only
create policy user_preferences_owner on public.user_preferences for all to authenticated
  using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy questionnaire_sessions_owner on public.questionnaire_sessions for all to authenticated
  using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy answers_owner on public.answers for all to authenticated
  using (exists (select 1 from public.questionnaire_sessions s where s.id = session_id and s.user_id = auth.uid()))
  with check (exists (select 1 from public.questionnaire_sessions s where s.id = session_id and s.user_id = auth.uid()));
create policy discovery_reports_owner on public.discovery_reports for all to authenticated
  using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy saved_stories_owner on public.saved_stories for all to authenticated
  using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy saved_opportunities_owner on public.saved_opportunities for all to authenticated
  using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy experiment_completions_owner on public.experiment_completions for all to authenticated
  using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy roadmaps_owner on public.roadmaps for all to authenticated
  using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy journal_entries_owner on public.journal_entries for all to authenticated
  using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy conversations_owner on public.conversations for all to authenticated
  using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy messages_owner on public.messages for all to authenticated
  using (exists (select 1 from public.conversations c where c.id = conversation_id and c.user_id = auth.uid()))
  with check (exists (select 1 from public.conversations c where c.id = conversation_id and c.user_id = auth.uid()));

-- stories: public read when approved; authors see their own; staff see all
create policy stories_select on public.stories for select to anon, authenticated
  using (status = 'approved' or author_id = auth.uid() or public.is_staff());
create policy stories_insert_own on public.stories for insert to authenticated
  with check (author_id = auth.uid() and kind = 'user' and status = 'pending');
create policy stories_update_staff on public.stories for update to authenticated
  using (public.is_staff()) with check (public.is_staff());
create policy stories_delete on public.stories for delete to authenticated
  using (author_id = auth.uid() or public.is_staff());

create policy story_sources_select on public.story_sources for select to anon, authenticated
  using (
    public.is_staff()
    or exists (select 1 from public.stories s where s.id = story_id and s.status = 'approved')
  );
create policy story_sources_write_staff on public.story_sources for all to authenticated
  using (public.is_staff()) with check (public.is_staff());

-- experiments: public read of published rows; staff manage
create policy experiments_select on public.experiments for select to anon, authenticated
  using (published or public.is_staff());
create policy experiments_write_staff on public.experiments for all to authenticated
  using (public.is_staff()) with check (public.is_staff());

-- opportunities: public read unless outdated; staff manage
create policy opportunities_select on public.opportunities for select to anon, authenticated
  using (status <> 'outdated' or public.is_staff());
create policy opportunities_write_staff on public.opportunities for all to authenticated
  using (public.is_staff()) with check (public.is_staff());

-- content reports: anyone may file one; only staff read and resolve
create policy content_reports_insert on public.content_reports for insert to anon, authenticated
  with check (reporter_id is null or reporter_id = auth.uid());
create policy content_reports_select_staff on public.content_reports for select to authenticated
  using (public.is_staff());
create policy content_reports_update_staff on public.content_reports for update to authenticated
  using (public.is_staff()) with check (public.is_staff());

-- ai_failures / analytics_events: staff read; NO insert policy = service role only
create policy ai_failures_select_staff on public.ai_failures for select to authenticated
  using (public.is_staff());
create policy analytics_events_select_staff on public.analytics_events for select to authenticated
  using (public.is_staff());
