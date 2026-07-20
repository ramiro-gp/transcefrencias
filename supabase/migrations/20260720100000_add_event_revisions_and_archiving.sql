alter table public.events
  add column revision bigint not null default 1,
  add column archived_at timestamp with time zone,
  add column archived_from_status text,
  add constraint events_revision_positive check (revision > 0);

alter table public.events drop constraint events_status_valid;
alter table public.events
  add constraint events_status_valid check (status in ('loading_expenses', 'paying', 'archived')),
  add constraint events_archive_coherent check (
    (status = 'archived' and archived_at is not null and archived_from_status in ('loading_expenses', 'paying'))
    or (status <> 'archived' and archived_at is null and archived_from_status is null)
  );

update public.audit_log set details = '{}'::jsonb where details is null;
alter table public.audit_log
  alter column details set default '{}'::jsonb,
  alter column details set not null;

create function private.event_snapshot(target_event_id uuid)
returns jsonb language sql stable security definer set search_path = '' as $$
  select jsonb_build_object(
    'name', name,
    'status', status,
    'revision', revision,
    'archived_at', archived_at,
    'archived_from_status', archived_from_status
  )
  from public.events
  where id = target_event_id
$$;

create function private.write_event_audit(
  target_event_id uuid,
  target_actor_id uuid,
  target_action text,
  target_summary text,
  target_before jsonb,
  target_after jsonb
)
returns void language plpgsql security definer set search_path = '' as $$
declare actor_name text;
begin
  select coalesce(nickname, full_name) into actor_name
  from public.profiles where id = target_actor_id;
  if actor_name is null then actor_name := 'Sistema'; end if;
  insert into public.audit_log (event_id, actor_id, actor_display_name, action, summary, details)
  values (
    target_event_id,
    target_actor_id,
    actor_name,
    target_action,
    target_summary,
    jsonb_build_object('before', target_before, 'after', target_after)
  );
end;
$$;

create function private.protect_event_owner()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
  if tg_op = 'DELETE' then
    raise exception 'Events cannot be deleted.' using errcode = '22023';
  end if;
  if new.owner_id is distinct from old.owner_id then
    raise exception 'The event owner cannot be changed.' using errcode = '22023';
  end if;
  return new;
end;
$$;

create trigger protect_event_owner_update
before update of owner_id on public.events
for each row execute function private.protect_event_owner();

create trigger protect_event_deletion
before delete on public.events
for each row execute function private.protect_event_owner();

create function private.lock_event_for_mutation(
  target_event_id uuid,
  expected_revision bigint default null,
  require_expected_revision boolean default false,
  allow_archived boolean default false
)
returns void language plpgsql security definer set search_path = '' as $$
declare current_status text; current_revision bigint;
begin
  if require_expected_revision and coalesce(expected_revision, 0) <= 0 then
    raise exception 'Expected revision must be a positive integer.' using errcode = '22023';
  end if;

  select status, revision into current_status, current_revision
  from public.events where id = target_event_id for update;
  if current_status is null then raise exception 'Event not found.' using errcode = '22023'; end if;
  if current_status = 'archived' and not allow_archived then
    raise exception 'Archived events are read-only.' using errcode = '22023';
  end if;
  if require_expected_revision and current_revision <> expected_revision then
    raise exception 'The event changed. Reload before continuing.' using errcode = '40001';
  end if;
end;
$$;

create or replace function private.touch_event(target_event_id uuid)
returns void language plpgsql security definer set search_path = '' as $$
declare touched_events text := coalesce(current_setting('transcefrencias.revised_events', true), '');
begin
  if not (target_event_id::text = any(string_to_array(touched_events, ','))) then
    update public.events
    set revision = revision + 1,
        updated_at = statement_timestamp(),
        last_activity_at = statement_timestamp()
    where id = target_event_id;
    perform set_config(
      'transcefrencias.revised_events',
      concat_ws(',', nullif(touched_events, ''), target_event_id::text),
      true
    );
  else
    update public.events
    set updated_at = statement_timestamp(), last_activity_at = statement_timestamp()
    where id = target_event_id;
  end if;
