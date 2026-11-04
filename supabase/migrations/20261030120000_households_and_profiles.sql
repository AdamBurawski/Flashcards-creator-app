-- migration: profiles, households, and guardian access for child accounts
-- description: parents (administrators) own a household; children (users) are members with separate stats
-- created at: 2026-10-30

-- ============================================================================
-- table: profiles (extend existing AI-usage profile when present)
-- ============================================================================
create table if not exists public.profiles (
  user_id uuid primary key references auth.users(id) on delete cascade,
  username text,
  avatar_url text,
  current_ai_token_usage integer not null default 0,
  monthly_ai_token_limit integer not null default 100000,
  ai_usage_last_reset_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.profiles add column if not exists role text;
alter table public.profiles add column if not exists first_name text;
alter table public.profiles add column if not exists last_name text;
alter table public.profiles add column if not exists display_name text;
alter table public.profiles add column if not exists birth_date date;
alter table public.profiles add column if not exists phone text;
alter table public.profiles add column if not exists locale text default 'pl';
alter table public.profiles add column if not exists timezone text default 'Europe/Warsaw';
alter table public.profiles add column if not exists school_grade text;
alter table public.profiles add column if not exists parent_note text;
alter table public.profiles add column if not exists active_child_id uuid;
alter table public.profiles add column if not exists created_at timestamptz default now();
alter table public.profiles add column if not exists updated_at timestamptz default now();

update public.profiles set role = 'administrator' where role is null;

alter table public.profiles alter column role set default 'administrator';
alter table public.profiles alter column role set not null;

do $$
begin
  if not exists (
    select 1 from pg_constraint where conname = 'profiles_role_check'
  ) then
    alter table public.profiles
      add constraint profiles_role_check check (role in ('administrator', 'user'));
  end if;

  if not exists (
    select 1 from pg_constraint where conname = 'profiles_active_child_id_fkey'
  ) then
    alter table public.profiles
      add constraint profiles_active_child_id_fkey
      foreign key (active_child_id) references auth.users(id) on delete set null;
  end if;
end $$;

create index if not exists profiles_role_idx on public.profiles(role);
create index if not exists profiles_active_child_idx on public.profiles(active_child_id);

drop trigger if exists set_profiles_updated_at on public.profiles;
create trigger set_profiles_updated_at
  before update on public.profiles
  for each row
  execute function public.handle_updated_at();

-- ============================================================================
-- table: households
-- ============================================================================
create table if not exists public.households (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null unique references auth.users(id) on delete cascade,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create trigger set_households_updated_at
  before update on public.households
  for each row
  execute function public.handle_updated_at();

-- ============================================================================
-- table: household_members
-- ============================================================================
create table if not exists public.household_members (
  household_id uuid not null references public.households(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  member_role text not null
    check (member_role in ('administrator', 'user')),
  created_at timestamptz not null default now(),
  primary key (household_id, user_id),
  unique (user_id)
);

create index if not exists household_members_user_idx on public.household_members(user_id);
create index if not exists household_members_household_idx on public.household_members(household_id);

-- ============================================================================
-- helpers (after tables exist)
-- ============================================================================
create or replace function public.current_profile_role()
returns text
language sql
stable
security definer
set search_path = public
as $$
  select role from public.profiles where user_id = auth.uid()
$$;

create or replace function public.is_guardian_of(target_user_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.household_members parent_member
    join public.household_members child_member
      on child_member.household_id = parent_member.household_id
    where parent_member.user_id = auth.uid()
      and parent_member.member_role = 'administrator'
      and child_member.user_id = target_user_id
      and child_member.member_role = 'user'
  );
$$;

create or replace function public.owns_or_guards(target_user_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select auth.uid() = target_user_id or public.is_guardian_of(target_user_id);
$$;

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

-- ============================================================================
-- bootstrap existing auth users as administrators with empty households
-- ============================================================================
insert into public.profiles (user_id, role)
select id, 'administrator'
from auth.users
on conflict (user_id) do nothing;

insert into public.households (owner_id)
select id
from auth.users
on conflict (owner_id) do nothing;

insert into public.household_members (household_id, user_id, member_role)
select h.id, h.owner_id, 'administrator'
from public.households h
on conflict (user_id) do nothing;

-- ============================================================================
-- auto-create administrator profile + household on signup
-- ============================================================================
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  new_household_id uuid;
  assigned_role text := coalesce(new.raw_user_meta_data->>'role', 'administrator');
begin
  if assigned_role not in ('administrator', 'user') then
    assigned_role := 'administrator';
  end if;

  insert into public.profiles (user_id, role)
  values (new.id, assigned_role)
  on conflict (user_id) do nothing;

  -- Only parents get a household; children are attached later by the guardian API.
  if assigned_role = 'administrator' then
    insert into public.households (owner_id)
    values (new.id)
    on conflict (owner_id) do nothing
    returning id into new_household_id;

    if new_household_id is null then
      select id into new_household_id from public.households where owner_id = new.id;
    end if;

    insert into public.household_members (household_id, user_id, member_role)
    values (new_household_id, new.id, 'administrator')
    on conflict (user_id) do nothing;
  end if;

  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row
  execute function public.handle_new_user();

-- ============================================================================
-- RLS: profiles
-- ============================================================================
alter table public.profiles enable row level security;

create policy "Users can read own or guarded profiles"
  on public.profiles
  for select
  to authenticated
  using (public.owns_or_guards(user_id));

create policy "Users can update own profile fields"
  on public.profiles
  for update
  to authenticated
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id and role = (select p.role from public.profiles p where p.user_id = auth.uid()));

create policy "Guardians can update child profiles"
  on public.profiles
  for update
  to authenticated
  using (public.is_guardian_of(user_id))
  with check (public.is_guardian_of(user_id) and role = 'user');

create policy "Service can insert profiles"
  on public.profiles
  for insert
  to authenticated
  with check (auth.uid() = user_id);

-- ============================================================================
-- RLS: households
-- ============================================================================
alter table public.households enable row level security;

create policy "Members can read their household"
  on public.households
  for select
  to authenticated
  using (
    owner_id = auth.uid()
    or public.is_member_of_household(id)
  );

create policy "Owners can update their household"
  on public.households
  for update
  to authenticated
  using (owner_id = auth.uid())
  with check (owner_id = auth.uid());

-- ============================================================================
-- RLS: household_members
-- ============================================================================
alter table public.household_members enable row level security;

create policy "Members can read household membership"
  on public.household_members
  for select
  to authenticated
  using (
    user_id = auth.uid()
    or public.is_member_of_household(household_id)
  );

create policy "Administrators can insert household members"
  on public.household_members
  for insert
  to authenticated
  with check (
    exists (
      select 1 from public.households h
      where h.id = household_id and h.owner_id = auth.uid()
    )
  );

create policy "Administrators can delete child members"
  on public.household_members
  for delete
  to authenticated
  using (
    member_role = 'user'
    and exists (
      select 1 from public.households h
      where h.id = household_id and h.owner_id = auth.uid()
    )
  );

-- ============================================================================
-- extend existing data policies so guardians can read/write child data
-- ============================================================================
drop policy if exists "Users can read own english progress" on public.english_progress;
create policy "Users can read own or child english progress"
  on public.english_progress
  for select
  to authenticated
  using (public.owns_or_guards(user_id));

drop policy if exists "Users can insert own english progress" on public.english_progress;
create policy "Users can insert own or child english progress"
  on public.english_progress
  for insert
  to authenticated
  with check (public.owns_or_guards(user_id));

drop policy if exists collections_select_policy on public.collections;
create policy collections_select_policy on public.collections
  for select
  to authenticated
  using (public.owns_or_guards(user_id));

drop policy if exists collections_insert_policy on public.collections;
create policy collections_insert_policy on public.collections
  for insert
  to authenticated
  with check (public.owns_or_guards(user_id) and public.current_profile_role() = 'administrator');

drop policy if exists collections_update_policy on public.collections;
create policy collections_update_policy on public.collections
  for update
  to authenticated
  using (public.owns_or_guards(user_id) and public.current_profile_role() = 'administrator')
  with check (public.owns_or_guards(user_id) and public.current_profile_role() = 'administrator');

drop policy if exists collections_delete_policy on public.collections;
create policy collections_delete_policy on public.collections
  for delete
  to authenticated
  using (public.owns_or_guards(user_id) and public.current_profile_role() = 'administrator');

drop policy if exists "Users can view their own flashcards" on public.flashcards;
create policy "Users can view their own flashcards"
  on public.flashcards
  for select
  to authenticated
  using (public.owns_or_guards(user_id));

drop policy if exists "Users can insert their own flashcards" on public.flashcards;
create policy "Users can insert their own flashcards"
  on public.flashcards
  for insert
  to authenticated
  with check (public.owns_or_guards(user_id) and public.current_profile_role() = 'administrator');

drop policy if exists "Users can update their own flashcards" on public.flashcards;
create policy "Users can update their own flashcards"
  on public.flashcards
  for update
  to authenticated
  using (public.owns_or_guards(user_id) and public.current_profile_role() = 'administrator')
  with check (public.owns_or_guards(user_id) and public.current_profile_role() = 'administrator');

drop policy if exists "Users can delete their own flashcards" on public.flashcards;
create policy "Users can delete their own flashcards"
  on public.flashcards
  for delete
  to authenticated
  using (public.owns_or_guards(user_id) and public.current_profile_role() = 'administrator');

-- ============================================================================
-- storage: avatars bucket
-- ============================================================================
insert into storage.buckets (id, name, public)
values ('avatars', 'avatars', true)
on conflict (id) do nothing;

create policy "Authenticated users can upload own avatar"
  on storage.objects
  for insert
  to authenticated
  with check (
    bucket_id = 'avatars'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

create policy "Guardians can upload child avatar"
  on storage.objects
  for insert
  to authenticated
  with check (
    bucket_id = 'avatars'
    and public.is_guardian_of(((storage.foldername(name))[1])::uuid)
  );

create policy "Authenticated users can update own avatar"
  on storage.objects
  for update
  to authenticated
  using (
    bucket_id = 'avatars'
    and (
      (storage.foldername(name))[1] = auth.uid()::text
      or public.is_guardian_of(((storage.foldername(name))[1])::uuid)
    )
  );

create policy "Anyone can read avatars"
  on storage.objects
  for select
  to public
  using (bucket_id = 'avatars');
