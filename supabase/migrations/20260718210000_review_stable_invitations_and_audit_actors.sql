alter table private.event_invitations
  add column invitation_token text;

update private.event_invitations
set invitation_token = private.invitation_secret()
where invitation_token is null;

alter table private.event_invitations
  alter column invitation_token set not null,
  add constraint event_invitations_token_valid check (invitation_token ~ '^[0-9a-f]{64}$');

alter table public.audit_log
  add column actor_display_name text;

update public.audit_log audit
set actor_display_name = coalesce(profile.nickname, profile.full_name, 'Sistema')
from public.profiles profile
where profile.id = audit.actor_id and audit.actor_display_name is null;

update public.audit_log
set actor_display_name = 'Sistema'
where actor_display_name is null;

alter table public.audit_log
  alter column actor_display_name set not null,
  add constraint audit_log_actor_display_name_valid check (
    actor_display_name = btrim(actor_display_name)
    and char_length(actor_display_name) between 1 and 100
    and actor_display_name !~ '[[:cntrl:]]'
  );

create or replace function private.write_audit(
  target_event_id uuid,
  target_actor_id uuid,
  target_action text,
  target_summary text
)
returns void language plpgsql security definer set search_path = '' as $$
declare actor_name text;
begin
  select coalesce(nickname, full_name) into actor_name
  from public.profiles where id = target_actor_id;
  if actor_name is null then actor_name := 'Sistema'; end if;
  insert into public.audit_log (event_id, actor_id, actor_display_name, action, summary)
  values (target_event_id, target_actor_id, actor_name, target_action, target_summary);
end;
$$;

create or replace function public.create_event(event_name text)
returns jsonb language plpgsql security definer set search_path = '' as $$
declare
  actor_id uuid := auth.uid();
  created_event public.events;
  invite_id uuid;
  token text;
  participant_name text;
begin
  if actor_id is null then raise exception 'Authentication required.' using errcode = '42501'; end if;
  event_name := btrim(event_name);
  if char_length(event_name) not between 1 and 100 or event_name ~ '[[:cntrl:]]' then raise exception 'Invalid event name.' using errcode = '22023'; end if;
  select coalesce(nickname, full_name) into participant_name from public.profiles where id = actor_id;
  if participant_name is null then raise exception 'Profile not found.' using errcode = 'P0001'; end if;
  insert into public.events (name, owner_id) values (event_name, actor_id) returning * into created_event;
  insert into public.event_members (event_id, profile_id, role) values (created_event.id, actor_id, 'owner');
  insert into public.participants (event_id, profile_id, display_name) values (created_event.id, actor_id, participant_name);
  token := private.invitation_secret();
  insert into private.event_invitations (event_id, secret_hash, invitation_token)
  values (created_event.id, encode(extensions.digest(token, 'sha256'), 'hex'), token) returning id into invite_id;
  perform private.write_audit(created_event.id, actor_id, 'event_created', 'creó el evento.');
  return jsonb_build_object('event_id', created_event.id, 'invitation_id', invite_id, 'token', token);
end;
$$;

create or replace function public.get_invitation_preview(invitation_id uuid, invitation_secret text)
returns jsonb language plpgsql security definer set search_path = '' as $$
declare actor_id uuid := auth.uid(); result jsonb;
begin
  if actor_id is null then raise exception 'Authentication required.' using errcode = '42501'; end if;
  select jsonb_build_object('event_id', e.id, 'name', e.name, 'already_member', private.is_active_member(e.id, actor_id))
  into result
  from private.event_invitations i join public.events e on e.id = i.event_id
  where i.id = invitation_id and i.revoked_at is null and i.invitation_token = get_invitation_preview.invitation_secret;
  if result is null then raise exception 'Invalid invitation.' using errcode = '22023'; end if;
  return result;
end;
$$;

create or replace function public.join_event(invitation_id uuid, invitation_secret text)
returns uuid language plpgsql security definer set search_path = '' as $$
declare actor_id uuid := auth.uid(); target_event_id uuid; participant_name text;
begin
  if actor_id is null then raise exception 'Authentication required.' using errcode = '42501'; end if;
  select event_id into target_event_id from private.event_invitations
  where id = invitation_id and revoked_at is null and invitation_token = join_event.invitation_secret;
  if target_event_id is null then raise exception 'Invalid invitation.' using errcode = '22023'; end if;
  select coalesce(nickname, full_name) into participant_name from public.profiles where id = actor_id;
  if participant_name is null then raise exception 'Profile not found.' using errcode = 'P0001'; end if;
  insert into public.event_members (event_id, profile_id, role) values (target_event_id, actor_id, 'member')
  on conflict (event_id, profile_id) do update set role = 'member', left_at = null, joined_at = statement_timestamp();
  update public.participants set active = true, deactivated_at = null, merged_into_id = null where event_id = target_event_id and profile_id = actor_id;
  if not found then insert into public.participants (event_id, profile_id, display_name) values (target_event_id, actor_id, participant_name); end if;
  perform private.touch_event(target_event_id);
  perform private.write_audit(target_event_id, actor_id, 'member_joined', 'se unió al evento.');
  return target_event_id;
end;
$$;

