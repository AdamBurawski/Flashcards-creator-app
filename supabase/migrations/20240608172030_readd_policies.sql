-- migration: readd policies for flashcards
-- description: adds RLS policies for flashcards table
-- created at: 2024-06-08

-- enable row level security (jeśli jeszcze nie jest włączone)
alter table public.flashcards enable row level security;

-- policy for authenticated users to select their own flashcards
create policy "Users can view their own flashcards"
on public.flashcards
for select
to authenticated
using (auth.uid() = user_id);

-- policy for authenticated users to insert their own flashcards
create policy "Users can insert their own flashcards"
on public.flashcards
for insert
to authenticated
with check (auth.uid() = user_id);

-- policy for authenticated users to update their own flashcards
create policy "Users can update their own flashcards"
on public.flashcards
for update
to authenticated
using (auth.uid() = user_id)
with check (auth.uid() = user_id);

-- policy for authenticated users to delete their own flashcards
create policy "Users can delete their own flashcards"
on public.flashcards
for delete
to authenticated
using (auth.uid() = user_id);

-- Explicit denial policies for anon users
create policy "Anon users cannot access flashcards"
on public.flashcards
for all
to anon
using (false); 