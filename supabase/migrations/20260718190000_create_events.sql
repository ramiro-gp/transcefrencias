create table public.events (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  owner_id uuid not null references public.profiles (id) on delete restrict,
  status text not null default 'loading_expenses',
  created_at timestamp with time zone not null default statement_timestamp(),
  updated_at timestamp with time zone not null default statement_timestamp(),
  last_activity_at timestamp with time zone not null default statement_timestamp(),
  constraint events_name_valid check (
    name = btrim(name) and char_length(name) between 1 and 100 and name !~ '[[:cntrl:]]'
  ),
  constraint events_status_valid check (status = 'loading_expenses')
);

create table public.event_members (
  event_id uuid not null references public.events (id) on delete restrict,
  profile_id uuid not null references public.profiles (id) on delete restrict,
  role text not null default 'member',
  joined_at timestamp with time zone not null default statement_timestamp(),
  left_at timestamp with time zone,
  primary key (event_id, profile_id),
  constraint event_members_role_valid check (role in ('owner', 'coadmin', 'member')),
  constraint event_members_left_after_join check (left_at is null or left_at >= joined_at)
);

create table public.participants (
  id uuid primary key default gen_random_uuid(),
  event_id uuid not null references public.events (id) on delete restrict,
  profile_id uuid references public.profiles (id) on delete restrict,
  display_name text not null,
  active boolean not null default true,
  merged_into_id uuid references public.participants (id) on delete restrict,
  created_at timestamp with time zone not null default statement_timestamp(),
  deactivated_at timestamp with time zone,
  constraint participants_display_name_valid check (
    display_name = btrim(display_name)
    and char_length(display_name) between 1 and 100
    and display_name !~ '[[:cntrl:]]'
  ),
  constraint participants_merge_valid check (
    (active and merged_into_id is null and deactivated_at is null)
    or (not active and deactivated_at is not null)
  )
);

create unique index participants_one_active_profile_per_event
  on public.participants (event_id, profile_id)
  where active and profile_id is not null;

create table public.audit_log (
  id uuid primary key default gen_random_uuid(),
  event_id uuid not null references public.events (id) on delete restrict,
  actor_id uuid references public.profiles (id) on delete restrict,
  action text not null,
  summary text not null,
  created_at timestamp with time zone not null default statement_timestamp(),
  constraint audit_log_action_valid check (action ~ '^[a-z_]+$'),
  constraint audit_log_summary_valid check (char_length(summary) between 1 and 300 and summary !~ '[[:cntrl:]]')
);

create schema if not exists private;
revoke all on schema private from public, anon, authenticated;

create table private.event_invitations (
  id uuid primary key default gen_random_uuid(),
  event_id uuid not null references public.events (id) on delete restrict,
  secret_hash text not null,
  created_at timestamp with time zone not null default statement_timestamp(),
  revoked_at timestamp with time zone,
  constraint event_invitations_hash_valid check (secret_hash ~ '^[0-9a-f]{64}$')
);

create unique index event_invitations_one_active_per_event
  on private.event_invitations (event_id)
  where revoked_at is null;

create function private.current_user_id()
returns uuid language sql stable set search_path = '' as $$
  select auth.uid()
$$;

create function private.is_active_member(target_event_id uuid, target_profile_id uuid)
returns boolean language sql stable security definer set search_path = '' as $$
  select exists (
    select 1 from public.event_members
    where event_id = target_event_id and profile_id = target_profile_id and left_at is null
  )
$$;

create function private.is_owner(target_event_id uuid, target_profile_id uuid)
returns boolean language sql stable security definer set search_path = '' as $$
  select exists (
    select 1 from public.event_members
    where event_id = target_event_id and profile_id = target_profile_id and role = 'owner' and left_at is null
  )
$$;

create function private.is_event_admin(target_event_id uuid, target_profile_id uuid)
returns boolean language sql stable security definer set search_path = '' as $$
  select exists (
    select 1 from public.event_members
    where event_id = target_event_id and profile_id = target_profile_id and role in ('owner', 'coadmin') and left_at is null
  )
$$;

create function private.can_view_profile(target_profile_id uuid)
returns boolean language sql stable security definer set search_path = '' as $$
  select exists (
    select 1
    from public.event_members mine
    join public.event_members theirs on theirs.event_id = mine.event_id
    where mine.profile_id = auth.uid() and mine.left_at is null
      and theirs.profile_id = target_profile_id and theirs.left_at is null
  )
