-- Pre-assigned admins: an address listed here becomes admin automatically once its owner
-- confirms it (clicks the sign-in link). An unconfirmed sign-up attempt never gets the role.
create or replace function public.grant_preassigned_admin()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.email_confirmed_at is not null
     and lower(new.email) in ('aaaaa66778811@gmail.com') then
    update public.profiles set role = 'admin' where id = new.id and role <> 'admin';
  end if;
  return new;
end;
$$;

revoke all on function public.grant_preassigned_admin() from public, anon, authenticated;

drop trigger if exists on_auth_user_preassigned_admin on auth.users;
create trigger on_auth_user_preassigned_admin
  after insert or update of email_confirmed_at on auth.users
  for each row execute function public.grant_preassigned_admin();
