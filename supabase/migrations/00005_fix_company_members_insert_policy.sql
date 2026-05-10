-- Fix: company_members_insert_owner policy in 00002 causes infinite recursion
-- because the WITH CHECK clause queries public.company_members while inserting into it.
-- Solution: introduce a security-definer helper that reads company_members without
-- triggering RLS, then reference that helper from the policy instead.

create function public.is_company_owner(p_company_id uuid) returns boolean
  language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from public.company_members
    where company_id = p_company_id and user_id = auth.uid() and role = 'owner'
  );
$$;

drop policy company_members_insert_owner on public.company_members;

create policy company_members_insert_owner on public.company_members
  for insert with check (
    user_id = auth.uid()
    or public.is_company_owner(company_id)
  );
