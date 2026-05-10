-- Fix: company_members_select_self policy in 00002 causes infinite recursion
-- because the USING clause queries public.company_members while already selecting from it.
-- Solution: introduce a security-definer helper for membership lookup and rebuild the policy.

create function public.is_company_member(p_company_id uuid) returns boolean
  language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from public.company_members
    where company_id = p_company_id and user_id = auth.uid()
  );
$$;

drop policy company_members_select_self on public.company_members;

create policy company_members_select_self on public.company_members
  for select using (
    user_id = auth.uid()
    or public.is_company_member(company_id)
    or public.is_admin()
  );
