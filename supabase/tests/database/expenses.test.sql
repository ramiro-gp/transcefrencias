begin;
select plan(16);

select has_table('public', 'expenses', 'expenses table exists');
select has_table('public', 'expense_participants', 'expense participants table exists');
select ok((select relrowsecurity from pg_catalog.pg_class where oid = 'public.expenses'::regclass), 'expenses has RLS');
select ok((select relrowsecurity from pg_catalog.pg_class where oid = 'public.expense_participants'::regclass), 'expense participants has RLS');
select ok(not has_table_privilege('authenticated', 'public.expenses', 'INSERT'), 'clients cannot insert expenses directly');

insert into auth.users (id, email, raw_user_meta_data) values
  ('30000000-0000-0000-0000-000000000001', 'expense-owner@example.test', '{"full_name":"Owner"}'),
  ('30000000-0000-0000-0000-000000000002', 'expense-member@example.test', '{"full_name":"Member"}'),
  ('30000000-0000-0000-0000-000000000003', 'expense-outsider@example.test', '{"full_name":"Outsider"}');

set local request.jwt.claim.sub = '30000000-0000-0000-0000-000000000001';
set local role authenticated;
create temporary table expense_event as select public.create_event('Gastos') as result;
create temporary table expense_invitation as select public.get_event_invitation((select (result ->> 'event_id')::uuid from expense_event)) as result;
reset role;

set local request.jwt.claim.sub = '30000000-0000-0000-0000-000000000002';
set local role authenticated;
select public.join_event((select (result ->> 'invitation_id')::uuid from expense_event), (select result ->> 'token' from expense_invitation));
create temporary table member_expense as select public.create_expense(
  (select (result ->> 'event_id')::uuid from expense_event), 'Cena', 'food', 1500,
  array[(select id from public.participants where event_id = (select (result ->> 'event_id')::uuid from expense_event) and profile_id = '30000000-0000-0000-0000-000000000002')], array[1500::bigint],
  array(select id from public.participants where event_id = (select (result ->> 'event_id')::uuid from expense_event))
) as id;
select is((select count(*) from public.expense_participants where expense_id = (select id from member_expense)), 2::bigint, 'expense preserves its consumers');
select lives_ok($$ select public.update_expense((select id from member_expense), 1, 'Cena editada', 'food', 1500, array(select participant_id from public.expense_payers where expense_id = (select id from member_expense)), array[1500::bigint], array(select participant_id from public.expense_participants where expense_id = (select id from member_expense))) $$, 'member can edit their own expense');
reset role;

set local request.jwt.claim.sub = '30000000-0000-0000-0000-000000000003';
set local role authenticated;
select is_empty($$ select id from public.expenses $$, 'outsider cannot read expenses');
select throws_ok($$ select public.delete_expense((select id from member_expense), 2) $$, '42501', 'Active membership required.', 'outsider cannot delete an expense');
reset role;

set local request.jwt.claim.sub = '30000000-0000-0000-0000-000000000001';
set local role authenticated;
select lives_ok($$ select public.delete_expense((select id from member_expense), 2) $$, 'admin can delete another member expense');
select is((select count(*) from public.expense_participants where expense_id = (select id from member_expense)), 2::bigint, 'logical deletion preserves consumers');
select is((select action from public.audit_log where expense_id = (select id from member_expense) order by created_at desc limit 1), 'expense_deleted', 'deletion is audited');
select throws_ok($$ select public.delete_expense((select id from member_expense), 3) $$, '22023', 'Expense not found.', 'deleted expense cannot be deleted again');
reset role;

alter table public.events drop constraint events_status_valid;
update public.events set status = 'paying';
set local request.jwt.claim.sub = '30000000-0000-0000-0000-000000000001';
set local role authenticated;
select throws_ok(
  $$ select public.create_expense((select (result ->> 'event_id')::uuid from expense_event), 'Fuera de estado', 'food', 1750, array[(select id from public.participants limit 1)], array[1750::bigint], array[(select id from public.participants limit 1)]) $$,
  '22023', 'Expenses can only be changed while loading expenses.', 'RPC rejects expense mutation outside loading state'
);
reset role;
select throws_ok(
  $$ insert into public.expenses(event_id, concept, category, amount, created_by) values ((select (result ->> 'event_id')::uuid from expense_event), 'Directo', 'food', 1750, '30000000-0000-0000-0000-000000000001') $$,
  '22023', 'Expenses can only be changed while loading expenses.', 'trigger rejects privileged mutation outside loading state'
);
update public.events set status='loading_expenses';
select throws_ok(
  $$ insert into public.expenses(event_id, concept, category, amount, created_by) values ((select (result ->> 'event_id')::uuid from expense_event), 'Sin aportes', 'food', 1750, '30000000-0000-0000-0000-000000000001'); set constraints all immediate $$,
  '23514', 'Expense payer amounts must exactly equal the expense total.', 'deferred constraint rejects an expense without matching payer totals'
);

rollback;
