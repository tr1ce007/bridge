-- Task 8: auth and admin panel.
-- Re-runnable: policies and constraints are dropped (if they exist) before they are recreated,
-- columns use "if not exists". Nothing is deleted.

-- ---------------------------------------------------------------- stories

-- When the author agreed to publication after moderation (set by POST /api/stories).
alter table public.stories add column if not exists consent_at timestamptz;

-- Authors may only insert a plain pending user story: no source, not reviewed, with the time
-- they agreed to publication (POST /api/stories sets consent_at). A minute of tolerance keeps a
-- small clock difference between the web server and the database from refusing a valid insert.
-- Staff set source_url, reviewed_by and reviewed_at when they moderate (stories_update_staff).
drop policy if exists stories_insert_own on public.stories;
create policy stories_insert_own on public.stories for insert to authenticated
  with check (
    author_id = auth.uid()
    and kind = 'user'
    and status = 'pending'
    and source_url is null
    and reviewed_by is null
    and reviewed_at is null
    and consent_at is not null
    and consent_at <= now() + interval '1 minute'
  );

-- Defence in depth for the same rules in the admin panel: addresses are http(s) only and
-- documented / verified stories must have one. NOT VALID = enforced for new and changed rows
-- without re-checking rows that exist already.
alter table public.stories drop constraint if exists stories_source_url_http;
alter table public.stories add constraint stories_source_url_http
  check (source_url is null or source_url ~* '^https?://') not valid;

alter table public.stories drop constraint if exists stories_source_required;
alter table public.stories add constraint stories_source_required
  check (kind in ('user', 'demo') or source_url is not null) not valid;

-- Moderator notes. Kept apart from `stories` so they are never readable by the public
-- (stories of status 'approved' are readable by everyone) or by the story's author.
create table if not exists public.story_reviews (
  story_id text primary key references public.stories (id) on delete cascade,
  decision text not null check (decision in ('approved', 'rejected')),
  note text check (note is null or char_length(note) <= 1000),
  reviewed_by uuid references auth.users (id) on delete set null,
  reviewed_at timestamptz not null default now()
);
alter table public.story_reviews enable row level security;
drop policy if exists story_reviews_staff on public.story_reviews;
create policy story_reviews_staff on public.story_reviews for all to authenticated
  using (public.is_staff()) with check (public.is_staff());

-- ---------------------------------------------------------------- content reports

-- Anyone may file a report, but only an open one with no resolution fields; reasons are short.
drop policy if exists content_reports_insert on public.content_reports;
create policy content_reports_insert on public.content_reports for insert to anon, authenticated
  with check (
    (reporter_id is null or reporter_id = auth.uid())
    and status = 'open'
    and resolved_by is null
    and resolved_at is null
  );

alter table public.content_reports drop constraint if exists content_reports_reason_length;
-- NOT VALID: older reports (saved before this limit, or inserted straight through the REST API)
-- may be longer; they stay as they are. The limit only applies while a report is open (new reports
-- are always inserted as open, see the policy above), so staff can still resolve or dismiss an old
-- long report: closing it is an UPDATE, and an UPDATE re-checks the row.
alter table public.content_reports add constraint content_reports_reason_length
  check (char_length(reason) <= 500 or status <> 'open') not valid;

-- ---------------------------------------------------------------- opportunities

-- Where the facts were checked (a page address or a note). Edited in the admin panel.
alter table public.opportunities add column if not exists source text
  check (source is null or char_length(source) <= 500);

alter table public.opportunities drop constraint if exists opportunities_url_http;
alter table public.opportunities add constraint opportunities_url_http
  check (url ~* '^https?://') not valid;

-- ---------------------------------------------------------------- story sources (admin list, used by the discovery script)

-- A source is a place to look for stories (a feed, a subreddit, a website), not tied to one story,
-- so story_id becomes optional. The older story_id use (where one story came from) still works.
alter table public.story_sources alter column story_id drop not null;
alter table public.story_sources add column if not exists kind text not null default 'other';
alter table public.story_sources drop constraint if exists story_sources_kind_check;
alter table public.story_sources add constraint story_sources_kind_check
  check (kind in ('rss', 'reddit', 'website', 'other'));
alter table public.story_sources add column if not exists created_at timestamptz not null default now();
alter table public.story_sources drop constraint if exists story_sources_url_http;
alter table public.story_sources add constraint story_sources_url_http
  check (url ~* '^https?://') not valid;
-- `note` (existing column) holds the free-text notes. Rows without story_id are visible to staff only
-- (story_sources_select needs an approved story or is_staff()).
