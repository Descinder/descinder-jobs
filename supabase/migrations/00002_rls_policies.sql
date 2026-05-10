-- Descinder Jobs — RLS policies for all tables

-- ============================================================================
-- Helper: current user role
-- ============================================================================

create function public.current_user_role() returns user_role
  language sql stable security definer set search_path = public as $$
  select role from public.users where id = auth.uid();
$$;

create function public.is_admin() returns boolean
  language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.users where id = auth.uid() and role = 'admin');
$$;

-- ============================================================================
-- USERS
-- ============================================================================

alter table public.users enable row level security;

create policy users_select_self on public.users
  for select using (id = auth.uid() or public.is_admin());

create policy users_update_self on public.users
  for update using (id = auth.uid())
  with check (id = auth.uid() and role = (select role from public.users where id = auth.uid()));

create policy users_admin_all on public.users
  for all using (public.is_admin()) with check (public.is_admin());

-- ============================================================================
-- JOB SEEKER PROFILES
-- ============================================================================

alter table public.job_seeker_profiles enable row level security;

create policy seeker_profiles_select_self on public.job_seeker_profiles
  for select using (user_id = auth.uid() or public.is_admin());

create policy seeker_profiles_insert_self on public.job_seeker_profiles
  for insert with check (user_id = auth.uid());

create policy seeker_profiles_update_self on public.job_seeker_profiles
  for update using (user_id = auth.uid()) with check (user_id = auth.uid());

create policy seeker_profiles_admin_all on public.job_seeker_profiles
  for all using (public.is_admin()) with check (public.is_admin());

-- ============================================================================
-- COMPANIES
-- ============================================================================

alter table public.companies enable row level security;

create policy companies_select_all on public.companies
  for select using (suspended_at is null or public.is_admin());

create policy companies_insert_authed on public.companies
  for insert with check (auth.uid() is not null);

create policy companies_update_owner on public.companies
  for update using (
    exists (
      select 1 from public.company_members cm
      where cm.company_id = id and cm.user_id = auth.uid() and cm.role = 'owner'
    )
  );

create policy companies_admin_all on public.companies
  for all using (public.is_admin()) with check (public.is_admin());

-- ============================================================================
-- COMPANY MEMBERS
-- ============================================================================

alter table public.company_members enable row level security;

create policy company_members_select_self on public.company_members
  for select using (
    user_id = auth.uid()
    or exists (
      select 1 from public.company_members cm2
      where cm2.company_id = company_id and cm2.user_id = auth.uid()
    )
    or public.is_admin()
  );

create policy company_members_insert_owner on public.company_members
  for insert with check (
    user_id = auth.uid()
    or exists (
      select 1 from public.company_members cm
      where cm.company_id = company_id and cm.user_id = auth.uid() and cm.role = 'owner'
    )
  );

create policy company_members_admin_all on public.company_members
  for all using (public.is_admin()) with check (public.is_admin());

-- ============================================================================
-- JOBS
-- ============================================================================

alter table public.jobs enable row level security;

create policy jobs_select_published on public.jobs
  for select using (status = 'published' or public.is_admin() or exists (
    select 1 from public.company_members cm
    where cm.company_id = jobs.company_id and cm.user_id = auth.uid()
  ));

create policy jobs_crud_company on public.jobs
  for all using (
    exists (
      select 1 from public.company_members cm
      where cm.company_id = jobs.company_id and cm.user_id = auth.uid()
    )
  ) with check (
    exists (
      select 1 from public.company_members cm
      where cm.company_id = jobs.company_id and cm.user_id = auth.uid()
    )
  );

create policy jobs_admin_all on public.jobs
  for all using (public.is_admin()) with check (public.is_admin());

-- ============================================================================
-- APPLICATIONS
-- ============================================================================

alter table public.applications enable row level security;

create policy applications_select_self on public.applications
  for select using (
    user_id = auth.uid()
    or exists (
      select 1 from public.jobs j
      join public.company_members cm on cm.company_id = j.company_id
      where j.id = applications.job_id and cm.user_id = auth.uid()
    )
    or public.is_admin()
  );

create policy applications_insert_self on public.applications
  for insert with check (user_id = auth.uid());

