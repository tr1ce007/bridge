-- Final review fixes: delete-my-data scope and the "outdated" label for opportunities.
-- Re-runnable: policies are dropped (if they exist) before they are recreated. Nothing is deleted.

-- ---------------------------------------------------------------- stories: authors delete only their own PENDING stories

-- "Delete all my data" (Settings) removes the stories the person submitted that are still waiting for
-- moderation. Published (approved) and reviewed stories can only be removed by the team (staff).
drop policy if exists stories_delete on public.stories;
create policy stories_delete on public.stories for delete to authenticated
  using ((author_id = auth.uid() and status = 'pending') or public.is_staff());

-- profiles: clearing the display name needs no change. profiles_update_own (0001) already allows it
-- (the row is theirs and the role stays the same).

-- ---------------------------------------------------------------- opportunities: outdated rows stay visible

-- The site labels an outdated opportunity "Устарело" instead of hiding it (local mode does exactly that).
-- Until now the policy hid outdated rows from everyone but staff, so in Supabase mode the label never showed.
drop policy if exists opportunities_select on public.opportunities;
create policy opportunities_select on public.opportunities for select to anon, authenticated
  using (true);