create or replace function public.get_event_invitation(target_event_id uuid)
returns jsonb language plpgsql security definer set search_path = '' as $$
declare actor_id uuid := auth.uid(); result jsonb;
begin
  if actor_id is null or not private.is_owner(target_event_id, actor_id) then raise exception 'Owner permission required.' using errcode = '42501'; end if;
  select jsonb_build_object('invitation_id', id, 'token', invitation_token) into result
  from private.event_invitations where event_id = target_event_id and revoked_at is null;
  if result is null then raise exception 'Invitation not found.' using errcode = 'P0001'; end if;
  return result;
end;
$$;

create or replace function public.set_coadmin(target_event_id uuid, target_profile_id uuid, make_coadmin boolean)
returns void language plpgsql security definer set search_path = '' as $$
declare actor_id uuid := auth.uid(); target_name text;
begin
  if actor_id is null or not private.is_owner(target_event_id, actor_id) then raise exception 'Owner permission required.' using errcode = '42501'; end if;
  if target_profile_id = actor_id then raise exception 'The owner role cannot be changed.' using errcode = '22023'; end if;
  select coalesce(nickname, full_name) into target_name from public.profiles where id = target_profile_id;
  update public.event_members set role = case when make_coadmin then 'coadmin' else 'member' end where event_id = target_event_id and profile_id = target_profile_id and left_at is null;
  if not found then raise exception 'Active member not found.' using errcode = '22023'; end if;
  perform private.touch_event(target_event_id);
  perform private.write_audit(target_event_id, actor_id, case when make_coadmin then 'coadmin_added' else 'coadmin_removed' end, case when make_coadmin then format('convirtió a %s en coadmin.', target_name) else format('quitó a %s como coadmin.', target_name) end);
end;
$$;

create or replace function public.rename_event(target_event_id uuid, event_name text)
returns void language plpgsql security definer set search_path = '' as $$
declare actor_id uuid := auth.uid();
begin
  if actor_id is null or not private.is_event_admin(target_event_id, actor_id) then raise exception 'Administrator permission required.' using errcode = '42501'; end if;
  event_name := btrim(event_name);
  if char_length(event_name) not between 1 and 100 or event_name ~ '[[:cntrl:]]' then raise exception 'Invalid event name.' using errcode = '22023'; end if;
  update public.events set name = event_name where id = target_event_id;
  perform private.touch_event(target_event_id); perform private.write_audit(target_event_id, actor_id, 'event_renamed', 'renombró el evento.');
end;
$$;

create or replace function public.leave_event(target_event_id uuid)
returns void language plpgsql security definer set search_path = '' as $$
declare actor_id uuid := auth.uid(); current_role text;
begin
  if actor_id is null then raise exception 'Authentication required.' using errcode = '42501'; end if;
  select role into current_role from public.event_members where event_id = target_event_id and profile_id = actor_id and left_at is null;
  if current_role is null then raise exception 'Active membership required.' using errcode = '42501'; end if;
  if current_role = 'owner' then raise exception 'The owner cannot leave the event.' using errcode = '22023'; end if;
  update public.event_members set role = 'member', left_at = statement_timestamp() where event_id = target_event_id and profile_id = actor_id;
  update public.participants set active = false, deactivated_at = statement_timestamp() where event_id = target_event_id and profile_id = actor_id and active;
  perform private.touch_event(target_event_id); perform private.write_audit(target_event_id, actor_id, 'member_left', 'salió del evento.');
end;
$$;

create or replace function public.create_manual_participant(target_event_id uuid, participant_name text)
returns uuid language plpgsql security definer set search_path = '' as $$
declare actor_id uuid := auth.uid(); participant_id uuid;
begin
  if actor_id is null or not private.is_active_member(target_event_id, actor_id) then raise exception 'Active membership required.' using errcode = '42501'; end if;
  participant_name := btrim(participant_name);
  if char_length(participant_name) not between 1 and 100 or participant_name ~ '[[:cntrl:]]' then raise exception 'Invalid participant name.' using errcode = '22023'; end if;
  insert into public.participants (event_id, display_name) values (target_event_id, participant_name) returning id into participant_id;
  perform private.touch_event(target_event_id); perform private.write_audit(target_event_id, actor_id, 'manual_person_created', format('agregó a %s.', participant_name));
  return participant_id;
end;
$$;

create or replace function public.deactivate_participant(target_participant_id uuid)
returns void language plpgsql security definer set search_path = '' as $$
declare actor_id uuid := auth.uid(); target_event_id uuid; linked_profile_id uuid; person_name text;
begin
  select event_id, profile_id, display_name into target_event_id, linked_profile_id, person_name from public.participants where id = target_participant_id and active;
  if target_event_id is null or actor_id is null or not private.is_event_admin(target_event_id, actor_id) then raise exception 'Administrator permission required.' using errcode = '42501'; end if;
  if linked_profile_id is not null then raise exception 'Account participants are managed by membership.' using errcode = '22023'; end if;
  update public.participants set active = false, deactivated_at = statement_timestamp() where id = target_participant_id;
  perform private.touch_event(target_event_id); perform private.write_audit(target_event_id, actor_id, 'person_deactivated', format('desactivó a %s.', person_name));
end;
$$;

revoke execute on function public.rotate_event_invitation(uuid, boolean) from authenticated;
revoke all on function public.get_event_invitation(uuid) from public, anon, authenticated;
grant execute on function public.get_event_invitation(uuid) to authenticated;
