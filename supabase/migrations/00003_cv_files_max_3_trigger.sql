-- Enforce max 3 CV files per user

create function public.enforce_cv_files_max_3() returns trigger as $$
begin
  if (select count(*) from public.cv_files where user_id = new.user_id) >= 3 then
    raise exception 'CV file limit (3) reached for user %', new.user_id;
  end if;
  return new;
end;
$$ language plpgsql;

create trigger cv_files_max_3
  before insert on public.cv_files
  for each row execute function public.enforce_cv_files_max_3();
