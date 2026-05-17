-- Plan 2c-ii. Atomic, race-safe AI-CV monthly quota: reserve a credit only if
-- under cap (authoritative — the gate is advisory UX). Refund is a compensating
-- decrement (floored at 0) when generation fails.
create or replace function public.consume_ai_cv_credit(p_user uuid, p_cap integer)
returns boolean
language plpgsql
as $$
declare
  n integer;
begin
  update public.users
    set ai_cv_uses_this_period = ai_cv_uses_this_period + 1
    where id = p_user and ai_cv_uses_this_period < p_cap;
  get diagnostics n = row_count;
  return n > 0;
end;
$$;

create or replace function public.refund_ai_cv_credit(p_user uuid)
returns void
language plpgsql
as $$
begin
  update public.users
    set ai_cv_uses_this_period = greatest(ai_cv_uses_this_period - 1, 0)
    where id = p_user;
end;
$$;

-- Postgres-backed fixed-window rate limiter (in-memory is insufficient on
-- multi-instance — backend-spec §9). One row per (bucket, identifier, window).
create table public.rate_limits (
  bucket text not null,
  identifier text not null,
  window_start timestamptz not null,
  count integer not null default 0,
  primary key (bucket, identifier, window_start)
);
create index rate_limits_window_idx on public.rate_limits (window_start);

-- Atomic increment-and-test for the current window; returns the new count.
create or replace function public.bump_rate_limit(
  p_bucket text, p_identifier text, p_window_start timestamptz
) returns integer
language plpgsql
as $$
declare
  c integer;
begin
  insert into public.rate_limits (bucket, identifier, window_start, count)
    values (p_bucket, p_identifier, p_window_start, 1)
    on conflict (bucket, identifier, window_start)
      do update set count = public.rate_limits.count + 1
    returning count into c;
  return c;
end;
$$;
