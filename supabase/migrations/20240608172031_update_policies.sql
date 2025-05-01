-- migration: update policies for flashcards
-- description: adds RLS policies for flashcards table if they don't exist
-- created at: 2024-06-08

-- enable row level security (jeśli jeszcze nie jest włączone)
alter table public.flashcards enable row level security;

-- Najpierw usunięcie istniejących potencjalnie problematycznych zasad
DROP POLICY IF EXISTS "Users can view their own flashcards" ON public.flashcards;
DROP POLICY IF EXISTS "Users can insert their own flashcards" ON public.flashcards;
DROP POLICY IF EXISTS "Users can update their own flashcards" ON public.flashcards;
DROP POLICY IF EXISTS "Users can delete their own flashcards" ON public.flashcards;
DROP POLICY IF EXISTS "Anon users cannot access flashcards" ON public.flashcards;

-- Ponowne utworzenie zasad
create policy "Users can view their own flashcards"
on public.flashcards
for select
to authenticated
using (auth.uid() = user_id);

create policy "Users can insert their own flashcards"
on public.flashcards
for insert
to authenticated
with check (auth.uid() = user_id);

create policy "Users can update their own flashcards"
on public.flashcards
for update
to authenticated
using (auth.uid() = user_id)
with check (auth.uid() = user_id);

create policy "Users can delete their own flashcards"
on public.flashcards
for delete
to authenticated
using (auth.uid() = user_id);

create policy "Anon users cannot access flashcards"
on public.flashcards
for all
to anon
using (false); 