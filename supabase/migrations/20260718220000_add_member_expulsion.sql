alter table public.event_members
  add column rejoin_blocked_at timestamp with time zone;

create or replace function public.join_event(invitation_id uuid, invitation_secret text)
returns uuid language plpgsql security definer set search_path = '' as $$
declare actor_id uuid := auth.uid(); target_event_id uuid; participant_name text; blocked_at timestamp with time zone;
begin
  if actor_id is null then raise exception 'Authentication required.' using errcode = '42501'; end if;
  select event_id into target_event_id from private.event_invitations
  where id = invitation_id and revoked_at is null and invitation_token = join_event.invitation_secret;
  if target_event_id is null then raise exception 'Invalid invitation.' using errcode = '22023'; end if;
  select rejoin_blocked_at into blocked_at from public.event_members where event_id = target_event_id and profile_id = actor_id;
  if blocked_at is not null then raise exception 'Rejoin is not allowed.' using errcode = '42501'; end if;
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

create function public.expel_event_member(target_event_id uuid, target_profile_id uuid)
returns void language plpgsql security definer set search_path = '' as $$
declare actor_id uuid := auth.uid(); target_role text; target_name text;
begin
  if actor_id is null or not private.is_event_admin(target_event_id, actor_id) then raise exception 'Administrator permission required.' using errcode = '42501'; end if;
  if target_profile_id = actor_id then raise exception 'You cannot expel yourself.' using errcode = '22023'; end if;
  select role into target_role from public.event_members where event_id = target_event_id and profile_id = target_profile_id and left_at is null;
  if target_role is null then raise exception 'Active member not found.' using errcode = '22023'; end if;
  if target_role = 'owner' then raise exception 'The owner cannot be expelled.' using errcode = '22023'; end if;
  select display_name into target_name from public.participants where event_id = target_event_id and profile_id = target_profile_id;
  if target_name is null then raise exception 'Person not found.' using errcode = 'P0001'; end if;
  update public.event_members set role = 'member', left_at = statement_timestamp(), rejoin_blocked_at = statement_timestamp()
  where event_id = target_event_id and profile_id = target_profile_id;
  update public.participants set active = false, deactivated_at = statement_timestamp() where event_id = target_event_id and profile_id = target_profile_id and active;
  perform private.touch_event(target_event_id);
  perform private.write_audit(target_event_id, actor_id, 'member_expelled', format('expulsó a %s.', target_name));
end;
$$;

create function public.allow_event_rejoin(target_event_id uuid, target_profile_id uuid)
returns void language plpgsql security definer set search_path = '' as $$
declare actor_id uuid := auth.uid(); target_name text;
begin
  if actor_id is null or not private.is_owner(target_event_id, actor_id) then raise exception 'Owner permission required.' using errcode = '42501'; end if;
  select display_name into target_name from public.participants where event_id = target_event_id and profile_id = target_profile_id;
  update public.event_members set rejoin_blocked_at = null where event_id = target_event_id and profile_id = target_profile_id and rejoin_blocked_at is not null;
  if not found then raise exception 'Blocked member not found.' using errcode = '22023'; end if;
  perform private.touch_event(target_event_id);
  perform private.write_audit(target_event_id, actor_id, 'member_rejoin_allowed', format('permitió que %s vuelva a unirse.', target_name));
end;
$$;

revoke all on function public.expel_event_member(uuid, uuid), public.allow_event_rejoin(uuid, uuid) from public, anon, authenticated;
grant execute on function public.expel_event_member(uuid, uuid), public.allow_event_rejoin(uuid, uuid) to authenticated;