end;
$$;

create or replace function private.require_event_loading(target_event_id uuid, operation_name text)
returns void language plpgsql security definer set search_path = '' as $$
declare current_status text;
begin
  select status into current_status from public.events where id = target_event_id for update;
  if current_status = 'archived' then raise exception 'Archived events are read-only.' using errcode = '22023'; end if;
  if current_status is distinct from 'loading_expenses' then
    raise exception '% is only available while loading expenses.', operation_name using errcode = '22023';
  end if;
end;
$$;

create or replace function private.require_loading_expenses()
returns trigger language plpgsql security definer set search_path = '' as $$
declare target_event_id uuid := coalesce(new.event_id, old.event_id); current_status text;
begin
  if tg_op = 'UPDATE' and new.event_id is distinct from old.event_id then
    raise exception 'Rows cannot move between events.' using errcode = '22023';
  end if;
  select status into current_status from public.events where id = target_event_id for update;
  if current_status = 'archived' then raise exception 'Archived events are read-only.' using errcode = '22023'; end if;
  if current_status is distinct from 'loading_expenses' then
    raise exception 'Expenses can only be changed while loading expenses.' using errcode = '22023';
  end if;
  if tg_op = 'DELETE' then return old; end if;
  return new;
end;
$$;

create or replace function private.freeze_economic_membership_changes()
returns trigger language plpgsql security definer set search_path = '' as $$
declare target_event_id uuid := coalesce(new.event_id, old.event_id); current_status text;
begin
  if tg_op = 'UPDATE' and new.event_id is distinct from old.event_id then
    raise exception 'Rows cannot move between events.' using errcode = '22023';
  end if;
  select status into current_status from public.events where id = target_event_id for update;
  if current_status = 'archived' then raise exception 'Archived events are read-only.' using errcode = '22023'; end if;
  if tg_table_name = 'event_members' then
    if tg_op = 'INSERT' and new.role = 'owner' and not exists (
      select 1 from public.events where id = new.event_id and owner_id = new.profile_id
    ) then
      raise exception 'The owner membership cannot be changed.' using errcode = '22023';
    end if;
    if tg_op in ('UPDATE', 'DELETE') and exists (
      select 1 from public.events where id = old.event_id and owner_id = old.profile_id
    ) and (
      tg_op = 'DELETE'
      or new.event_id is distinct from old.event_id
      or new.profile_id is distinct from old.profile_id
      or new.role is distinct from 'owner'
      or new.left_at is not null
    ) then
      raise exception 'The owner membership cannot be changed.' using errcode = '22023';
    end if;
    if tg_op = 'UPDATE' and new.role = 'owner' and not exists (
      select 1 from public.events where id = new.event_id and owner_id = new.profile_id
    ) then
      raise exception 'The owner membership cannot be changed.' using errcode = '22023';
    end if;
  end if;
  if current_status = 'paying' then
    if tg_table_name = 'participants' then
      raise exception 'People can only be changed while loading expenses.' using errcode = '22023';
    end if;
    if tg_op = 'INSERT' or new.left_at is distinct from old.left_at or new.rejoin_blocked_at is distinct from old.rejoin_blocked_at then
      raise exception 'Membership can only be changed while loading expenses.' using errcode = '22023';
    end if;
  end if;
  if tg_op = 'DELETE' then return old; end if;
  return new;
end;
$$;

create or replace function public.get_invitation_preview(invitation_id uuid, invitation_secret text)
returns jsonb language plpgsql security definer set search_path = '' as $$
declare actor_id uuid := auth.uid(); result jsonb;
begin
  if actor_id is null then raise exception 'Authentication required.' using errcode = '42501'; end if;
  select jsonb_build_object(
    'event_id', e.id,
    'name', e.name,
    'status', e.status,
    'already_member', private.is_active_member(e.id, actor_id)
  ) into result
  from private.event_invitations i join public.events e on e.id = i.event_id
  where i.id = invitation_id and i.revoked_at is null and i.invitation_token = get_invitation_preview.invitation_secret;
  if result is null then raise exception 'Invalid invitation.' using errcode = '22023'; end if;
  return result;
