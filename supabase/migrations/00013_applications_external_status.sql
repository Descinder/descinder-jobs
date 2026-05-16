-- Seeker self-reported status for EXTERNAL/ingested applications (distinct from
-- the employer-managed application_status enum used for native applications).
alter table public.applications
  add column external_status text
  check (external_status is null
    or external_status in ('applied','interviewing','offer','hired','rejected'));
