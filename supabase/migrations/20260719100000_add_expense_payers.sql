create table public.expense_payers (
  event_id uuid not null,
  expense_id uuid not null,
  participant_id uuid not null,
  amount bigint not null check (amount > 0 and amount <= 9007199254740991 and amount % 500 = 0),
  primary key (expense_id, participant_id),
  foreign key (event_id, expense_id) references public.expenses(event_id, id) on delete restrict,
  foreign key (event_id, participant_id) references public.participants(event_id, id) on delete restrict
);
insert into public.expense_payers(event_id, expense_id, participant_id, amount) select event_id, id, payer_id, amount from public.expenses;
do $$ begin
  if exists (select 1 from public.expenses e left join public.expense_payers p on p.expense_id=e.id group by e.id,e.amount having count(p.participant_id)=0 or sum(p.amount)<>e.amount) then raise exception 'Expense payer backfill failed'; end if;
end $$;
alter table public.expenses drop constraint expenses_payer_event_fk, drop column payer_id;
create index expense_payers_by_participant on public.expense_payers(event_id, participant_id);

create or replace function private.expense_snapshot(target_expense_id uuid) returns jsonb language sql stable security definer set search_path='' as $$
 select jsonb_build_object('concept',e.concept,'category',e.category,'amount',e.amount,'payers',coalesce((select jsonb_agg(jsonb_build_object('participant_id',p.participant_id,'amount',p.amount) order by p.participant_id) from public.expense_payers p where p.expense_id=e.id),'[]'::jsonb),'participant_ids',coalesce((select jsonb_agg(ep.participant_id order by ep.participant_id) from public.expense_participants ep where ep.expense_id=e.id),'[]'::jsonb)) from public.expenses e where e.id=target_expense_id
$$;

create or replace function private.validate_expense_input(target_event_id uuid, target_concept text, target_category text, target_amount bigint, target_payer_ids uuid[], target_payer_amounts bigint[], target_participant_ids uuid[], allow_historical boolean default false, historical_payer_ids uuid[] default '{}'::uuid[], historical_participant_ids uuid[] default '{}'::uuid[]) returns void language plpgsql security definer set search_path='' as $$
begin
 if target_concept<>btrim(target_concept) or char_length(target_concept) not between 1 and 100 or target_concept~'[[:cntrl:]]' then raise exception 'Invalid expense concept.' using errcode='22023'; end if;
 if target_category not in ('food','drink','alcohol','cannabis','other') or target_amount<=0 or target_amount>9007199254740991 or target_amount%500<>0 then raise exception 'Invalid expense input.' using errcode='22023'; end if;
 if coalesce(array_length(target_payer_ids,1),0)=0 or array_length(target_payer_ids,1)<>array_length(target_payer_amounts,1) or (select count(*) from unnest(target_payer_ids) x)<>(select count(distinct x) from unnest(target_payer_ids) x) or (select coalesce(sum(x),0) from unnest(target_payer_amounts) x)<>target_amount or exists(select 1 from unnest(target_payer_amounts) x where x<=0 or x%500<>0) then raise exception 'Payer amounts must exactly equal the expense amount.' using errcode='22023'; end if;
 if coalesce(array_length(target_participant_ids,1),0)=0 or (select count(*) from unnest(target_participant_ids)x)<>(select count(distinct x) from unnest(target_participant_ids)x) then raise exception 'At least one unique consumer is required.' using errcode='22023'; end if;
 if exists(select 1 from unnest(target_payer_ids) x left join public.participants p on p.id=x and p.event_id=target_event_id where p.id is null or (not p.active and (not allow_historical or not x=any(historical_payer_ids)))) then raise exception 'Payers must be active event participants.' using errcode='22023'; end if;
 if exists(select 1 from unnest(target_participant_ids) x left join public.participants p on p.id=x and p.event_id=target_event_id where p.id is null or (not p.active and (not allow_historical or not x=any(historical_participant_ids)))) then raise exception 'Consumers must be active event participants.' using errcode='22023'; end if;
