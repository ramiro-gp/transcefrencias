create function private.require_loading_expenses()
returns trigger language plpgsql security definer set search_path='' as $$
declare target_event_id uuid;
begin
  target_event_id := coalesce(new.event_id, old.event_id);
  if not exists (select 1 from public.events where id=target_event_id and status='loading_expenses') then
    raise exception 'Expenses can only be changed while loading expenses.' using errcode='22023';
  end if;
  return coalesce(new, old);
end $$;
create trigger expenses_require_loading before insert or update on public.expenses for each row execute function private.require_loading_expenses();
create trigger expense_payers_require_loading before insert or update or delete on public.expense_payers for each row execute function private.require_loading_expenses();
create trigger expense_participants_require_loading before insert or update or delete on public.expense_participants for each row execute function private.require_loading_expenses();
revoke all on function private.require_loading_expenses() from public,anon,authenticated;
