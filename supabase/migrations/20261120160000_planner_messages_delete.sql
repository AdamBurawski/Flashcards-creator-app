-- guardians can clear the planner conversation for a child they guard

create policy "Guardians delete planner messages"
  on public.planner_messages
  for delete
  to authenticated
  using (public.is_guardian_of(learner_id));