end;
$$;

create or replace function public.join_event(invitation_id uuid, invitation_secret text)
returns uuid language plpgsql security definer set search_path = '' as $$
declare actor_id uuid := auth.uid(); target_event_id uuid; participant_name text; membership public.event_members;
begin
  if actor_id is null then raise exception 'Authentication required.' using errcode = '42501'; end if;
  select event_id into target_event_id from private.event_invitations
  where id = invitation_id and revoked_at is null and invitation_token = join_event.invitation_secret;
  if target_event_id is null then raise exception 'Invalid invitation.' using errcode = '22023'; end if;
  perform private.lock_event_for_mutation(target_event_id);
  select * into membership from public.event_members where event_id = target_event_id and profile_id = actor_id;
  if membership.event_id is not null and membership.role = 'owner' then raise exception 'The owner membership cannot be changed.' using errcode = '22023'; end if;
  if membership.event_id is not null and membership.left_at is null then raise exception 'Already an active member.' using errcode = '22023'; end if;
  if membership.event_id is not null and membership.rejoin_blocked_at is not null then raise exception 'Rejoin is not allowed.' using errcode = '42501'; end if;
  select coalesce(nickname, full_name) into participant_name from public.profiles where id = actor_id;
  if participant_name is null then raise exception 'Profile not found.' using errcode = 'P0001'; end if;
  insert into public.event_members (event_id, profile_id, role) values (target_event_id, actor_id, 'member')
  on conflict (event_id, profile_id) do update
    set role = 'member', left_at = null, joined_at = statement_timestamp()
    where public.event_members.role <> 'owner';
  update public.participants set active = true, deactivated_at = null, merged_into_id = null
  where event_id = target_event_id and profile_id = actor_id;
  if not found then insert into public.participants (event_id, profile_id, display_name) values (target_event_id, actor_id, participant_name); end if;
  perform private.touch_event(target_event_id);
  perform private.write_audit(target_event_id, actor_id, 'member_joined', 'se unió al evento.');
  return target_event_id;
end;
$$;

create or replace function public.leave_event(target_event_id uuid)
returns void language plpgsql security definer set search_path = '' as $$
declare actor_id uuid := auth.uid(); membership_role text;
begin
  if actor_id is null then raise exception 'Authentication required.' using errcode = '42501'; end if;
  if not private.is_active_member(target_event_id, actor_id) then raise exception 'Active membership required.' using errcode = '42501'; end if;
  perform private.lock_event_for_mutation(target_event_id);
  select role into membership_role from public.event_members where event_id = target_event_id and profile_id = actor_id and left_at is null;
  if membership_role is null then raise exception 'Active membership required.' using errcode = '42501'; end if;
  if membership_role = 'owner' then raise exception 'The owner cannot leave the event.' using errcode = '22023'; end if;
  update public.event_members set role = 'member', left_at = statement_timestamp() where event_id = target_event_id and profile_id = actor_id;
  update public.participants set active = false, deactivated_at = statement_timestamp() where event_id = target_event_id and profile_id = actor_id and active;
  perform private.touch_event(target_event_id);
  perform private.write_audit(target_event_id, actor_id, 'member_left', 'salió del evento.');
end;
$$;

create or replace function public.set_coadmin(target_event_id uuid, target_profile_id uuid, make_coadmin boolean)
returns void language plpgsql security definer set search_path = '' as $$
declare actor_id uuid := auth.uid(); target_name text;
begin
  if actor_id is null then raise exception 'Owner permission required.' using errcode = '42501'; end if;
  if not private.is_owner(target_event_id, actor_id) then raise exception 'Owner permission required.' using errcode = '42501'; end if;
  perform private.lock_event_for_mutation(target_event_id);
  if not private.is_owner(target_event_id, actor_id) then raise exception 'Owner permission required.' using errcode = '42501'; end if;
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
  if actor_id is null then raise exception 'Administrator permission required.' using errcode = '42501'; end if;
  if not private.is_event_admin(target_event_id, actor_id) then raise exception 'Administrator permission required.' using errcode = '42501'; end if;
  perform private.lock_event_for_mutation(target_event_id);
  if not private.is_event_admin(target_event_id, actor_id) then raise exception 'Administrator permission required.' using errcode = '42501'; end if;
  event_name := btrim(event_name);
  if char_length(event_name) not between 1 and 100 or event_name ~ '[[:cntrl:]]' then raise exception 'Invalid event name.' using errcode = '22023'; end if;
  update public.events set name = event_name where id = target_event_id;
  perform private.touch_event(target_event_id);
  perform private.write_audit(target_event_id, actor_id, 'event_renamed', 'renombró el evento.');
