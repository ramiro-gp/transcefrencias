create function private.check_expense_payer_total()
returns trigger language plpgsql security definer set search_path='' as $$
declare target_expense_id uuid; expense_total bigint; payer_total numeric; payer_count bigint;
begin
  if tg_table_name='expenses' then target_expense_id:=coalesce(new.id,old.id); else target_expense_id:=coalesce(new.expense_id,old.expense_id); end if;
  select amount into expense_total from public.expenses where id=target_expense_id;
  if expense_total is null then return null; end if;
  select count(*),coalesce(sum(amount),0) into payer_count,payer_total from public.expense_payers where expense_id=target_expense_id;
  if payer_count=0 or payer_total<>expense_total then raise exception 'Expense payer amounts must exactly equal the expense total.' using errcode='23514'; end if;
  return null;
end $$;
create constraint trigger expenses_payer_total_after_expense after insert or update on public.expenses deferrable initially deferred for each row execute function private.check_expense_payer_total();
create constraint trigger expenses_payer_total_after_payer after insert or update or delete on public.expense_payers deferrable initially deferred for each row execute function private.check_expense_payer_total();
revoke all on function private.check_expense_payer_total() from public,anon,authenticated;
