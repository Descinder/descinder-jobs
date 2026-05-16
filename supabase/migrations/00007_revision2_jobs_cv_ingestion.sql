-- Revision 2: dual-source jobs, CV kinds, AI generation log, ingestion log
-- NOTE: 'external' already exists in job_apply_method enum (defined in 00001_initial_schema.sql)
-- The alter type line is intentionally omitted as redundant.

create type job_source as enum ('native', 'adzuna', 'reed');

alter table public.jobs
  add column source job_source not null default 'native',
  add column external_id text,
  add column country text,
  add column source_company_name text,
  add column source_attribution text,
  add column ingested_at timestamptz,
  add column salary_is_predicted boolean not null default false;

alter table public.jobs alter column company_id drop not null;

create unique index jobs_source_external_uidx
  on public.jobs (source, external_id) where external_id is not null;
create index jobs_country_idx on public.jobs (country);
create index jobs_source_idx on public.jobs (source);

create type cv_kind as enum ('uploaded_base', 'profile_built', 'ai_tailored');

alter table public.cv_files
  add column kind cv_kind not null default 'uploaded_base',
  add column source_cv_id uuid references public.cv_files(id) on delete set null,
  add column tailored_for_job_id uuid references public.jobs(id) on delete set null;

create table public.cv_generations (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.users(id) on delete cascade,
  base_cv_id uuid references public.cv_files(id) on delete set null,
  job_id uuid references public.jobs(id) on delete set null,
  generated_cv_id uuid references public.cv_files(id) on delete set null,
  ai_provider text not null,
  ai_model_used text not null,
  prompt_version text not null,
  latency_ms integer,
  input_tokens integer,
  output_tokens integer,
  success boolean not null default false,
  error_message text,
  created_at timestamptz not null default now()
);
create index cv_generations_user_idx on public.cv_generations (user_id, created_at desc);

create table public.ingestion_runs (
  id uuid primary key default gen_random_uuid(),
  source job_source not null,
  country text,
  category_filter text,
  started_at timestamptz not null default now(),
  finished_at timestamptz,
  jobs_inserted integer not null default 0,
  jobs_updated integer not null default 0,
  jobs_expired integer not null default 0,
  success boolean not null default false,
  error_message text
);
create index ingestion_runs_started_idx on public.ingestion_runs (started_at desc);