end;
$$;

create or replace function public.rotate_event_invitation(target_event_id uuid, revoke_only boolean default false)
returns jsonb language plpgsql security definer set search_path = '' as $$
begin
  perform revoke_only;
  perform private.lock_event_for_mutation(target_event_id);
  raise exception 'The stable invitation cannot be rotated.' using errcode = '22023';
end;
$$;

create or replace function public.create_manual_participant(target_event_id uuid, participant_name text)
returns uuid language plpgsql security definer set search_path = '' as $$
declare actor_id uuid := auth.uid(); participant_id uuid;
begin
  if actor_id is null then raise exception 'Active membership required.' using errcode = '42501'; end if;
  if not private.is_active_member(target_event_id, actor_id) then raise exception 'Active membership required.' using errcode = '42501'; end if;
  perform private.lock_event_for_mutation(target_event_id);
  if not private.is_active_member(target_event_id, actor_id) then raise exception 'Active membership required.' using errcode = '42501'; end if;
  perform private.require_event_loading(target_event_id, 'People changes');
  participant_name := btrim(participant_name);
  if char_length(participant_name) not between 1 and 100 or participant_name ~ '[[:cntrl:]]' then raise exception 'Invalid participant name.' using errcode = '22023'; end if;
  insert into public.participants (event_id, display_name) values (target_event_id, participant_name) returning id into participant_id;
  perform private.touch_event(target_event_id);
  perform private.write_audit(target_event_id, actor_id, 'manual_person_created', format('agregó a %s.', participant_name));
  return participant_id;
end;
$$;

create or replace function public.deactivate_participant(target_participant_id uuid)
returns void language plpgsql security definer set search_path = '' as $$
declare actor_id uuid := auth.uid(); target_event_id uuid; linked_profile_id uuid; person_name text;
begin
  select event_id into target_event_id from public.participants where id = target_participant_id;
  if target_event_id is null then raise exception 'Administrator permission required.' using errcode = '42501'; end if;
  if actor_id is null or not private.is_event_admin(target_event_id, actor_id) then raise exception 'Administrator permission required.' using errcode = '42501'; end if;
  perform private.lock_event_for_mutation(target_event_id);
  select profile_id, display_name into linked_profile_id, person_name from public.participants where id = target_participant_id and active for update;
  if person_name is null or actor_id is null or not private.is_event_admin(target_event_id, actor_id) then raise exception 'Administrator permission required.' using errcode = '42501'; end if;
  perform private.require_event_loading(target_event_id, 'People changes');
  if linked_profile_id is not null then raise exception 'Account participants are managed by membership.' using errcode = '22023'; end if;
  update public.participants set active = false, deactivated_at = statement_timestamp() where id = target_participant_id;
  perform private.touch_event(target_event_id);
  perform private.write_audit(target_event_id, actor_id, 'person_deactivated', format('desactivó a %s.', person_name));
end;
$$;

create or replace function public.link_manual_participant(target_participant_id uuid, target_profile_id uuid)
returns void language plpgsql security definer set search_path = '' as $$
declare actor_id uuid := auth.uid(); target_event_id uuid; account_participant_id uuid; manual_name text; account_name text;
begin
  select event_id into target_event_id from public.participants where id = target_participant_id;
  if target_event_id is null then raise exception 'Administrator permission required.' using errcode = '42501'; end if;
  if actor_id is null or not private.is_event_admin(target_event_id, actor_id) then raise exception 'Administrator permission required.' using errcode = '42501'; end if;
  perform private.lock_event_for_mutation(target_event_id);
  select display_name into manual_name from public.participants where id = target_participant_id and active and profile_id is null for update;
  if manual_name is null or actor_id is null or not private.is_event_admin(target_event_id, actor_id) then raise exception 'Administrator permission required.' using errcode = '42501'; end if;
  perform private.require_event_loading(target_event_id, 'People changes');
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

