alter table public.participants add constraint participants_event_id_id_unique unique (event_id, id);

create table public.expenses (
  id uuid primary key default gen_random_uuid(),
  event_id uuid not null references public.events (id) on delete restrict,
  concept text not null,
  category text not null,
  amount bigint not null,
  payer_id uuid not null,
  created_by uuid not null references public.profiles (id) on delete restrict,
  revision bigint not null default 1,
  created_at timestamp with time zone not null default statement_timestamp(),
  updated_at timestamp with time zone not null default statement_timestamp(),
  deleted_at timestamp with time zone,
  deleted_by uuid references public.profiles (id) on delete restrict,
  constraint expenses_event_id_id_unique unique (event_id, id),
  constraint expenses_concept_valid check (
    concept = btrim(concept) and char_length(concept) between 1 and 100 and concept !~ '[[:cntrl:]]'
  ),
  constraint expenses_category_valid check (category in ('food', 'drink', 'alcohol', 'cannabis', 'other')),
  constraint expenses_amount_valid check (amount > 0 and amount <= 9007199254740991 and amount % 500 = 0),
  constraint expenses_revision_valid check (revision > 0),
  constraint expenses_deleted_valid check (
    (deleted_at is null and deleted_by is null) or (deleted_at is not null and deleted_by is not null)
  ),
  constraint expenses_payer_event_fk foreign key (event_id, payer_id)
    references public.participants (event_id, id) on delete restrict
);

create table public.expense_participants (
  event_id uuid not null,
  expense_id uuid not null,
  participant_id uuid not null,
  primary key (expense_id, participant_id),
  constraint expense_participants_expense_fk foreign key (event_id, expense_id)
    references public.expenses (event_id, id) on delete restrict,
  constraint expense_participants_participant_fk foreign key (event_id, participant_id)
    references public.participants (event_id, id) on delete restrict
);

create index expenses_active_by_event on public.expenses (event_id, created_at desc) where deleted_at is null;
create index expense_participants_by_participant on public.expense_participants (event_id, participant_id);

alter table public.audit_log add column expense_id uuid references public.expenses (id) on delete restrict;
alter table public.audit_log add column details jsonb;
alter table public.audit_log add constraint audit_log_details_object check (details is null or jsonb_typeof(details) = 'object');

create function private.write_expense_audit(
  target_event_id uuid,
  target_actor_id uuid,
  target_expense_id uuid,
  target_action text,
  target_summary text,
  target_details jsonb
)
returns void language plpgsql security definer set search_path = '' as $$
declare actor_name text;
begin
  select coalesce(nickname, full_name) into actor_name from public.profiles where id = target_actor_id;
  if actor_name is null then actor_name := 'Sistema'; end if;
  insert into public.audit_log (event_id, actor_id, actor_display_name, expense_id, action, summary, details)
  values (target_event_id, target_actor_id, actor_name, target_expense_id, target_action, target_summary, target_details);
end;
$$;

create function private.expense_snapshot(target_expense_id uuid)
returns jsonb language sql stable security definer set search_path = '' as $$
  select jsonb_build_object(
    'concept', e.concept,
    'category', e.category,
    'amount', e.amount,
    'payer_id', e.payer_id,
    'participant_ids', coalesce((select jsonb_agg(ep.participant_id order by ep.participant_id) from public.expense_participants ep where ep.expense_id = e.id), '[]'::jsonb)
  ) from public.expenses e where e.id = target_expense_id
$$;