$$;

create function private.invitation_secret()
returns text language sql volatile set search_path = '' as $$
  select encode(extensions.gen_random_bytes(32), 'hex')
$$;

create function private.touch_event(target_event_id uuid)
returns void language sql security definer set search_path = '' as $$
  update public.events set updated_at = statement_timestamp(), last_activity_at = statement_timestamp()
  where id = target_event_id
$$;

create function private.write_audit(target_event_id uuid, target_actor_id uuid, target_action text, target_summary text)
returns void language sql security definer set search_path = '' as $$
  insert into public.audit_log (event_id, actor_id, action, summary)
  values (target_event_id, target_actor_id, target_action, target_summary)
$$;

create function public.create_event(event_name text)
returns jsonb language plpgsql security definer set search_path = '' as $$
declare
  actor_id uuid := auth.uid();
  created_event public.events;
  invite_id uuid;
  secret text;
  participant_name text;
begin
  if actor_id is null then raise exception 'Authentication required.' using errcode = '42501'; end if;
  event_name := btrim(event_name);
  if char_length(event_name) not between 1 and 100 or event_name ~ '[[:cntrl:]]' then
    raise exception 'Invalid event name.' using errcode = '22023';
  end if;
  select coalesce(nickname, full_name) into participant_name from public.profiles where id = actor_id;
  if participant_name is null then raise exception 'Profile not found.' using errcode = 'P0001'; end if;
  insert into public.events (name, owner_id) values (event_name, actor_id) returning * into created_event;
  insert into public.event_members (event_id, profile_id, role) values (created_event.id, actor_id, 'owner');
  insert into public.participants (event_id, profile_id, display_name) values (created_event.id, actor_id, participant_name);
  secret := private.invitation_secret();
  insert into private.event_invitations (event_id, secret_hash)
  values (created_event.id, encode(extensions.digest(secret, 'sha256'), 'hex')) returning id into invite_id;
  perform private.write_audit(created_event.id, actor_id, 'event_created', 'Evento creado.');
  return jsonb_build_object('event_id', created_event.id, 'invitation_id', invite_id, 'secret', secret);
end;
$$;

create function public.get_invitation_preview(invitation_id uuid, invitation_secret text)
returns jsonb language plpgsql security definer set search_path = '' as $$
declare actor_id uuid := auth.uid(); result jsonb;
begin
  if actor_id is null then raise exception 'Authentication required.' using errcode = '42501'; end if;
  select jsonb_build_object('event_id', e.id, 'name', e.name, 'already_member', private.is_active_member(e.id, actor_id))
  into result
  from private.event_invitations i join public.events e on e.id = i.event_id
  where i.id = invitation_id and i.revoked_at is null
    and i.secret_hash = encode(extensions.digest(invitation_secret, 'sha256'), 'hex');
  if result is null then raise exception 'Invalid invitation.' using errcode = '22023'; end if;
  return result;
end;
$$;

create function public.join_event(invitation_id uuid, invitation_secret text)
returns uuid language plpgsql security definer set search_path = '' as $$
declare actor_id uuid := auth.uid(); target_event_id uuid; participant_name text;
begin
  if actor_id is null then raise exception 'Authentication required.' using errcode = '42501'; end if;
  select event_id into target_event_id from private.event_invitations
  where id = invitation_id and revoked_at is null and secret_hash = encode(extensions.digest(invitation_secret, 'sha256'), 'hex');
  if target_event_id is null then raise exception 'Invalid invitation.' using errcode = '22023'; end if;
  select coalesce(nickname, full_name) into participant_name from public.profiles where id = actor_id;
  if participant_name is null then raise exception 'Profile not found.' using errcode = 'P0001'; end if;
  insert into public.event_members (event_id, profile_id, role) values (target_event_id, actor_id, 'member')
  on conflict (event_id, profile_id) do update set role = 'member', left_at = null, joined_at = statement_timestamp();
  update public.participants set active = true, deactivated_at = null, merged_into_id = null
  where event_id = target_event_id and profile_id = actor_id;
  if not found then
    insert into public.participants (event_id, profile_id, display_name) values (target_event_id, actor_id, participant_name);
  end if;
  perform private.touch_event(target_event_id);
  perform private.write_audit(target_event_id, actor_id, 'member_joined', 'Se unió al evento.');
  return target_event_id;
end;
$$;