create or replace function public.expel_event_member(target_event_id uuid, target_profile_id uuid)
returns void language plpgsql security definer set search_path = '' as $$
declare actor_id uuid := auth.uid(); target_role text; target_name text;
begin
  if actor_id is null then raise exception 'Administrator permission required.' using errcode = '42501'; end if;
  if not private.is_event_admin(target_event_id, actor_id) then raise exception 'Administrator permission required.' using errcode = '42501'; end if;
  perform private.lock_event_for_mutation(target_event_id);
  if not private.is_event_admin(target_event_id, actor_id) then raise exception 'Administrator permission required.' using errcode = '42501'; end if;
  perform private.require_event_loading(target_event_id, 'Membership changes');
  if target_profile_id = actor_id then raise exception 'You cannot expel yourself.' using errcode = '22023'; end if;
  select role into target_role from public.event_members where event_id = target_event_id and profile_id = target_profile_id and left_at is null for update;
  if target_role is null then raise exception 'Active member not found.' using errcode = '22023'; end if;
  if target_role = 'owner' then raise exception 'The owner cannot be expelled.' using errcode = '22023'; end if;
  select display_name into target_name from public.participants where event_id = target_event_id and profile_id = target_profile_id;
  if target_name is null then raise exception 'Person not found.' using errcode = 'P0001'; end if;
  update public.event_members set role = 'member', left_at = statement_timestamp(), rejoin_blocked_at = statement_timestamp() where event_id = target_event_id and profile_id = target_profile_id;
  update public.participants set active = false, deactivated_at = statement_timestamp() where event_id = target_event_id and profile_id = target_profile_id and active;
  perform private.touch_event(target_event_id);
  perform private.write_audit(target_event_id, actor_id, 'member_expelled', format('expulsó a %s.', target_name));
end;
$$;

create or replace function public.allow_event_rejoin(target_event_id uuid, target_profile_id uuid)
returns void language plpgsql security definer set search_path = '' as $$
declare actor_id uuid := auth.uid(); target_name text;
begin
  if actor_id is null then raise exception 'Owner permission required.' using errcode = '42501'; end if;
  if not private.is_owner(target_event_id, actor_id) then raise exception 'Owner permission required.' using errcode = '42501'; end if;
  perform private.lock_event_for_mutation(target_event_id);
  if not private.is_owner(target_event_id, actor_id) then raise exception 'Owner permission required.' using errcode = '42501'; end if;
  perform private.require_event_loading(target_event_id, 'Membership changes');
  select display_name into target_name from public.participants where event_id = target_event_id and profile_id = target_profile_id;
  update public.event_members set rejoin_blocked_at = null where event_id = target_event_id and profile_id = target_profile_id and rejoin_blocked_at is not null;
  if not found then raise exception 'Blocked member not found.' using errcode = '22023'; end if;
  perform private.touch_event(target_event_id);
  perform private.write_audit(target_event_id, actor_id, 'member_rejoin_allowed', format('permitió que %s vuelva a unirse.', target_name));
end;
$$;

