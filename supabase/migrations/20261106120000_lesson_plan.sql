-- migration: lesson list, calendar blocks, and planner proposals
-- description: stores the parent-owned lesson plan separately from the times placed on the calendar
-- created at: 2026-11-06

alter table public.households
  add column if not exists locality text;

create table if not exists public.curriculum_items (
  id uuid primary key default gen_random_uuid(),
  learner_id uuid not null references auth.users(id) on delete cascade,
  kind text not null check (kind in ('main', 'extra')),
  status text not null check (status in ('proposed', 'accepted')),
  title text not null,
  subject text not null,
  duration_minutes integer not null default 25 check (duration_minutes between 5 and 180),
  parent_guide text not null default '',
  source_id text,
  href text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists curriculum_items_learner_idx on public.curriculum_items (learner_id, kind, status);

drop trigger if exists set_curriculum_items_updated_at on public.curriculum_items;
create trigger set_curriculum_items_updated_at
  before update on public.curriculum_items
  for each row
  execute function public.handle_updated_at();

create table if not exists public.schedule_blocks (
  id uuid primary key default gen_random_uuid(),
  learner_id uuid not null references auth.users(id) on delete cascade,
  curriculum_item_id uuid references public.curriculum_items(id) on delete cascade,
  kind text not null check (kind in ('lesson', 'break')),
  starts_at timestamptz not null,
  ends_at timestamptz not null,
  created_at timestamptz not null default now(),
  check (ends_at > starts_at)
);

create index if not exists schedule_blocks_learner_start_idx on public.schedule_blocks (learner_id, starts_at);

create table if not exists public.plan_proposals (
  id uuid primary key default gen_random_uuid(),
  learner_id uuid not null references auth.users(id) on delete cascade,
  author_user_id uuid not null references auth.users(id) on delete cascade,
  summary text not null,
  operations jsonb not null,
  status text not null default 'pending' check (status in ('pending', 'accepted', 'rejected')),
  month text,
  created_at timestamptz not null default now()
);

create index if not exists plan_proposals_learner_status_idx on public.plan_proposals (learner_id, status);

create table if not exists public.planner_messages (
  id uuid primary key default gen_random_uuid(),
  learner_id uuid not null references auth.users(id) on delete cascade,
  author_user_id uuid references auth.users(id) on delete set null,
  role text not null check (role in ('user', 'assistant')),
  content text not null,
  proposal_id uuid references public.plan_proposals(id) on delete set null,
  created_at timestamptz not null default now()
);

create index if not exists planner_messages_learner_created_idx on public.planner_messages (learner_id, created_at);

alter table public.curriculum_items enable row level security;
alter table public.schedule_blocks enable row level security;
alter table public.plan_proposals enable row level security;
alter table public.planner_messages enable row level security;

create policy "Learners read accepted items and guardians read all"
  on public.curriculum_items
  for select
  to authenticated
  using (
    public.is_guardian_of(learner_id)
    or (auth.uid() = learner_id and status = 'accepted')
  );

create policy "Guardians write curriculum items"
  on public.curriculum_items
  for insert
  to authenticated
  with check (public.is_guardian_of(learner_id));

create policy "Guardians update curriculum items"
  on public.curriculum_items
  for update
  to authenticated
  using (public.is_guardian_of(learner_id))
  with check (public.is_guardian_of(learner_id));

create policy "Guardians delete curriculum items"
  on public.curriculum_items
  for delete
  to authenticated
  using (public.is_guardian_of(learner_id));

create policy "Learners and guardians read schedule blocks"
  on public.schedule_blocks
  for select
  to authenticated
  using (public.owns_or_guards(learner_id));

create policy "Guardians insert schedule blocks"
  on public.schedule_blocks
  for insert
  to authenticated
  with check (public.is_guardian_of(learner_id));

create policy "Guardians update schedule blocks"
  on public.schedule_blocks
  for update
  to authenticated
  using (public.is_guardian_of(learner_id))
  with check (public.is_guardian_of(learner_id));

create policy "Guardians delete schedule blocks"
  on public.schedule_blocks
  for delete
  to authenticated
  using (public.is_guardian_of(learner_id));

create policy "Guardians read plan proposals"
  on public.plan_proposals
  for select
  to authenticated
  using (public.is_guardian_of(learner_id));

create policy "Guardians insert plan proposals"
  on public.plan_proposals
  for insert
  to authenticated
  with check (public.is_guardian_of(learner_id) and author_user_id = auth.uid());

create policy "Guardians update plan proposals"
  on public.plan_proposals
  for update
  to authenticated
  using (public.is_guardian_of(learner_id))
  with check (public.is_guardian_of(learner_id));

create policy "Guardians read planner messages"
  on public.planner_messages
  for select
  to authenticated
  using (public.is_guardian_of(learner_id));

create policy "Guardians insert planner messages"
  on public.planner_messages
  for insert
  to authenticated
  with check (public.is_guardian_of(learner_id));
