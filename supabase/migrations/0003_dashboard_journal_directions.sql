-- Task 7: reflection journal fields and saved directions.
-- Additive: nothing is dropped or rewritten.

-- journal_entries: the five optional prompts (tried, learned, surprised, disliked, next) as jsonb.
-- `text` stays (free note; older entries only have it).
alter table public.journal_entries
  add column if not exists fields jsonb not null default '{}'::jsonb;

-- saved_directions: a direction from a Discovery Report. direction_id = '<report id>:<index>'.
-- No foreign key on purpose, like the other saved_* tables.
create table if not exists public.saved_directions (
  user_id uuid not null references auth.users (id) on delete cascade,
  direction_id text not null,
  created_at timestamptz not null default now(),
  primary key (user_id, direction_id)
);

alter table public.saved_directions enable row level security;
drop policy if exists saved_directions_owner on public.saved_directions;
create policy saved_directions_owner on public.saved_directions for all to authenticated
  using (user_id = auth.uid()) with check (user_id = auth.uid());