create or replace function public.create_expense(target_event_id uuid, expense_concept text, expense_category text, expense_amount bigint, expense_payer_ids uuid[], expense_payer_amounts bigint[], expense_participant_ids uuid[])
returns uuid language plpgsql security definer set search_path = '' as $$
declare actor_id uuid := auth.uid(); expense_id uuid;
begin
  if actor_id is null then raise exception 'Active membership required.' using errcode = '42501'; end if;
  if not private.is_active_member(target_event_id, actor_id) then raise exception 'Active membership required.' using errcode = '42501'; end if;
  perform private.lock_event_for_mutation(target_event_id);
  if not private.is_active_member(target_event_id, actor_id) then raise exception 'Active membership required.' using errcode = '42501'; end if;
  perform private.require_event_loading(target_event_id, 'Expense changes');
  perform private.validate_expense_input(target_event_id, expense_concept, expense_category, expense_amount, expense_payer_ids, expense_payer_amounts, expense_participant_ids);
  insert into public.expenses(event_id, concept, category, amount, created_by) values(target_event_id, btrim(expense_concept), expense_category, expense_amount, actor_id) returning id into expense_id;
  insert into public.expense_payers(event_id, expense_id, participant_id, amount) select target_event_id, expense_id, id, amount from unnest(expense_payer_ids, expense_payer_amounts) as x(id, amount);
  insert into public.expense_participants(event_id, expense_id, participant_id) select target_event_id, expense_id, id from unnest(expense_participant_ids) id;
  perform private.touch_event(target_event_id);
  perform private.write_expense_audit(target_event_id, actor_id, expense_id, 'expense_created', 'Cargó un gasto.', jsonb_build_object('after', private.expense_snapshot(expense_id)));
  return expense_id;
end;
$$;

create or replace function public.update_expense(target_expense_id uuid, expected_revision bigint, expense_concept text, expense_category text, expense_amount bigint, expense_payer_ids uuid[], expense_payer_amounts bigint[], expense_participant_ids uuid[])
returns bigint language plpgsql security definer set search_path = '' as $$
declare actor_id uuid := auth.uid(); target_event uuid; current_revision bigint; before jsonb; next_revision bigint; old_payers uuid[]; old_consumers uuid[];
begin
  if coalesce(expected_revision, 0) <= 0 then raise exception 'Expected revision must be a positive integer.' using errcode = '22023'; end if;
  select event_id into target_event from public.expenses where id = target_expense_id;
  if target_event is null or actor_id is null or not private.is_active_member(target_event, actor_id) then raise exception 'Expense author or administrator permission required.' using errcode = '42501'; end if;
  perform private.lock_event_for_mutation(target_event);
  select revision into current_revision from public.expenses where id = target_expense_id and deleted_at is null for update;
  if current_revision is null then raise exception 'Expense not found.' using errcode = '22023'; end if;
  if actor_id is null or not private.is_active_member(target_event, actor_id) or (not private.is_event_admin(target_event, actor_id) and not exists(select 1 from public.expenses where id = target_expense_id and created_by = actor_id)) then raise exception 'Expense author or administrator permission required.' using errcode = '42501'; end if;
  perform private.require_event_loading(target_event, 'Expense changes');
  if current_revision <> expected_revision then raise exception 'This expense changed. Reload the current data before saving.' using errcode = '40001'; end if;
  select coalesce(array_agg(participant_id), '{}') into old_payers from public.expense_payers where expense_id = target_expense_id;
  select coalesce(array_agg(participant_id), '{}') into old_consumers from public.expense_participants where expense_id = target_expense_id;
  perform private.validate_expense_input(target_event, expense_concept, expense_category, expense_amount, expense_payer_ids, expense_payer_amounts, expense_participant_ids, true, old_payers, old_consumers);
  before := private.expense_snapshot(target_expense_id);
  update public.expenses set concept = btrim(expense_concept), category = expense_category, amount = expense_amount, revision = revision + 1, updated_at = statement_timestamp() where id = target_expense_id returning revision into next_revision;
  delete from public.expense_payers where expense_id = target_expense_id;
  delete from public.expense_participants where expense_id = target_expense_id;
  insert into public.expense_payers(event_id, expense_id, participant_id, amount) select target_event, target_expense_id, id, amount from unnest(expense_payer_ids, expense_payer_amounts) as x(id, amount);
  insert into public.expense_participants(event_id, expense_id, participant_id) select target_event, target_expense_id, id from unnest(expense_participant_ids) id;
  perform private.touch_event(target_event);
  perform private.write_expense_audit(target_event, actor_id, target_expense_id, 'expense_updated', 'Editó un gasto.', jsonb_build_object('before', before, 'after', private.expense_snapshot(target_expense_id)));
  return next_revision;
