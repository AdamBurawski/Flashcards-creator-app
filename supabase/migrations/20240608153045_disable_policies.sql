-- migration: disable policies from previous migrations
-- description: disables all RLS policies for flashcards, generations, and generation_error_logs tables
-- created at: 2024-06-08

-- disable flashcards policies
drop policy if exists "Users can view their own flashcards" on public.flashcards;
drop policy if exists "Users can insert their own flashcards" on public.flashcards;
drop policy if exists "Users can update their own flashcards" on public.flashcards;
drop policy if exists "Users can delete their own flashcards" on public.flashcards;
drop policy if exists "Anon users cannot access flashcards" on public.flashcards;

-- disable generations policies
drop policy if exists "Users can view their own generations" on public.generations;
drop policy if exists "Users can insert their own generations" on public.generations;
drop policy if exists "Users can update their own generations" on public.generations;
drop policy if exists "Users can delete their own generations" on public.generations;
drop policy if exists "Anon users cannot access generations" on public.generations;

-- disable generation_error_logs policies
drop policy if exists "Users can view their own error logs" on public.generation_error_logs;
drop policy if exists "Users can insert their own error logs" on public.generation_error_logs;
drop policy if exists "Anon users cannot access error logs" on public.generation_error_logs; 