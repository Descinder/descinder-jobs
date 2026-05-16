create table public.sessions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.users(id) on delete cascade,
  gotrue_refresh_token text not null,
  csrf_token text not null,
  user_agent text,
  ip text,
  created_at timestamptz not null default now(),
  last_seen_at timestamptz not null default now(),
  expires_at timestamptz not null,
  revoked_at timestamptz
);
create index sessions_user_idx on public.sessions (user_id);
create index sessions_expiry_idx on public.sessions (expires_at) where revoked_at is null;

create table public.processed_stripe_events (
  stripe_event_id text primary key,
  processed_at timestamptz not null default now()
);

alter table public.users
  add column ai_cv_uses_this_period integer not null default 0,
  add column ai_cv_uses_reset_at timestamptz not null default date_trunc('month', now());
