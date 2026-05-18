-- Job alerts = named saved searches with a delivery frequency. Matching reuses
-- the jobs feed query; alert_deliveries dedups (one job per alert, once).
create table public.job_alerts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.users(id) on delete cascade,
  name text not null check (char_length(name) between 1 and 120),
  filters jsonb not null default '{}'::jsonb,
  frequency text not null check (frequency in ('instant','daily','weekly')),
  is_premium boolean not null default false,
  last_run_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index job_alerts_user_idx on public.job_alerts (user_id, created_at desc);
create index job_alerts_freq_idx on public.job_alerts (frequency);

create table public.alert_deliveries (
  id uuid primary key default gen_random_uuid(),
  alert_id uuid not null references public.job_alerts(id) on delete cascade,
  job_id uuid not null references public.jobs(id) on delete cascade,
  sent_at timestamptz not null default now(),
  unique (alert_id, job_id)
);
create index alert_deliveries_sent_idx on public.alert_deliveries (sent_at);
create index alert_deliveries_alert_idx on public.alert_deliveries (alert_id);

alter table public.job_alerts enable row level security;
alter table public.alert_deliveries enable row level security;
-- Backstop only (the app uses the service-role key which bypasses RLS; these
-- mirror the app-layer ownership rule for defence-in-depth).
create policy job_alerts_owner on public.job_alerts
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy alert_deliveries_owner on public.alert_deliveries
  for select using (
    exists (select 1 from public.job_alerts a where a.id = alert_id and a.user_id = auth.uid())
  );

create trigger job_alerts_updated_at before update on public.job_alerts
  for each row execute function public.set_updated_at();
