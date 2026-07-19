begin;

select no_plan();

select has_table('public', 'events', 'events table exists');
select has_table('public', 'event_members', 'event_members table exists');
select has_table('public', 'participants', 'participants table exists');
select has_table('public', 'audit_log', 'audit table exists');
select has_table('private', 'event_invitations', 'invitation data stays private');
select ok((select relrowsecurity from pg_catalog.pg_class where oid = 'public.events'::regclass), 'events has RLS');
select ok((select relrowsecurity from pg_catalog.pg_class where oid = 'public.event_members'::regclass), 'members has RLS');
select ok((select relrowsecurity from pg_catalog.pg_class where oid = 'public.participants'::regclass), 'participants has RLS');
select ok((select relrowsecurity from pg_catalog.pg_class where oid = 'public.audit_log'::regclass), 'audit has RLS');
select ok(not has_table_privilege('authenticated', 'private.event_invitations', 'SELECT'), 'clients cannot read invitation data');
select ok(not has_table_privilege('authenticated', 'public.events', 'INSERT'), 'clients cannot insert events directly');
select ok(has_function_privilege('authenticated', 'public.create_event(text)', 'EXECUTE'), 'clients can create events through RPC');

insert into auth.users (id, email, raw_user_meta_data)
values
  ('20000000-0000-0000-0000-000000000001', 'owner@example.test', '{"full_name":"Owner"}'),
  ('20000000-0000-0000-0000-000000000002', 'member@example.test', '{"full_name":"Member","nickname":"M"}'),
  ('20000000-0000-0000-0000-000000000003', 'outsider@example.test', '{"full_name":"Outsider"}');

set local request.jwt.claim.sub = '20000000-0000-0000-0000-000000000001';
set local role authenticated;
create temporary table event_result as select public.create_event(' Sábado ') as result;
create temporary table owner_invitation as select public.get_event_invitation((select (result ->> 'event_id')::uuid from event_result)) as result;
reset role;

select ok((select (result ->> 'token') ~ '^[0-9a-f]{64}$' from event_result), 'event creates a 256-bit invitation identifier');
select is((select result ->> 'token' from owner_invitation), (select result ->> 'token' from event_result), 'owner can recover the stable invitation from another session');
select is((select name from public.events), 'Sábado', 'event name is normalized');
select is((select role from public.event_members), 'owner', 'creator is owner');
select is((select count(*) from public.participants), 1::bigint, 'creator receives an economic participant');

set local request.jwt.claim.sub = '20000000-0000-0000-0000-000000000003';
set local role authenticated;
select is_empty($$ select id from public.events $$, 'outsider cannot read event');
select throws_ok(
  $$ select public.get_event_invitation((select (result ->> 'event_id')::uuid from event_result)) $$,
  '42501', 'Owner permission required.', 'outsider cannot recover the invitation'
);
reset role;

set local request.jwt.claim.sub = '20000000-0000-0000-0000-000000000002';
set local role authenticated;
select is(
  public.join_event((select (result ->> 'invitation_id')::uuid from event_result), (select result ->> 'token' from event_result)),
  (select (result ->> 'event_id')::uuid from event_result),
  'member joins only through valid invitation RPC'
);
select results_eq($$ select id from public.events $$, $$ select (result ->> 'event_id')::uuid from event_result $$, 'member can read joined event');
select results_eq($$ select id from public.profiles order by id $$, $$ values ('20000000-0000-0000-0000-000000000001'::uuid), ('20000000-0000-0000-0000-000000000002'::uuid) $$, 'members can see each other but not outsiders');
select throws_ok(
  $$ select public.get_event_invitation((select (result ->> 'event_id')::uuid from event_result)) $$,
  '42501', 'Owner permission required.', 'member cannot recover the invitation'
);
select lives_ok(
  $$ select public.leave_event((select (result ->> 'event_id')::uuid from event_result)) $$,
  'member can leave through controlled RPC'
);
select throws_ok(
  $$ select public.get_event_invitation((select (result ->> 'event_id')::uuid from event_result)) $$,
  '42501', 'Owner permission required.', 'former member cannot recover the invitation'
);
select is_empty(
  $$ select profile_id from public.event_members where event_id = (select (result ->> 'event_id')::uuid from event_result) and left_at is not null $$,
  'former members cannot inspect inactive memberships'
);
reset role;

