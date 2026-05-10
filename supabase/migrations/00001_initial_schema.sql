-- Descinder Jobs — Initial schema (Plan 1)
-- Creates all MVP tables. RLS policies live in 00002_rls_policies.sql.
-- All later plans add UI/logic on top of this schema.

create extension if not exists "uuid-ossp";
create extension if not exists "pgcrypto";

-- ============================================================================
-- ENUMS
-- ============================================================================

create type user_role as enum ('job_seeker', 'employer', 'admin');
create type verification_status as enum ('unverified', 'pending', 'verified', 'rejected');
create type approval_status as enum ('auto_approved', 'pending', 'approved', 'rejected');
create type acquisition_source as enum (
  'google', 'social_linkedin', 'social_twitter', 'social_other',
  'referral', 'press_blog', 'event_university', 'paid_ad', 'other'
);
create type company_member_role as enum ('owner', 'recruiter');
create type job_employment_type as enum ('full_time', 'part_time', 'contract', 'internship');
create type job_work_mode as enum ('remote', 'hybrid', 'on_site');
create type job_experience_level as enum ('entry', 'mid', 'senior', 'lead');
create type job_apply_method as enum ('native', 'external');
create type job_status as enum ('draft', 'published', 'closed', 'expired');
create type application_status as enum ('submitted', 'reviewed', 'shortlisted', 'rejected', 'hired');
create type alert_frequency as enum ('instant', 'daily', 'weekly');
create type subscription_owner_type as enum ('user', 'company');
create type payment_purpose as enum ('job_post', 'featured_listing', 'subscription', 'other');
create type report_target_type as enum ('job', 'company', 'user');
create type report_reason as enum ('spam', 'inappropriate', 'scam', 'harassment', 'other');
create type report_status as enum ('open', 'reviewed', 'dismissed', 'actioned');
create type consent_event_type as enum (
  'terms_accepted', 'privacy_accepted', 'marketing_opt_in', 'cookie_analytics_opt_in'
);

-- ============================================================================
-- USERS (extension of auth.users)
-- ============================================================================