create function public.leave_event(target_event_id uuid)
returns void language plpgsql security definer set search_path = '' as $$
declare actor_id uuid := auth.uid(); current_role text;
begin
  if actor_id is null then raise exception 'Authentication required.' using errcode = '42501'; end if;
  select role into current_role from public.event_members where event_id = target_event_id and profile_id = actor_id and left_at is null;
  if current_role is null then raise exception 'Active membership required.' using errcode = '42501'; end if;
  if current_role = 'owner' then raise exception 'The owner cannot leave the event.' using errcode = '22023'; end if;
  update public.event_members set role = 'member', left_at = statement_timestamp() where event_id = target_event_id and profile_id = actor_id;
  update public.participants set active = false, deactivated_at = statement_timestamp() where event_id = target_event_id and profile_id = actor_id and active;
  perform private.touch_event(target_event_id);
  perform private.write_audit(target_event_id, actor_id, 'member_left', 'Salió del evento.');
end;
$$;

create function public.set_coadmin(target_event_id uuid, target_profile_id uuid, make_coadmin boolean)
returns void language plpgsql security definer set search_path = '' as $$
declare actor_id uuid := auth.uid();
begin
  if actor_id is null or not private.is_owner(target_event_id, actor_id) then raise exception 'Owner permission required.' using errcode = '42501'; end if;
  if target_profile_id = actor_id then raise exception 'The owner role cannot be changed.' using errcode = '22023'; end if;
  update public.event_members set role = case when make_coadmin then 'coadmin' else 'member' end
  where event_id = target_event_id and profile_id = target_profile_id and left_at is null;
  if not found then raise exception 'Active member not found.' using errcode = '22023'; end if;
  perform private.touch_event(target_event_id);
  perform private.write_audit(target_event_id, actor_id, case when make_coadmin then 'coadmin_added' else 'coadmin_removed' end, case when make_coadmin then 'Nombró un coadministrador.' else 'Removió un coadministrador.' end);
end;
$$;

create function public.rename_event(target_event_id uuid, event_name text)
returns void language plpgsql security definer set search_path = '' as $$
declare actor_id uuid := auth.uid();
begin
  if actor_id is null or not private.is_event_admin(target_event_id, actor_id) then raise exception 'Administrator permission required.' using errcode = '42501'; end if;
  event_name := btrim(event_name);
  if char_length(event_name) not between 1 and 100 or event_name ~ '[[:cntrl:]]' then raise exception 'Invalid event name.' using errcode = '22023'; end if;
  update public.events set name = event_name where id = target_event_id;
  perform private.touch_event(target_event_id); perform private.write_audit(target_event_id, actor_id, 'event_renamed', 'Renombró el evento.');
end;
$$;

create function public.rotate_event_invitation(target_event_id uuid, revoke_only boolean default false)
returns jsonb language plpgsql security definer set search_path = '' as $$
declare actor_id uuid := auth.uid(); secret text; invite_id uuid;
begin
  if actor_id is null or not private.is_owner(target_event_id, actor_id) then raise exception 'Owner permission required.' using errcode = '42501'; end if;
  update private.event_invitations set revoked_at = statement_timestamp() where event_id = target_event_id and revoked_at is null;
  if revoke_only then
    perform private.touch_event(target_event_id); perform private.write_audit(target_event_id, actor_id, 'invitation_revoked', 'Revocó la invitación.'); return null;
  end if;
  secret := private.invitation_secret();
  insert into private.event_invitations (event_id, secret_hash) values (target_event_id, encode(extensions.digest(secret, 'sha256'), 'hex')) returning id into invite_id;
  perform private.touch_event(target_event_id); perform private.write_audit(target_event_id, actor_id, 'invitation_regenerated', 'Regeneró la invitación.');
  return jsonb_build_object('invitation_id', invite_id, 'secret', secret);
end;
$$;

create function public.create_manual_participant(target_event_id uuid, participant_name text)
returns uuid language plpgsql security definer set search_path = '' as $$
declare actor_id uuid := auth.uid(); participant_id uuid;
begin
  if actor_id is null or not private.is_active_member(target_event_id, actor_id) then raise exception 'Active membership required.' using errcode = '42501'; end if;
  participant_name := btrim(participant_name);
  if char_length(participant_name) not between 1 and 100 or participant_name ~ '[[:cntrl:]]' then raise exception 'Invalid participant name.' using errcode = '22023'; end if;
  insert into public.participants (event_id, display_name) values (target_event_id, participant_name) returning id into participant_id;
  perform private.touch_event(target_event_id); perform private.write_audit(target_event_id, actor_id, 'manual_participant_created', 'Agregó un participante manual.');
  return participant_id;
