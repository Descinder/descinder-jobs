-- Fix: original users_update_self policy in 00002 had
--   with check (id = auth.uid() and role = (select role from public.users where id = auth.uid()))
-- which blocks the legitimate signup-time role change between job_seeker and employer.
-- The original intent was just to prevent self-elevation to admin. Replace with a check
-- that bans self-elevation to admin but allows role choice between job_seeker and employer.

drop policy users_update_self on public.users;

create policy users_update_self on public.users
  for update using (id = auth.uid())
  with check (id = auth.uid() and role <> 'admin');
