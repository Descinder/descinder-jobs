-- Migration 00011: Allow work_mode and experience_level to be NULL on ingested jobs.
-- Migration 00007 dropped NOT NULL from company_id for ingested (Adzuna/Reed) rows,
-- but omitted these two columns. The ingestion spec (design §6 degradation rules) states
-- that both fields may be absent in external listings; not having this migration means
-- ANY ingested job with an unknown work_mode or experience_level fails insertion with
-- a 23502 NOT NULL violation.

alter table public.jobs alter column work_mode drop not null;
alter table public.jobs alter column experience_level drop not null;