set local role anon;
select throws_ok(
  $$ select public.get_event_invitation('00000000-0000-0000-0000-000000000000'::uuid) $$,
  '42501', 'permission denied for function get_event_invitation', 'anonymous users cannot recover the invitation'
);
reset role;

select is(
  (select role from public.event_members where event_id = (select (result ->> 'event_id')::uuid from event_result) and profile_id = '20000000-0000-0000-0000-000000000001'),
  'owner',
  'owner membership remains active'
);
set local request.jwt.claim.sub = '20000000-0000-0000-0000-000000000001';
set local role authenticated;
select is(
  (select count(*) from public.event_members where event_id = (select (result ->> 'event_id')::uuid from event_result) and left_at is not null),
  1::bigint,
  'owner can inspect inactive memberships for administration'
);
reset role;
select is(
  (select actor_display_name from public.audit_log where action = 'event_created'),
  'Owner',
  'audit preserves the actor display name'
);
update public.profiles set nickname = 'Nuevo apodo' where id = '20000000-0000-0000-0000-000000000001';
select is(
  (select actor_display_name from public.audit_log where action = 'event_created'),
  'Owner',
  'audit actor snapshot survives profile changes'
);

set local request.jwt.claim.sub = '20000000-0000-0000-0000-000000000002';
set local role authenticated;
select lives_ok(
  $$ select public.join_event((select (result ->> 'invitation_id')::uuid from event_result), (select result ->> 'token' from event_result)) $$,
  'former voluntary member can rejoin'
);
reset role;

set local request.jwt.claim.sub = '20000000-0000-0000-0000-000000000001';
set local role authenticated;
select lives_ok(
  $$ select public.set_coadmin((select (result ->> 'event_id')::uuid from event_result), '20000000-0000-0000-0000-000000000002', true) $$,
  'owner can name a coadmin'
);
reset role;

set local request.jwt.claim.sub = '20000000-0000-0000-0000-000000000003';
set local role authenticated;
select lives_ok(
  $$ select public.join_event((select (result ->> 'invitation_id')::uuid from event_result), (select result ->> 'token' from event_result)) $$,
  'outsider can join with the invitation before expulsion'
);
reset role;

set local request.jwt.claim.sub = '20000000-0000-0000-0000-000000000001';
set local role authenticated;
select lives_ok(
  $$ select public.set_coadmin((select (result ->> 'event_id')::uuid from event_result), '20000000-0000-0000-0000-000000000003', true) $$,
  'owner can name the target a coadmin before expulsion'
);
reset role;

set local request.jwt.claim.sub = '20000000-0000-0000-0000-000000000002';
set local role authenticated;
select lives_ok(
  $$ select public.expel_event_member((select (result ->> 'event_id')::uuid from event_result), '20000000-0000-0000-0000-000000000003') $$,
  'coadmin can expel an active member'
);
reset role;
select is(
  (select role from public.event_members where event_id = (select (result ->> 'event_id')::uuid from event_result) and profile_id = '20000000-0000-0000-0000-000000000003'),
  'member',
  'expulsion removes the coadmin role if present and leaves member role'
);
select ok(
  (select left_at is not null and rejoin_blocked_at is not null from public.event_members where event_id = (select (result ->> 'event_id')::uuid from event_result) and profile_id = '20000000-0000-0000-0000-000000000003'),
  'expulsion deactivates and blocks membership'
);
select ok(
  not (select active from public.participants where event_id = (select (result ->> 'event_id')::uuid from event_result) and profile_id = '20000000-0000-0000-0000-000000000003'),
  'expulsion deactivates the economic person'
);
select is(
  (select summary from public.audit_log where action = 'member_expelled'),
  'expulsó a Outsider.',
  'expulsion is audited with the affected person'
);

set local request.jwt.claim.sub = '20000000-0000-0000-0000-000000000003';
set local role authenticated;
select throws_ok(
  $$ select public.join_event((select (result ->> 'invitation_id')::uuid from event_result), (select result ->> 'token' from event_result)) $$,
  '42501', 'Rejoin is not allowed.', 'expelled member cannot bypass the block through the join RPC'
);
reset role;

