-- migration: one English subject on the lesson list, lesson names on calendar blocks
-- description: calendar blocks can carry their own title, link and dialogue id
-- created at: 2026-11-20

alter table public.curriculum_items
  add column if not exists module_key text;

alter table public.schedule_blocks
  add column if not exists title text,
  add column if not exists href text,
  add column if not exists source_id text;
