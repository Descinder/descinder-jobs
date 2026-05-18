-- Plan 4a. job_alerts / alert_deliveries + the alert_frequency enum + owner RLS
-- ALREADY exist (created in 00001_initial_schema.sql:255-271 and
-- 00002_rls_policies.sql:202-209). This migration ADAPTS that baseline for the
-- alerts feature — it is idempotent and replayable on a clean `supabase db
-- reset` (it must NOT re-create the tables/enum/policies, which would abort).
-- Adds: last_run_at, updated_at, a name length check, the frequency index
-- (4b cron lookups), the sent_at / alert_id delivery indexes (purge + dedup),
-- and the updated_at trigger.

alter table public.job_alerts
  add column if not exists last_run_at timestamptz,
  add column if not exists updated_at timestamptz not null default now();

-- `add constraint` is not idempotent; guard it for replay safety.
do $$
begin
  if not exists (
    select 1 from pg_constraint where conname = 'job_alerts_name_len'
  ) then
    alter table public.job_alerts
      add constraint job_alerts_name_len check (char_length(name) between 1 and 120);
  end if;
end $$;

create index if not exists job_alerts_freq_idx on public.job_alerts (frequency);
create index if not exists alert_deliveries_sent_idx on public.alert_deliveries (sent_at);
create index if not exists alert_deliveries_alert_idx on public.alert_deliveries (alert_id);

-- public.set_updated_at() is defined in 00001 (used by users/subscriptions/…).
drop trigger if exists job_alerts_updated_at on public.job_alerts;
create trigger job_alerts_updated_at before update on public.job_alerts
  for each row execute function public.set_updated_at();
