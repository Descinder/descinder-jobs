alter table public.cv_generations enable row level security;
create policy cv_generations_owner_select on public.cv_generations
  for select using (user_id = auth.uid() or public.is_admin());

alter table public.ingestion_runs enable row level security;
create policy ingestion_runs_admin_select on public.ingestion_runs
  for select using (public.is_admin());

alter table public.sessions enable row level security;
alter table public.processed_stripe_events enable row level security;