set local request.jwt.claim.sub = '20000000-0000-0000-0000-000000000001';
set local role authenticated;
select lives_ok(
  $$ select public.allow_event_rejoin((select (result ->> 'event_id')::uuid from event_result), '20000000-0000-0000-0000-000000000003') $$,
  'owner can allow a blocked member to rejoin'
);
select lives_ok(
  $$ select public.set_coadmin((select (result ->> 'event_id')::uuid from event_result), '20000000-0000-0000-0000-000000000002', false) $$,
  'owner can remove coadmin role'
);
reset role;

set local request.jwt.claim.sub = '20000000-0000-0000-0000-000000000003';
set local role authenticated;
select lives_ok(
  $$ select public.join_event((select (result ->> 'invitation_id')::uuid from event_result), (select result ->> 'token' from event_result)) $$,
  'allowed member can rejoin as a member'
);
reset role;
select is(
  (select role from public.event_members where event_id = (select (result ->> 'event_id')::uuid from event_result) and profile_id = '20000000-0000-0000-0000-000000000003'),
  'member',
  'rejoin never restores coadmin role'
);

set local request.jwt.claim.sub = '20000000-0000-0000-0000-000000000002';
set local role authenticated;
select throws_ok(
  $$ select public.expel_event_member((select (result ->> 'event_id')::uuid from event_result), '20000000-0000-0000-0000-000000000003') $$,
  '42501', 'Administrator permission required.', 'regular member cannot expel'
);
reset role;

set local request.jwt.claim.sub = '20000000-0000-0000-0000-000000000001';
set local role authenticated;
create temporary table manual_person as
select public.create_manual_participant((select (result ->> 'event_id')::uuid from event_result), 'Juan') as id;
select lives_ok(
  $$ select public.link_manual_participant((select id from manual_person), '20000000-0000-0000-0000-000000000003') $$,
  'admin can link a manual person'
);
reset role;
select is(
  (select summary from public.audit_log where action = 'person_linked'),
  'vinculó a Juan con Outsider.',
  'link audit identifies both people'
);

set local request.jwt.claim.sub = '20000000-0000-0000-0000-000000000001';
set local role authenticated;
select public.create_expense(
  (select (result ->> 'event_id')::uuid from event_result),
  'Cierre', 'food', 500,
  array[(select id from public.participants where event_id = (select (result ->> 'event_id')::uuid from event_result) and profile_id = '20000000-0000-0000-0000-000000000001')],
  array[500::bigint],
  array[(select id from public.participants where event_id = (select (result ->> 'event_id')::uuid from event_result) and profile_id = '20000000-0000-0000-0000-000000000001')]
);
select is(
  public.transition_event_to_paying((select (result ->> 'event_id')::uuid from event_result), 'loading_expenses'),
  'paying',
  'owner can close expenses and enter paying'
);
select is((select status from public.events where id = (select (result ->> 'event_id')::uuid from event_result)), 'paying', 'paying status is persisted');
select is((select summary from public.audit_log where action = 'event_ready_to_pay'), 'Marcó que es hora de pagar.', 'status transition is audited');
reset role;
set local request.jwt.claim.sub = '20000000-0000-0000-0000-000000000003';
set local role authenticated;
select throws_ok(
  $$ select public.leave_event((select (result ->> 'event_id')::uuid from event_result)) $$,
  '22023', 'Membership can only be changed while loading expenses.', 'membership changes freeze while paying'
);
reset role;
set local request.jwt.claim.sub = '20000000-0000-0000-0000-000000000001';
set local role authenticated;
select is(
  public.reopen_event_expenses((select (result ->> 'event_id')::uuid from event_result), 'paying'),
  'loading_expenses',
  'owner can reopen expenses'
);
select is((select summary from public.audit_log where action = 'event_reopened'), 'Reabrió la carga de gastos.', 'reopening is audited');
create temporary table empty_event as select public.create_event('Vacío') as result;
select throws_ok(
  $$ select public.transition_event_to_paying((select (result ->> 'event_id')::uuid from empty_event), 'loading_expenses') $$,
  '22023', 'Add at least one expense before settling.', 'empty events cannot enter paying'
);
reset role;
set local request.jwt.claim.sub = '20000000-0000-0000-0000-000000000003';
set local role authenticated;
select throws_ok(
  $$ select public.transition_event_to_paying((select (result ->> 'event_id')::uuid from event_result), 'loading_expenses') $$,
  '42501', 'Administrator permission required.', 'members cannot change settlement status'
);
reset role;

select * from finish();
rollback;