create table public.users (
  id uuid primary key references auth.users(id) on delete cascade,
  email text not null unique,
  name text,
  avatar_url text,
  role user_role not null default 'job_seeker',
  verification_status verification_status not null default 'unverified',
  verified_at timestamptz,
  assessment_score integer,
  approval_status approval_status not null default 'auto_approved',
  approval_decided_at timestamptz,
  approval_decided_by uuid references public.users(id),
  approval_rejection_reason text,
  suspended_at timestamptz,
  suspension_reason text,
  suspended_by uuid references public.users(id),
  acquisition_source acquisition_source,
  acquisition_source_detail text,
  last_login_at timestamptz,
  marketing_consent boolean not null default false,
  marketing_consent_at timestamptz,
  notification_preferences jsonb not null default jsonb_build_object(
    'application_status_changes', true,
    'job_alert_matches', true,
    'employer_messages', true,
    'marketing', false
  ),
  stripe_customer_id text,
  plan text,
  deleted_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index users_role_idx on public.users(role);
create index users_deleted_at_idx on public.users(deleted_at) where deleted_at is null;

-- ============================================================================
-- JOB SEEKER PROFILES
-- ============================================================================

create table public.job_seeker_profiles (
  user_id uuid primary key references public.users(id) on delete cascade,
  headline text,
  bio text,
  location text,
  years_experience integer,
  skills text[] not null default '{}',
  desired_role_types text[] not null default '{}',
  portfolio_url text,
  github_url text,
  linkedin_url text,
  primary_cv_id uuid,
  open_to_offers boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index job_seeker_profiles_skills_idx on public.job_seeker_profiles using gin(skills);

-- ============================================================================
-- COMPANIES
-- ============================================================================

create table public.companies (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  slug text not null unique,
  logo_url text,
  website text,
  description text,
  location text,
  size text,
  tier text not null default 'free',
  approval_status approval_status not null default 'auto_approved',
  approval_decided_at timestamptz,
  approval_decided_by uuid references public.users(id),
  approval_rejection_reason text,
  suspended_at timestamptz,
  suspension_reason text,
  suspended_by uuid references public.users(id),
  stripe_customer_id text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index companies_slug_idx on public.companies(slug);

-- ============================================================================
-- COMPANY MEMBERS
-- ============================================================================

create table public.company_members (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies(id) on delete cascade,
  user_id uuid not null references public.users(id) on delete cascade,
  role company_member_role not null default 'recruiter',
  created_at timestamptz not null default now(),
  unique (company_id, user_id)
);

create index company_members_user_idx on public.company_members(user_id);
create index company_members_company_idx on public.company_members(company_id);

-- ============================================================================
-- JOBS
-- ============================================================================

create table public.jobs (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies(id) on delete cascade,
  title text not null,
  description text not null,
  employment_type job_employment_type not null,
  work_mode job_work_mode not null,
  location text,
  salary_min integer,
  salary_max integer,
  salary_currency text not null default 'GBP',
  skills_required text[] not null default '{}',
  experience_level job_experience_level not null,
  apply_method job_apply_method not null default 'native',
  external_apply_url text,
  status job_status not null default 'draft',
  featured boolean not null default false,
  featured_until timestamptz,
  posted_at timestamptz,
  expires_at timestamptz,
  search_vector tsvector,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint external_url_required_when_external check (
    apply_method <> 'external' or external_apply_url is not null
  )
);

create index jobs_status_posted_idx on public.jobs(status, posted_at desc) where status = 'published';
create index jobs_skills_idx on public.jobs using gin(skills_required);
create index jobs_search_idx on public.jobs using gin(search_vector);

create function public.jobs_search_vector_update() returns trigger as $$
begin
  new.search_vector := to_tsvector('english', coalesce(new.title, '') || ' ' || coalesce(new.description, ''));
  return new;
end;
$$ language plpgsql;

create trigger jobs_search_vector_trigger
  before insert or update of title, description on public.jobs
  for each row execute function public.jobs_search_vector_update();

-- ============================================================================
-- APPLICATIONS
-- ============================================================================

create table public.applications (
  id uuid primary key default gen_random_uuid(),
  job_id uuid not null references public.jobs(id) on delete cascade,
  user_id uuid references public.users(id) on delete set null,
  cover_letter text,
  cv_file_id uuid,
  status application_status not null default 'submitted',
  withdrawn boolean not null default false,
  withdrawn_at timestamptz,
  submitted_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (job_id, user_id)
);

create index applications_user_idx on public.applications(user_id);
create index applications_job_idx on public.applications(job_id);

-- ============================================================================
-- EXTERNAL APPLY CLICKS
-- ============================================================================

create table public.external_apply_clicks (
  id uuid primary key default gen_random_uuid(),
  job_id uuid not null references public.jobs(id) on delete cascade,
  user_id uuid references public.users(id) on delete set null,
  clicked_at timestamptz not null default now()
);

create index external_apply_clicks_job_idx on public.external_apply_clicks(job_id);

-- ============================================================================
-- CV FILES
-- ============================================================================

create table public.cv_files (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.users(id) on delete cascade,
  r2_object_key text not null unique,
  filename text not null,
  mime_type text not null,
  size_bytes integer not null,
  is_primary boolean not null default false,
  uploaded_at timestamptz not null default now(),
  constraint cv_size_max check (size_bytes <= 5 * 1024 * 1024)
);

create index cv_files_user_idx on public.cv_files(user_id);

alter table public.job_seeker_profiles
  add constraint job_seeker_profiles_primary_cv_fk
  foreign key (primary_cv_id) references public.cv_files(id) on delete set null;

alter table public.applications
  add constraint applications_cv_file_fk
  foreign key (cv_file_id) references public.cv_files(id) on delete set null;

-- ============================================================================
-- JOB ALERTS
-- ============================================================================

create table public.job_alerts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.users(id) on delete cascade,
  name text not null,
  filters jsonb not null default '{}'::jsonb,
  frequency alert_frequency not null default 'daily',
  is_premium boolean not null default false,
  created_at timestamptz not null default now()
);

create index job_alerts_user_idx on public.job_alerts(user_id);

create table public.alert_deliveries (
  id uuid primary key default gen_random_uuid(),
  alert_id uuid not null references public.job_alerts(id) on delete cascade,
  job_id uuid not null references public.jobs(id) on delete cascade,
  sent_at timestamptz not null default now(),
  unique (alert_id, job_id)
);

-- ============================================================================
-- SAVED JOBS
-- ============================================================================

create table public.saved_jobs (
  user_id uuid not null references public.users(id) on delete cascade,
  job_id uuid not null references public.jobs(id) on delete cascade,
  saved_at timestamptz not null default now(),
  primary key (user_id, job_id)
);

-- ============================================================================
-- SUBSCRIPTIONS / PAYMENTS
-- ============================================================================

create table public.subscriptions (
  id uuid primary key default gen_random_uuid(),
  owner_type subscription_owner_type not null,
  owner_id uuid not null,
  plan_key text not null,
  status text not null,
  started_at timestamptz not null default now(),
  current_period_end timestamptz,
  stripe_subscription_id text unique,
  stripe_customer_id text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index subscriptions_owner_idx on public.subscriptions(owner_type, owner_id);

create table public.payments (
  id uuid primary key default gen_random_uuid(),
  owner_type subscription_owner_type not null,
  owner_id uuid not null,
  amount_cents integer not null,
  currency text not null default 'GBP',
  purpose payment_purpose not null,
  related_id uuid,
  status text not null,
  stripe_payment_intent_id text unique,
  created_at timestamptz not null default now()
);

create index payments_owner_idx on public.payments(owner_type, owner_id);

-- ============================================================================
-- APP SETTINGS
-- ============================================================================

create table public.app_settings (
  key text primary key,
  value jsonb not null,
  updated_at timestamptz not null default now(),
  updated_by uuid references public.users(id)
);

insert into public.app_settings (key, value) values
  ('job_posting_paid', 'false'::jsonb),
  ('instant_alerts_paid', 'false'::jsonb),
  ('user_approval_required', 'false'::jsonb),
  ('company_approval_required', 'false'::jsonb),
  ('signup_disabled', 'false'::jsonb),
  ('feature_alerts_enabled', 'true'::jsonb),
  ('feature_external_apply_enabled', 'true'::jsonb),
  ('default_job_expiry_days', '60'::jsonb);

-- ============================================================================
-- CONSENT LOG (append-only)
-- ============================================================================

create table public.consent_log (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references public.users(id) on delete set null,
  event_type consent_event_type not null,
  policy_version text,
  metadata jsonb,
  recorded_at timestamptz not null default now()
);

create index consent_log_user_idx on public.consent_log(user_id);

-- ============================================================================
-- AUDIT LOG (append-only)
-- ============================================================================

create table public.audit_log (
  id uuid primary key default gen_random_uuid(),
  actor_id uuid references public.users(id) on delete set null,
  actor_type text not null,
  action text not null,
  target_type text,
  target_id uuid,
  metadata jsonb,
  created_at timestamptz not null default now()
);

create index audit_log_actor_idx on public.audit_log(actor_id);
create index audit_log_target_idx on public.audit_log(target_type, target_id);

-- ============================================================================
-- DATA EXPORT REQUESTS
-- ============================================================================

create table public.data_export_requests (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.users(id) on delete cascade,
  status text not null default 'pending',
  r2_object_key text,
  requested_at timestamptz not null default now(),
  completed_at timestamptz
);

-- ============================================================================
-- REPORTS
-- ============================================================================

create table public.reports (
  id uuid primary key default gen_random_uuid(),
  reporter_user_id uuid not null references public.users(id) on delete cascade,
  target_type report_target_type not null,
  target_id uuid not null,
  reason report_reason not null,
  description text,
  status report_status not null default 'open',
  reviewed_by uuid references public.users(id),
  reviewed_at timestamptz,
  action_taken text,
  created_at timestamptz not null default now()
);

create index reports_status_idx on public.reports(status) where status = 'open';

-- ============================================================================
-- updated_at triggers
-- ============================================================================

create function public.set_updated_at() returns trigger as $$
begin
  new.updated_at := now();
  return new;
end;
$$ language plpgsql;

create trigger users_updated_at before update on public.users for each row execute function public.set_updated_at();
create trigger job_seeker_profiles_updated_at before update on public.job_seeker_profiles for each row execute function public.set_updated_at();
create trigger companies_updated_at before update on public.companies for each row execute function public.set_updated_at();
create trigger jobs_updated_at before update on public.jobs for each row execute function public.set_updated_at();
create trigger applications_updated_at before update on public.applications for each row execute function public.set_updated_at();
create trigger app_settings_updated_at before update on public.app_settings for each row execute function public.set_updated_at();
create trigger subscriptions_updated_at before update on public.subscriptions for each row execute function public.set_updated_at();

-- ============================================================================
-- AUTO-CREATE public.users ROW WHEN auth.users ROW IS CREATED
-- ============================================================================

create function public.handle_new_user() returns trigger
  language plpgsql security definer set search_path = public as $$
begin
  insert into public.users (id, email, name)
  values (
    new.id,
    new.email,
    coalesce(new.raw_user_meta_data->>'name', new.raw_user_meta_data->>'full_name')
  );
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();
