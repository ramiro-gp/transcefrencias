create or replace function public.link_manual_participant(target_participant_id uuid, target_profile_id uuid)
returns void language plpgsql security definer set search_path = '' as $$
declare actor_id uuid := auth.uid(); target_event_id uuid; account_participant_id uuid; manual_name text; account_name text;
begin
  select event_id, display_name into target_event_id, manual_name from public.participants where id = target_participant_id and active and profile_id is null;
  if target_event_id is null or actor_id is null or not private.is_event_admin(target_event_id, actor_id) then raise exception 'Administrator permission required.' using errcode = '42501'; end if;
  if not private.is_active_member(target_event_id, target_profile_id) then raise exception 'The account must be an active event member.' using errcode = '22023'; end if;
  select coalesce(nickname, full_name) into account_name from public.profiles where id = target_profile_id;
  select id into account_participant_id from public.participants where event_id = target_event_id and profile_id = target_profile_id and active;
  if account_participant_id is null then
    update public.participants set profile_id = target_profile_id where id = target_participant_id;
  else
    update public.participants set active = false, deactivated_at = statement_timestamp(), merged_into_id = account_participant_id where id = target_participant_id;
  end if;
  perform private.touch_event(target_event_id);
  perform private.write_audit(target_event_id, actor_id, 'person_linked', format('vinculó a %s con %s.', manual_name, account_name));
end;
$$;
