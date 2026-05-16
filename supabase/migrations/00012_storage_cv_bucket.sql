-- Local Supabase Storage: ensure the private 'cvs' bucket exists.
-- (Production uses Cloudflare R2; the bucket there is created in the Cloudflare
-- dashboard at deploy time. This migration only matters for local Supabase Storage.)
insert into storage.buckets (id, name, public)
values ('cvs', 'cvs', false)
on conflict (id) do nothing;
