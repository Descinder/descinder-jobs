-- Plan 2b-iv: ingestion upserts via `INSERT ... ON CONFLICT (source, external_id)`.
-- Migration 00007 created a PARTIAL unique index
--   `jobs_source_external_uidx ... where external_id is not null`
-- which Postgres cannot use for ON CONFLICT inference unless the statement also
-- supplies a matching WHERE predicate (supabase-js `upsert({onConflict})` does
-- not). Replace it with a full (non-partial) unique index so the conflict target
-- is inferrable. Native jobs always have `external_id IS NULL`; default unique
-- index semantics treat NULLs as DISTINCT, so multiple native rows remain valid
-- and unaffected. Ingested rows always carry a non-null external_id (mappers
-- guarantee), so they get the (source, external_id) uniqueness ingestion needs.

drop index if exists public.jobs_source_external_uidx;

create unique index jobs_source_external_uidx
  on public.jobs (source, external_id);