end;
$$;

create or replace function public.delete_expense(target_expense_id uuid, expected_revision bigint)
returns void language plpgsql security definer set search_path = '' as $$
declare actor_id uuid := auth.uid(); target_event_id uuid; current_revision bigint; before_snapshot jsonb;
begin
  if coalesce(expected_revision, 0) <= 0 then raise exception 'Expected revision must be a positive integer.' using errcode = '22023'; end if;
  select event_id into target_event_id from public.expenses where id = target_expense_id;
  if target_event_id is null or actor_id is null or not private.is_active_member(target_event_id, actor_id) then raise exception 'Active membership required.' using errcode = '42501'; end if;
  perform private.lock_event_for_mutation(target_event_id);
  select revision into current_revision from public.expenses where id = target_expense_id and deleted_at is null for update;
  if current_revision is null then raise exception 'Expense not found.' using errcode = '22023'; end if;
  if actor_id is null or not private.is_active_member(target_event_id, actor_id) then raise exception 'Active membership required.' using errcode = '42501'; end if;
  if not private.is_event_admin(target_event_id, actor_id) and not exists (select 1 from public.expenses where id = target_expense_id and created_by = actor_id) then raise exception 'Expense author or administrator permission required.' using errcode = '42501'; end if;
  perform private.require_event_loading(target_event_id, 'Expense changes');
  if current_revision <> expected_revision then raise exception 'This expense changed. Reload the current data before deleting.' using errcode = '40001'; end if;
  before_snapshot := private.expense_snapshot(target_expense_id);
  update public.expenses set deleted_at = statement_timestamp(), deleted_by = actor_id, revision = revision + 1, updated_at = statement_timestamp() where id = target_expense_id;
  perform private.touch_event(target_event_id);
  perform private.write_expense_audit(target_event_id, actor_id, target_expense_id, 'expense_deleted', 'Eliminó un gasto.', jsonb_build_object('before', before_snapshot));
end;
$$;

drop function public.transition_event_to_paying(uuid, text);
drop function public.reopen_event_expenses(uuid, text);

create function public.transition_event_to_paying(target_event_id uuid, expected_revision bigint)
returns jsonb language plpgsql security definer set search_path = '' as $$
declare actor_id uuid := auth.uid(); current_status text; active_expenses bigint; before_snapshot jsonb;
begin
  if actor_id is null then raise exception 'Authentication required.' using errcode = '42501'; end if;
  if not private.is_event_admin(target_event_id, actor_id) then raise exception 'Administrator permission required.' using errcode = '42501'; end if;
  perform private.lock_event_for_mutation(target_event_id, expected_revision, true);
  if not private.is_event_admin(target_event_id, actor_id) then raise exception 'Administrator permission required.' using errcode = '42501'; end if;
  select status into current_status from public.events where id = target_event_id;
  if current_status <> 'loading_expenses' then raise exception 'The event is not loading expenses.' using errcode = '22023'; end if;
  select count(*) into active_expenses from public.expenses where event_id = target_event_id and deleted_at is null;
  if active_expenses = 0 then raise exception 'Add at least one expense before settling.' using errcode = '22023'; end if;
  before_snapshot := private.event_snapshot(target_event_id);
  update public.events set status = 'paying' where id = target_event_id;
  perform private.touch_event(target_event_id);
  perform private.write_event_audit(target_event_id, actor_id, 'event_ready_to_pay', 'Marcó que es hora de pagar.', before_snapshot, private.event_snapshot(target_event_id));
  return private.event_snapshot(target_event_id);
end;
$$;