create function private.validate_expense_input(
  target_event_id uuid,
  target_concept text,
  target_category text,
  target_amount bigint,
  target_payer_id uuid,
  target_participant_ids uuid[],
  allow_historical boolean default false,
  historical_payer_id uuid default null,
  historical_participant_ids uuid[] default '{}'::uuid[]
)
returns void language plpgsql security definer set search_path = '' as $$
declare invalid_count integer;
begin
  if target_concept <> btrim(target_concept) or char_length(target_concept) not between 1 and 100 or target_concept ~ '[[:cntrl:]]' then
    raise exception 'Invalid expense concept.' using errcode = '22023';
  end if;
  if target_category not in ('food', 'drink', 'alcohol', 'cannabis', 'other') then raise exception 'Invalid expense category.' using errcode = '22023'; end if;
  if target_amount <= 0 or target_amount > 9007199254740991 or target_amount % 500 <> 0 then raise exception 'Invalid expense amount.' using errcode = '22023'; end if;
  if coalesce(array_length(target_participant_ids, 1), 0) = 0 then raise exception 'At least one consumer is required.' using errcode = '22023'; end if;
  if (select count(*) from unnest(target_participant_ids) id) <> (select count(distinct id) from unnest(target_participant_ids) id) then raise exception 'Expense consumers must be unique.' using errcode = '22023'; end if;
  select count(*) into invalid_count from public.participants p
  where p.event_id = target_event_id and p.id = target_payer_id
    and (not allow_historical or p.active or p.id = historical_payer_id);
  if invalid_count <> 1 then raise exception 'The payer must be an active event participant.' using errcode = '22023'; end if;
  select count(*) into invalid_count from unnest(target_participant_ids) consumer(participant_id)
  left join public.participants p on p.id = consumer.participant_id and p.event_id = target_event_id
  where p.id is null or (not p.active and (not allow_historical or not (consumer.participant_id = any(historical_participant_ids))));
  if invalid_count <> 0 then raise exception 'Consumers must be active event participants.' using errcode = '22023'; end if;
end;
$$;

create function public.create_expense(target_event_id uuid, expense_concept text, expense_category text, expense_amount bigint, expense_payer_id uuid, expense_participant_ids uuid[])
returns uuid language plpgsql security definer set search_path = '' as $$
declare actor_id uuid := auth.uid(); expense_id uuid;
begin
  if actor_id is null or not private.is_active_member(target_event_id, actor_id) then raise exception 'Active membership required.' using errcode = '42501'; end if;
  if not exists (select 1 from public.events where id = target_event_id and status = 'loading_expenses') then raise exception 'Expenses can only be changed while loading expenses.' using errcode = '22023'; end if;
  perform private.validate_expense_input(target_event_id, expense_concept, expense_category, expense_amount, expense_payer_id, expense_participant_ids);
  insert into public.expenses (event_id, concept, category, amount, payer_id, created_by)
  values (target_event_id, btrim(expense_concept), expense_category, expense_amount, expense_payer_id, actor_id) returning id into expense_id;
  insert into public.expense_participants (event_id, expense_id, participant_id)
  select target_event_id, expense_id, id from unnest(expense_participant_ids) id;
  perform private.touch_event(target_event_id);
  perform private.write_expense_audit(target_event_id, actor_id, expense_id, 'expense_created', 'Cargó un gasto.', jsonb_build_object('after', private.expense_snapshot(expense_id)));
  return expense_id;
end;
$$;

create function public.update_expense(target_expense_id uuid, expected_revision bigint, expense_concept text, expense_category text, expense_amount bigint, expense_payer_id uuid, expense_participant_ids uuid[])
returns bigint language plpgsql security definer set search_path = '' as $$
declare actor_id uuid := auth.uid(); target_event_id uuid; current_revision bigint; current_payer_id uuid; current_participant_ids uuid[]; before_snapshot jsonb; next_revision bigint;
begin
  select event_id, revision, payer_id into target_event_id, current_revision, current_payer_id from public.expenses where id = target_expense_id and deleted_at is null for update;
  if target_event_id is null then raise exception 'Expense not found.' using errcode = '22023'; end if;
  if actor_id is null or not private.is_active_member(target_event_id, actor_id) then raise exception 'Active membership required.' using errcode = '42501'; end if;
  if not private.is_event_admin(target_event_id, actor_id) and not exists (select 1 from public.expenses where id = target_expense_id and created_by = actor_id) then raise exception 'Expense author or administrator permission required.' using errcode = '42501'; end if;
  if not exists (select 1 from public.events where id = target_event_id and status = 'loading_expenses') then raise exception 'Expenses can only be changed while loading expenses.' using errcode = '22023'; end if;
  if current_revision <> expected_revision then raise exception 'This expense changed. Reload the current data before saving.' using errcode = '40001'; end if;
  select coalesce(array_agg(participant_id), '{}'::uuid[]) into current_participant_ids from public.expense_participants where expense_id = target_expense_id;
  perform private.validate_expense_input(target_event_id, expense_concept, expense_category, expense_amount, expense_payer_id, expense_participant_ids, true, current_payer_id, current_participant_ids);
  before_snapshot := private.expense_snapshot(target_expense_id);
  update public.expenses set concept = btrim(expense_concept), category = expense_category, amount = expense_amount, payer_id = expense_payer_id, revision = revision + 1, updated_at = statement_timestamp() where id = target_expense_id returning revision into next_revision;
  delete from public.expense_participants where expense_id = target_expense_id;
  insert into public.expense_participants (event_id, expense_id, participant_id) select target_event_id, target_expense_id, id from unnest(expense_participant_ids) id;
  perform private.touch_event(target_event_id);
  perform private.write_expense_audit(target_event_id, actor_id, target_expense_id, 'expense_updated', 'Editó un gasto.', jsonb_build_object('before', before_snapshot, 'after', private.expense_snapshot(target_expense_id)));
  return next_revision;
