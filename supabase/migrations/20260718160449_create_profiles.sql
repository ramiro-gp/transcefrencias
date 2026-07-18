create schema if not exists private;

revoke all on schema private from public;
revoke all on schema private from anon, authenticated;

create table public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  full_name text not null,
  nickname text,
  created_at timestamp with time zone not null default statement_timestamp(),
  updated_at timestamp with time zone not null default statement_timestamp(),

  constraint profiles_full_name_valid check (
    full_name = btrim(full_name)
    and char_length(full_name) between 1 and 100
    and full_name !~ '[[:cntrl:]]'
  ),
  constraint profiles_nickname_valid check (
    nickname is null
    or (
      nickname = btrim(nickname)
      and char_length(nickname) between 1 and 50
      and nickname !~ '[[:cntrl:]]'
    )
  )
);

create function private.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  profile_full_name text;
  profile_nickname text;
begin
  if jsonb_typeof(new.raw_user_meta_data -> 'full_name') is distinct from 'string' then
    raise exception 'Profile full_name must be a string.' using errcode = '22023';
  end if;

  profile_full_name := btrim(new.raw_user_meta_data ->> 'full_name');

  if not (new.raw_user_meta_data ? 'nickname')
    or jsonb_typeof(new.raw_user_meta_data -> 'nickname') = 'null'
  then
    profile_nickname := null;
  elsif jsonb_typeof(new.raw_user_meta_data -> 'nickname') <> 'string' then
    raise exception 'Profile nickname must be a string or null.' using errcode = '22023';
  else
    profile_nickname := nullif(btrim(new.raw_user_meta_data ->> 'nickname'), '');
  end if;

  insert into public.profiles (id, full_name, nickname)
  values (new.id, profile_full_name, profile_nickname);

  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function private.handle_new_user();

create function private.set_profile_updated_at()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at := statement_timestamp();
  return new;
end;
$$;

create trigger profiles_set_updated_at
  before update on public.profiles
  for each row execute function private.set_profile_updated_at();

revoke all on function private.handle_new_user() from public, anon, authenticated;
revoke all on function private.set_profile_updated_at() from public, anon, authenticated;

revoke all on table public.profiles from public, anon, authenticated;
grant select on table public.profiles to authenticated;
grant update (full_name, nickname) on table public.profiles to authenticated;

alter table public.profiles enable row level security;

create policy profiles_select_own
  on public.profiles
  for select
  to authenticated
  using ((select auth.uid()) is not null and (select auth.uid()) = id);

create policy profiles_update_own
  on public.profiles
  for update
  to authenticated
  using ((select auth.uid()) is not null and (select auth.uid()) = id)
  with check ((select auth.uid()) is not null and (select auth.uid()) = id);
