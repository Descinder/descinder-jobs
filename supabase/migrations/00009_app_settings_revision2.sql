insert into public.app_settings (key, value) values
  ('seeker_subscription_paid', 'true'::jsonb),
  ('feature_ai_cv_enabled', 'true'::jsonb),
  ('ai_cv_monthly_cap', '30'::jsonb),
  ('seeker_subscription_price_gbp', '14.99'::jsonb),
  ('job_post_price_gbp', '99'::jsonb),
  ('featured_listing_price_gbp', '49'::jsonb)
on conflict (key) do nothing;

update public.app_settings set value = 'true'::jsonb where key = 'instant_alerts_paid';

drop trigger if exists cv_files_max_3 on public.cv_files;
drop function if exists public.enforce_cv_files_max_3();

create function public.enforce_cv_files_base_cap() returns trigger as $$
begin
  if new.kind in ('uploaded_base', 'profile_built') then
    if (
      select count(*) from public.cv_files
      where user_id = new.user_id and kind in ('uploaded_base', 'profile_built')
    ) >= 3 then
      raise exception 'Base CV limit (3) reached for user %', new.user_id;
    end if;
  end if;
  return new;
end;
$$ language plpgsql;

create trigger cv_files_base_cap
  before insert on public.cv_files
  for each row execute function public.enforce_cv_files_base_cap();