create function public.reopen_event_expenses(target_event_id uuid, expected_revision bigint)
returns jsonb language plpgsql security definer set search_path = '' as $$
declare actor_id uuid := auth.uid(); current_status text; before_snapshot jsonb;
begin
  if actor_id is null then raise exception 'Authentication required.' using errcode = '42501'; end if;
  if not private.is_event_admin(target_event_id, actor_id) then raise exception 'Administrator permission required.' using errcode = '42501'; end if;
  perform private.lock_event_for_mutation(target_event_id, expected_revision, true);
  if not private.is_event_admin(target_event_id, actor_id) then raise exception 'Administrator permission required.' using errcode = '42501'; end if;
  select status into current_status from public.events where id = target_event_id;
  if current_status <> 'paying' then raise exception 'The event is not ready to pay.' using errcode = '22023'; end if;
  before_snapshot := private.event_snapshot(target_event_id);
  update public.events set status = 'loading_expenses' where id = target_event_id;
  perform private.touch_event(target_event_id);
  perform private.write_event_audit(target_event_id, actor_id, 'event_reopened', 'Reabrió la carga de gastos.', before_snapshot, private.event_snapshot(target_event_id));
  return private.event_snapshot(target_event_id);
end;
$$;

create function public.archive_event(target_event_id uuid, expected_revision bigint)
returns jsonb language plpgsql security definer set search_path = '' as $$
declare actor_id uuid := auth.uid(); current_status text; before_snapshot jsonb;
begin
  if actor_id is null then raise exception 'Authentication required.' using errcode = '42501'; end if;
  if not private.is_event_admin(target_event_id, actor_id) then raise exception 'Administrator permission required.' using errcode = '42501'; end if;
  perform private.lock_event_for_mutation(target_event_id, expected_revision, true);
  if not private.is_event_admin(target_event_id, actor_id) then raise exception 'Administrator permission required.' using errcode = '42501'; end if;
  select status into current_status from public.events where id = target_event_id;
  before_snapshot := private.event_snapshot(target_event_id);
  update public.events
  set status = 'archived', archived_at = statement_timestamp(), archived_from_status = current_status
  where id = target_event_id;
  perform private.touch_event(target_event_id);
  perform private.write_event_audit(target_event_id, actor_id, 'event_archived', 'Archivó el evento.', before_snapshot, private.event_snapshot(target_event_id));
  return private.event_snapshot(target_event_id);
end;
$$;

create function public.restore_event(target_event_id uuid, expected_revision bigint)
returns jsonb language plpgsql security definer set search_path = '' as $$
declare actor_id uuid := auth.uid(); restore_status text; before_snapshot jsonb;
begin
  if actor_id is null then raise exception 'Authentication required.' using errcode = '42501'; end if;
  if not private.is_event_admin(target_event_id, actor_id) then raise exception 'Administrator permission required.' using errcode = '42501'; end if;
  perform private.lock_event_for_mutation(target_event_id, expected_revision, true, true);
  if not private.is_event_admin(target_event_id, actor_id) then raise exception 'Administrator permission required.' using errcode = '42501'; end if;
  select archived_from_status into restore_status from public.events where id = target_event_id and status = 'archived';
  if restore_status is null then raise exception 'The event is not archived.' using errcode = '22023'; end if;
  before_snapshot := private.event_snapshot(target_event_id);
  update public.events set status = restore_status, archived_at = null, archived_from_status = null where id = target_event_id;
  perform private.touch_event(target_event_id);
  perform private.write_event_audit(target_event_id, actor_id, 'event_restored', 'Restauró el evento.', before_snapshot, private.event_snapshot(target_event_id));
  return private.event_snapshot(target_event_id);
end;
$$;

revoke all on function private.event_snapshot(uuid), private.write_event_audit(uuid, uuid, text, text, jsonb, jsonb), private.protect_event_owner(), private.lock_event_for_mutation(uuid, bigint, boolean, boolean) from public, anon, authenticated;
revoke all on function public.transition_event_to_paying(uuid, bigint), public.reopen_event_expenses(uuid, bigint), public.archive_event(uuid, bigint), public.restore_event(uuid, bigint) from public, anon, authenticated;
grant execute on function public.transition_event_to_paying(uuid, bigint), public.reopen_event_expenses(uuid, bigint), public.archive_event(uuid, bigint), public.restore_event(uuid, bigint) to authenticated;

revoke insert, update, delete, truncate on public.events from anon, authenticated;