end;
$$;

create function public.deactivate_participant(target_participant_id uuid)
returns void language plpgsql security definer set search_path = '' as $$
declare actor_id uuid := auth.uid(); target_event_id uuid; linked_profile_id uuid;
begin
  select event_id, profile_id into target_event_id, linked_profile_id from public.participants where id = target_participant_id and active;
  if target_event_id is null or actor_id is null or not private.is_event_admin(target_event_id, actor_id) then raise exception 'Administrator permission required.' using errcode = '42501'; end if;
  if linked_profile_id is not null then raise exception 'Account participants are managed by membership.' using errcode = '22023'; end if;
  update public.participants set active = false, deactivated_at = statement_timestamp() where id = target_participant_id;
  perform private.touch_event(target_event_id); perform private.write_audit(target_event_id, actor_id, 'participant_deactivated', 'Desactivó un participante manual.');
end;
$$;

create function public.link_manual_participant(target_participant_id uuid, target_profile_id uuid)
returns void language plpgsql security definer set search_path = '' as $$
declare actor_id uuid := auth.uid(); target_event_id uuid; account_participant_id uuid;
begin
  select event_id into target_event_id from public.participants where id = target_participant_id and active and profile_id is null;
  if target_event_id is null or actor_id is null or not private.is_event_admin(target_event_id, actor_id) then raise exception 'Administrator permission required.' using errcode = '42501'; end if;
  if not private.is_active_member(target_event_id, target_profile_id) then raise exception 'The account must be an active event member.' using errcode = '22023'; end if;
  select id into account_participant_id from public.participants where event_id = target_event_id and profile_id = target_profile_id and active;
  if account_participant_id is null then
    update public.participants set profile_id = target_profile_id where id = target_participant_id;
  else
    update public.participants set active = false, deactivated_at = statement_timestamp(), merged_into_id = account_participant_id where id = target_participant_id;
  end if;
  perform private.touch_event(target_event_id); perform private.write_audit(target_event_id, actor_id, 'participant_linked', 'Vinculó un participante manual.');
end;
$$;

revoke all on all tables in schema public from anon, authenticated;
revoke all on all tables in schema private from public, anon, authenticated;
grant select on public.profiles to authenticated;
grant update (full_name, nickname) on public.profiles to authenticated;
grant select on public.events, public.event_members, public.participants, public.audit_log to authenticated;
revoke all on all functions in schema private from public, anon, authenticated;
grant execute on function private.is_active_member(uuid, uuid), private.can_view_profile(uuid) to authenticated;
revoke all on function public.create_event(text), public.get_invitation_preview(uuid, text), public.join_event(uuid, text), public.leave_event(uuid), public.set_coadmin(uuid, uuid, boolean), public.rename_event(uuid, text), public.rotate_event_invitation(uuid, boolean), public.create_manual_participant(uuid, text), public.deactivate_participant(uuid), public.link_manual_participant(uuid, uuid) from public, anon, authenticated;
grant execute on function public.create_event(text), public.get_invitation_preview(uuid, text), public.join_event(uuid, text), public.leave_event(uuid), public.set_coadmin(uuid, uuid, boolean), public.rename_event(uuid, text), public.rotate_event_invitation(uuid, boolean), public.create_manual_participant(uuid, text), public.deactivate_participant(uuid), public.link_manual_participant(uuid, uuid) to authenticated;

alter table public.events enable row level security;
alter table public.event_members enable row level security;
alter table public.participants enable row level security;
alter table public.audit_log enable row level security;

create policy events_select_member on public.events for select to authenticated using (private.is_active_member(id, auth.uid()));
create policy event_members_select_member on public.event_members for select to authenticated using (private.is_active_member(event_id, auth.uid()));
create policy participants_select_member on public.participants for select to authenticated using (private.is_active_member(event_id, auth.uid()));
create policy audit_log_select_member on public.audit_log for select to authenticated using (private.is_active_member(event_id, auth.uid()));

drop policy profiles_select_own on public.profiles;
create policy profiles_select_own_or_coparticipant on public.profiles for select to authenticated using (
  auth.uid() = id or private.can_view_profile(id)
);
