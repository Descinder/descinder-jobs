-- Ensure Supabase `service_role` (the RLS-bypassing role the app's server
-- code uses) has full DML on every `public.*` table + sequence. Newer local
-- Supabase images do not auto-grant these on a fresh `db reset`, leaving
-- `service_role` unable to insert/update/delete anything → every app path
-- (signup, alerts, applications, cvs, ...) 500s with "permission denied".
-- Idempotent (safe to re-run; ALTER DEFAULT PRIVILEGES only adjusts future
-- grants, existing grants are just re-asserted).
grant usage on schema public to service_role;
grant select, insert, update, delete on all tables in schema public to service_role;
grant usage, select on all sequences in schema public to service_role;
-- ALTER DEFAULT PRIVILEGES here attaches to the migration session's role
-- (postgres — the only role Supabase applies migrations under). L1 reviewer
-- suggestion to also FOR ROLE supabase_admin is rejected: Supabase's postgres
-- is NOT a full superuser and cannot alter another role's defaults (permission
-- denied). If a future table is ever created by a different role, add an
-- explicit `grant select, insert, update, delete on <t> to service_role;` in
-- that migration.
alter default privileges in schema public grant select, insert, update, delete on tables to service_role;
alter default privileges in schema public grant usage, select on sequences to service_role;
