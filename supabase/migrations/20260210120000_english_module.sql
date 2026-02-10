-- migration: english learning module tables
-- description: creates tables for english dialogues, user progress tracking, and audio file mapping
-- affected tables: english_dialogues, english_progress, english_audio_files
-- created at: 2026-02-10

-- ============================================================================
-- table: english_dialogues
-- purpose: stores dialogue data (rozmówki) imported from JSONL files.
-- each row represents a single dialogue within a lesson, containing
-- alternating teacher/student turns in the JSONB 'turns' column.
-- ============================================================================
create table if not exists public.english_dialogues (
  id text primary key,                             -- e.g. "S1-L01-D01"
  stage smallint not null,                         -- callan stage (1-12)
  lesson smallint not null,                        -- lesson number within stage
  level text not null                              -- CEFR level
    check (level in ('A1', 'A2', 'B1', 'B2')),
  title text not null,                             -- dialogue title
  tags text[] not null default '{}',               -- thematic tags
  target_vocab text[] not null default '{}',       -- target vocabulary
  target_structures text[] not null default '{}',  -- target grammar structures
  turns jsonb not null,                            -- array of teacher/student turns (see spec 4.4)
  revision_from text[] default '{}',               -- IDs of dialogues this lesson reviews
  estimated_duration_seconds int,                  -- estimated duration in seconds
  sort_order int not null default 0,               -- ordering within a lesson
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- indexes for efficient querying
create index if not exists idx_english_dialogues_level
  on public.english_dialogues(level);

create index if not exists idx_english_dialogues_stage_lesson
  on public.english_dialogues(stage, lesson);

create index if not exists idx_english_dialogues_tags
  on public.english_dialogues using gin(tags);

-- trigger: auto-update updated_at (reuses existing function from initial_schema)
create trigger set_english_dialogues_updated_at
  before update on public.english_dialogues
  for each row
  execute function public.handle_updated_at();

-- ============================================================================
-- table: english_progress
-- purpose: tracks user progress — records of completed dialogues.
-- each row represents one completed dialogue session by a user.
-- a user can complete the same dialogue multiple times (multiple rows).
-- ============================================================================
create table if not exists public.english_progress (
  id bigserial primary key,
  user_id uuid not null references auth.users(id) on delete cascade,
  dialogue_id text not null references public.english_dialogues(id) on delete cascade,
  score smallint not null                          -- correctness percentage (0-100)
    check (score >= 0 and score <= 100),
  total_turns smallint not null,                   -- total number of student turns
  correct_turns smallint not null,                 -- number of correct student turns
  duration_seconds int,                            -- actual session duration in seconds
  completed_at timestamptz default now()
);

-- indexes for progress queries
create index if not exists idx_english_progress_user
  on public.english_progress(user_id);

create index if not exists idx_english_progress_user_dialogue
  on public.english_progress(user_id, dialogue_id);

create index if not exists idx_english_progress_completed
  on public.english_progress(user_id, completed_at desc);

-- ============================================================================
-- table: english_audio_files
-- purpose: maps pre-generated audio files to dialogue turns.
-- stores URLs to audio files in Supabase Storage for teacher questions,
-- question repeats, and hints.
-- ============================================================================
create table if not exists public.english_audio_files (
  id bigserial primary key,
  dialogue_id text not null references public.english_dialogues(id) on delete cascade,
  turn_index smallint not null,                    -- index of the turn in turns array (0-based)
  audio_type text not null                         -- type of audio content
    check (audio_type in ('question', 'question_repeat', 'hint')),
  audio_url text not null,                         -- URL in Supabase Storage
  voice_id text,                                   -- ElevenLabs voice ID used
  duration_ms int,                                 -- audio duration in milliseconds
  created_at timestamptz default now(),
  unique(dialogue_id, turn_index, audio_type)      -- one audio file per turn per type
);

-- index for audio file lookups
create index if not exists idx_english_audio_dialogue
  on public.english_audio_files(dialogue_id);

-- ============================================================================
-- row level security (RLS)
-- ============================================================================

-- english_dialogues: read-only for all authenticated users
alter table public.english_dialogues enable row level security;

-- policy: authenticated users can read all dialogues
create policy "Authenticated users can read dialogues"
  on public.english_dialogues
  for select
  to authenticated
  using (true);

-- policy: anonymous users cannot access dialogues
create policy "Anon users cannot access english dialogues"
  on public.english_dialogues
  for all
  to anon
  using (false);

-- english_progress: users can only see and insert their own progress
alter table public.english_progress enable row level security;

-- policy: users can read their own progress
create policy "Users can read own english progress"
  on public.english_progress
  for select
  to authenticated
  using (auth.uid() = user_id);

-- policy: users can insert their own progress
create policy "Users can insert own english progress"
  on public.english_progress
  for insert
  to authenticated
  with check (auth.uid() = user_id);

-- policy: anonymous users cannot access progress
create policy "Anon users cannot access english progress"
  on public.english_progress
  for all
  to anon
  using (false);

-- english_audio_files: read-only for all authenticated users
alter table public.english_audio_files enable row level security;

-- policy: authenticated users can read all audio file mappings
create policy "Authenticated users can read audio files"
  on public.english_audio_files
  for select
  to authenticated
  using (true);

-- policy: anonymous users cannot access audio files
create policy "Anon users cannot access english audio files"
  on public.english_audio_files
  for all
  to anon
  using (false);