end;
$$;

create function public.delete_expense(target_expense_id uuid, expected_revision bigint)
returns void language plpgsql security definer set search_path = '' as $$
declare actor_id uuid := auth.uid(); target_event_id uuid; current_revision bigint; before_snapshot jsonb;
begin
  select event_id, revision into target_event_id, current_revision from public.expenses where id = target_expense_id and deleted_at is null for update;
  if target_event_id is null then raise exception 'Expense not found.' using errcode = '22023'; end if;
  if actor_id is null or not private.is_active_member(target_event_id, actor_id) then raise exception 'Active membership required.' using errcode = '42501'; end if;
  if not private.is_event_admin(target_event_id, actor_id) and not exists (select 1 from public.expenses where id = target_expense_id and created_by = actor_id) then raise exception 'Expense author or administrator permission required.' using errcode = '42501'; end if;
  if not exists (select 1 from public.events where id = target_event_id and status = 'loading_expenses') then raise exception 'Expenses can only be changed while loading expenses.' using errcode = '22023'; end if;
  if current_revision <> expected_revision then raise exception 'This expense changed. Reload the current data before deleting.' using errcode = '40001'; end if;
  before_snapshot := private.expense_snapshot(target_expense_id);
  update public.expenses set deleted_at = statement_timestamp(), deleted_by = actor_id, revision = revision + 1, updated_at = statement_timestamp() where id = target_expense_id;
  perform private.touch_event(target_event_id);
  perform private.write_expense_audit(target_event_id, actor_id, target_expense_id, 'expense_deleted', 'Eliminó un gasto.', jsonb_build_object('before', before_snapshot));
end;
$$;

revoke all on public.expenses, public.expense_participants from anon, authenticated;
grant select on public.expenses, public.expense_participants to authenticated;
revoke all on function public.create_expense(uuid, text, text, bigint, uuid, uuid[]), public.update_expense(uuid, bigint, text, text, bigint, uuid, uuid[]), public.delete_expense(uuid, bigint) from public, anon, authenticated;
grant execute on function public.create_expense(uuid, text, text, bigint, uuid, uuid[]), public.update_expense(uuid, bigint, text, text, bigint, uuid, uuid[]), public.delete_expense(uuid, bigint) to authenticated;
revoke all on function private.write_expense_audit(uuid, uuid, uuid, text, text, jsonb), private.expense_snapshot(uuid), private.validate_expense_input(uuid, text, text, bigint, uuid, uuid[], boolean, uuid, uuid[]) from public, anon, authenticated;

alter table public.expenses enable row level security;
alter table public.expense_participants enable row level security;
create policy expenses_select_member on public.expenses for select to authenticated using (private.is_active_member(event_id, auth.uid()));
create policy expense_participants_select_member on public.expense_participants for select to authenticated using (private.is_active_member(event_id, auth.uid()));
