-- migration: list household accounts for the signed-in member
-- description: lets parent and child see names and emails of their household so they can switch accounts
-- created at: 2026-10-30

create or replace function public.household_accounts()
returns table (
  user_id uuid,
  role text,
  first_name text,
  last_name text,
  display_name text,
  avatar_url text,
  email text
)
language sql
stable
security definer
set search_path = public
as $$
  select
    p.user_id,
    p.role,
    p.first_name,
    p.last_name,
    p.display_name,
    p.avatar_url,
    u.email::text
  from public.household_members me
  join public.household_members peer
    on peer.household_id = me.household_id
  join public.profiles p
    on p.user_id = peer.user_id
  join auth.users u
    on u.id = peer.user_id
  where me.user_id = auth.uid()
  order by case when p.role = 'administrator' then 0 else 1 end, p.first_name nulls last;
$$;

revoke all on function public.household_accounts() from public;
grant execute on function public.household_accounts() to authenticated;
