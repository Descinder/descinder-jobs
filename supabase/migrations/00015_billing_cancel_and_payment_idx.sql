-- Plan 2c-i: Stripe cancel/resume needs a persisted cancel_at_period_end; the
-- billing overview shows the period window. The employer_publish per-post branch
-- looks up a succeeded job_post payment for a specific (company, job) — index it.
alter table public.subscriptions
  add column if not exists cancel_at_period_end boolean not null default false,
  add column if not exists current_period_start timestamptz;

create index if not exists payments_perpost_idx
  on public.payments (owner_type, owner_id, purpose, related_id, status);