end $$;
drop function public.create_expense(uuid,text,text,bigint,uuid,uuid[]);
drop function public.update_expense(uuid,bigint,text,text,bigint,uuid,uuid[]);
create function public.create_expense(target_event_id uuid, expense_concept text, expense_category text, expense_amount bigint, expense_payer_ids uuid[], expense_payer_amounts bigint[], expense_participant_ids uuid[]) returns uuid language plpgsql security definer set search_path='' as $$ declare actor_id uuid:=auth.uid(); expense_id uuid; begin
 if actor_id is null or not private.is_active_member(target_event_id,actor_id) then raise exception 'Active membership required.' using errcode='42501'; end if;
 if not exists(select 1 from public.events where id=target_event_id and status='loading_expenses') then raise exception 'Expenses can only be changed while loading expenses.' using errcode='22023'; end if;
 perform private.validate_expense_input(target_event_id,expense_concept,expense_category,expense_amount,expense_payer_ids,expense_payer_amounts,expense_participant_ids);
 insert into public.expenses(event_id,concept,category,amount,created_by) values(target_event_id,btrim(expense_concept),expense_category,expense_amount,actor_id) returning id into expense_id;
 insert into public.expense_payers(event_id,expense_id,participant_id,amount) select target_event_id,expense_id,id,amount from unnest(expense_payer_ids,expense_payer_amounts) as x(id,amount);
 insert into public.expense_participants(event_id,expense_id,participant_id) select target_event_id,expense_id,id from unnest(expense_participant_ids) id;
 perform private.touch_event(target_event_id); perform private.write_expense_audit(target_event_id,actor_id,expense_id,'expense_created','Cargó un gasto.',jsonb_build_object('after',private.expense_snapshot(expense_id))); return expense_id; end $$;
create function public.update_expense(target_expense_id uuid, expected_revision bigint, expense_concept text, expense_category text, expense_amount bigint, expense_payer_ids uuid[], expense_payer_amounts bigint[], expense_participant_ids uuid[]) returns bigint language plpgsql security definer set search_path='' as $$ declare actor_id uuid:=auth.uid(); target_event uuid; current_revision bigint; before jsonb; next_revision bigint; old_payers uuid[]; old_consumers uuid[]; begin
 select e.event_id,e.revision into target_event,current_revision from public.expenses e where e.id=target_expense_id and e.deleted_at is null for update; if target_event is null then raise exception 'Expense not found.' using errcode='22023'; end if;
 if actor_id is null or not private.is_active_member(target_event,actor_id) or (not private.is_event_admin(target_event,actor_id) and not exists(select 1 from public.expenses where id=target_expense_id and created_by=actor_id)) then raise exception 'Expense author or administrator permission required.' using errcode='42501'; end if;
 if current_revision<>expected_revision then raise exception 'This expense changed. Reload the current data before saving.' using errcode='40001'; end if;
 select coalesce(array_agg(participant_id),'{}') into old_payers from public.expense_payers where expense_id=target_expense_id; select coalesce(array_agg(participant_id),'{}') into old_consumers from public.expense_participants where expense_id=target_expense_id;
 perform private.validate_expense_input(target_event,expense_concept,expense_category,expense_amount,expense_payer_ids,expense_payer_amounts,expense_participant_ids,true,old_payers,old_consumers); before:=private.expense_snapshot(target_expense_id);
 update public.expenses set concept=btrim(expense_concept),category=expense_category,amount=expense_amount,revision=revision+1,updated_at=statement_timestamp() where id=target_expense_id returning revision into next_revision; delete from public.expense_payers where expense_id=target_expense_id; delete from public.expense_participants where expense_id=target_expense_id;
 insert into public.expense_payers(event_id,expense_id,participant_id,amount) select target_event,target_expense_id,id,amount from unnest(expense_payer_ids,expense_payer_amounts) as x(id,amount); insert into public.expense_participants(event_id,expense_id,participant_id) select target_event,target_expense_id,id from unnest(expense_participant_ids) id;
 perform private.touch_event(target_event); perform private.write_expense_audit(target_event,actor_id,target_expense_id,'expense_updated','Editó un gasto.',jsonb_build_object('before',before,'after',private.expense_snapshot(target_expense_id))); return next_revision; end $$;
revoke all on public.expense_payers from anon,authenticated; grant select on public.expense_payers to authenticated; alter table public.expense_payers enable row level security; create policy expense_payers_select_member on public.expense_payers for select to authenticated using(private.is_active_member(event_id,auth.uid()));
revoke all on function public.create_expense(uuid,text,text,bigint,uuid[],bigint[],uuid[]), public.update_expense(uuid,bigint,text,text,bigint,uuid[],bigint[],uuid[]) from public,anon,authenticated; grant execute on function public.create_expense(uuid,text,text,bigint,uuid[],bigint[],uuid[]), public.update_expense(uuid,bigint,text,text,bigint,uuid[],bigint[],uuid[]) to authenticated;