create policy applications_update_self_or_company on public.applications
  for update using (
    user_id = auth.uid()
    or exists (
      select 1 from public.jobs j
      join public.company_members cm on cm.company_id = j.company_id
      where j.id = applications.job_id and cm.user_id = auth.uid()
    )
  );

-- ============================================================================
-- EXTERNAL APPLY CLICKS
-- ============================================================================

alter table public.external_apply_clicks enable row level security;

create policy external_apply_clicks_insert_any on public.external_apply_clicks
  for insert with check (true);

create policy external_apply_clicks_select_company on public.external_apply_clicks
  for select using (
    exists (
      select 1 from public.jobs j
      join public.company_members cm on cm.company_id = j.company_id
      where j.id = external_apply_clicks.job_id and cm.user_id = auth.uid()
    )
    or public.is_admin()
  );

-- ============================================================================
-- CV FILES
-- ============================================================================

alter table public.cv_files enable row level security;

create policy cv_files_owner_all on public.cv_files
  for all using (user_id = auth.uid()) with check (user_id = auth.uid());

create policy cv_files_company_select on public.cv_files
  for select using (
    exists (
      select 1 from public.applications a
      join public.jobs j on j.id = a.job_id
      join public.company_members cm on cm.company_id = j.company_id
      where a.cv_file_id = cv_files.id and cm.user_id = auth.uid()
    )
  );

-- ============================================================================
-- JOB ALERTS / DELIVERIES / SAVED JOBS
-- ============================================================================

alter table public.job_alerts enable row level security;
create policy job_alerts_owner_all on public.job_alerts
  for all using (user_id = auth.uid()) with check (user_id = auth.uid());

alter table public.alert_deliveries enable row level security;
create policy alert_deliveries_owner_select on public.alert_deliveries
  for select using (
    exists (select 1 from public.job_alerts a where a.id = alert_deliveries.alert_id and a.user_id = auth.uid())
  );

alter table public.saved_jobs enable row level security;
create policy saved_jobs_owner_all on public.saved_jobs
  for all using (user_id = auth.uid()) with check (user_id = auth.uid());

-- ============================================================================
-- SUBSCRIPTIONS / PAYMENTS
-- ============================================================================

alter table public.subscriptions enable row level security;
create policy subscriptions_owner_select on public.subscriptions
  for select using (
    (owner_type = 'user' and owner_id = auth.uid())
    or (owner_type = 'company' and exists (
      select 1 from public.company_members cm
      where cm.company_id = owner_id and cm.user_id = auth.uid()
    ))
    or public.is_admin()
  );

alter table public.payments enable row level security;
create policy payments_owner_select on public.payments
  for select using (
    (owner_type = 'user' and owner_id = auth.uid())
    or (owner_type = 'company' and exists (
      select 1 from public.company_members cm
      where cm.company_id = owner_id and cm.user_id = auth.uid()
    ))
    or public.is_admin()
  );

-- ============================================================================
-- APP SETTINGS
-- ============================================================================

alter table public.app_settings enable row level security;
create policy app_settings_select_all on public.app_settings
  for select using (true);
create policy app_settings_admin_write on public.app_settings
  for all using (public.is_admin()) with check (public.is_admin());

-- ============================================================================
-- CONSENT LOG
-- ============================================================================

alter table public.consent_log enable row level security;
create policy consent_log_insert_any on public.consent_log
  for insert with check (true);
create policy consent_log_select_self on public.consent_log
  for select using (user_id = auth.uid() or public.is_admin());

-- ============================================================================
-- AUDIT LOG
-- ============================================================================

alter table public.audit_log enable row level security;
create policy audit_log_admin_select on public.audit_log
  for select using (public.is_admin());

-- ============================================================================
-- DATA EXPORT REQUESTS / REPORTS
-- ============================================================================

alter table public.data_export_requests enable row level security;
create policy data_export_requests_owner on public.data_export_requests
  for all using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy data_export_requests_admin on public.data_export_requests
  for all using (public.is_admin()) with check (public.is_admin());

alter table public.reports enable row level security;
create policy reports_insert_authed on public.reports
  for insert with check (auth.uid() is not null and reporter_user_id = auth.uid());
create policy reports_select_own_or_admin on public.reports
  for select using (reporter_user_id = auth.uid() or public.is_admin());
create policy reports_admin_all on public.reports
  for update using (public.is_admin()) with check (public.is_admin());
