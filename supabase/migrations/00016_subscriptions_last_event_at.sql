-- Plan 2c-i review (HIGH): Stripe does not guarantee ordered webhook delivery.
-- Persist the source event's timestamp so a late-delivered STALE
-- customer.subscription.* event cannot clobber newer reconciled state.
alter table public.subscriptions
  add column if not exists last_event_at timestamptz;
