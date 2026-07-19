alter table public.events drop constraint events_status_valid;
alter table public.events add constraint events_status_valid check (status in ('loading_expenses', 'paying'));

create function private.require_event_loading(target_event_id uuid, operation_name text)
returns void language plpgsql security definer set search_path = '' as $$
begin
  if not exists (select 1 from public.events where id = target_event_id and status = 'loading_expenses') then
    raise exception '% is only available while loading expenses.', operation_name using errcode = '22023';
  end if;
end;
$$;

create or replace function private.require_loading_expenses()
returns trigger language plpgsql security definer set search_path = '' as $$
declare target_event_id uuid := coalesce(new.event_id, old.event_id); current_status text;
begin
  select status into current_status from public.events where id = target_event_id for update;
  if current_status is distinct from 'loading_expenses' then
    raise exception 'Expenses can only be changed while loading expenses.' using errcode = '22023';
  end if;
  if tg_op = 'DELETE' then return old; end if;
  return new;
end;
$$;

create function private.freeze_economic_membership_changes()
returns trigger language plpgsql security definer set search_path = '' as $$
declare target_event_id uuid := coalesce(new.event_id, old.event_id); current_status text;
begin
  select status into current_status from public.events where id = target_event_id for update;
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

create trigger participants_require_loading_for_economic_changes
before insert or update or delete on public.participants
for each row execute function private.freeze_economic_membership_changes();

create trigger event_members_require_loading_for_membership_changes
before insert or update or delete on public.event_members
for each row execute function private.freeze_economic_membership_changes();

create function public.transition_event_to_paying(target_event_id uuid, expected_status text)
returns text language plpgsql security definer set search_path = '' as $$
declare actor_id uuid := auth.uid(); current_status text; active_expenses bigint;
begin
  if actor_id is null then raise exception 'Authentication required.' using errcode = '42501'; end if;
  select status into current_status from public.events where id = target_event_id for update;
  if current_status is null then raise exception 'Event not found.' using errcode = '22023'; end if;
  if not private.is_event_admin(target_event_id, actor_id) then raise exception 'Administrator permission required.' using errcode = '42501'; end if;
  if expected_status <> current_status then raise exception 'The event status changed. Reload before continuing.' using errcode = '40001'; end if;
  if current_status <> 'loading_expenses' then raise exception 'The event is not loading expenses.' using errcode = '22023'; end if;
  select count(*) into active_expenses from public.expenses where event_id = target_event_id and deleted_at is null;
  if active_expenses = 0 then raise exception 'Add at least one expense before settling.' using errcode = '22023'; end if;
  update public.events set status = 'paying', updated_at = statement_timestamp(), last_activity_at = statement_timestamp() where id = target_event_id;
  perform private.write_audit(target_event_id, actor_id, 'event_ready_to_pay', 'Marcó que es hora de pagar.');
  return 'paying';
end;
$$;

create function public.reopen_event_expenses(target_event_id uuid, expected_status text)
returns text language plpgsql security definer set search_path = '' as $$
declare actor_id uuid := auth.uid(); current_status text;
begin
  if actor_id is null then raise exception 'Authentication required.' using errcode = '42501'; end if;
  select status into current_status from public.events where id = target_event_id for update;
  if current_status is null then raise exception 'Event not found.' using errcode = '22023'; end if;
  if not private.is_event_admin(target_event_id, actor_id) then raise exception 'Administrator permission required.' using errcode = '42501'; end if;
  if expected_status <> current_status then raise exception 'The event status changed. Reload before continuing.' using errcode = '40001'; end if;
  if current_status <> 'paying' then raise exception 'The event is not ready to pay.' using errcode = '22023'; end if;
  update public.events set status = 'loading_expenses', updated_at = statement_timestamp(), last_activity_at = statement_timestamp() where id = target_event_id;
  perform private.write_audit(target_event_id, actor_id, 'event_reopened', 'Reabrió la carga de gastos.');
  return 'loading_expenses';
end;
$$;

revoke all on function private.require_event_loading(uuid, text), private.freeze_economic_membership_changes() from public, anon, authenticated;
revoke all on function public.transition_event_to_paying(uuid, text), public.reopen_event_expenses(uuid, text) from public, anon, authenticated;
grant execute on function public.transition_event_to_paying(uuid, text), public.reopen_event_expenses(uuid, text) to authenticated;
