-- migration: break infinite recursion in household_members RLS
-- description: SELECT policies queried household_members from within household_members policies
-- created at: 2026-10-30

create or replace function public.is_member_of_household(target_household_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.household_members
    where household_id = target_household_id
      and user_id = auth.uid()
  );
$$;

revoke all on function public.is_member_of_household(uuid) from public;
grant execute on function public.is_member_of_household(uuid) to authenticated;

drop policy if exists "Members can read household membership" on public.household_members;
create policy "Members can read household membership"
  on public.household_members
  for select
  to authenticated
  using (
    user_id = auth.uid()
    or public.is_member_of_household(household_id)
  );

drop policy if exists "Members can read their household" on public.households;
create policy "Members can read their household"
  on public.households
  for select
  to authenticated
  using (
    owner_id = auth.uid()
    or public.is_member_of_household(id)
  );
