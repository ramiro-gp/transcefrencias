begin;

select no_plan();

select has_column('public', 'events', 'revision', 'events expose an optimistic revision');
select has_column('public', 'events', 'archived_at', 'events record when they were archived');
select has_column('public', 'events', 'archived_from_status', 'events record the status restored after archiving');
select has_column('public', 'audit_log', 'details', 'event audits can preserve before and after snapshots');
select ok(not has_table_privilege('authenticated', 'public.events', 'UPDATE'), 'clients cannot update events directly');
select ok(to_regprocedure('public.transition_event_to_paying(uuid,text)') is null, 'status-based transition overload was removed');
select ok(to_regprocedure('public.reopen_event_expenses(uuid,text)') is null, 'status-based reopen overload was removed');
select ok(has_function_privilege('authenticated', 'public.archive_event(uuid,bigint)', 'EXECUTE'), 'authenticated users can call controlled archive RPC');
select ok(has_function_privilege('authenticated', 'public.restore_event(uuid,bigint)', 'EXECUTE'), 'authenticated users can call controlled restore RPC');
select ok(not has_function_privilege('anon', 'public.archive_event(uuid,bigint)', 'EXECUTE'), 'anonymous users cannot archive events');

insert into auth.users (id, email, raw_user_meta_data) values
  ('70000000-0000-0000-0000-000000000001', 'lifecycle-owner@example.test', '{"full_name":"Lifecycle Owner"}'),
  ('70000000-0000-0000-0000-000000000002', 'lifecycle-admin@example.test', '{"full_name":"Lifecycle Admin"}'),
  ('70000000-0000-0000-0000-000000000003', 'lifecycle-member@example.test', '{"full_name":"Lifecycle Member"}'),
  ('70000000-0000-0000-0000-000000000004', 'lifecycle-outsider@example.test', '{"full_name":"Lifecycle Outsider"}');

set local request.jwt.claim.sub = '70000000-0000-0000-0000-000000000001';
set local role authenticated;
create temporary table lifecycle_event as select public.create_event('Lifecycle') as result;
create temporary table lifecycle_invitation as
select public.get_event_invitation((select (result ->> 'event_id')::uuid from lifecycle_event)) as result;
select is(
  (select revision from public.events where id = (select (result ->> 'event_id')::uuid from lifecycle_event)),
  1::bigint,
  'new events start at revision one'
);
reset role;

set local request.jwt.claim.sub = '70000000-0000-0000-0000-000000000002';
set local role authenticated;
select public.join_event((select (result ->> 'invitation_id')::uuid from lifecycle_event), (select result ->> 'token' from lifecycle_invitation));
reset role;
set local request.jwt.claim.sub = '70000000-0000-0000-0000-000000000003';
set local role authenticated;
select public.join_event((select (result ->> 'invitation_id')::uuid from lifecycle_event), (select result ->> 'token' from lifecycle_invitation));
select throws_ok(
  $$ select public.join_event((select (result ->> 'invitation_id')::uuid from lifecycle_event), (select result ->> 'token' from lifecycle_invitation)) $$,
  '22023', 'Already an active member.', 'join rejects an already active membership'
);
reset role;
set local request.jwt.claim.sub = '70000000-0000-0000-0000-000000000001';
set local role authenticated;
select throws_ok(
  $$ select public.join_event((select (result ->> 'invitation_id')::uuid from lifecycle_event), (select result ->> 'token' from lifecycle_invitation)) $$,
  '22023', 'The owner membership cannot be changed.', 'join can never downgrade the permanent owner'
);
reset role;
select throws_ok(
  $$ update public.event_members set role = 'member' where event_id = (select (result ->> 'event_id')::uuid from lifecycle_event) and profile_id = '70000000-0000-0000-0000-000000000001' $$,
  '22023', 'The owner membership cannot be changed.', 'privileged writes cannot downgrade the permanent owner'
);
select throws_ok(
  $$ delete from public.event_members where event_id = (select (result ->> 'event_id')::uuid from lifecycle_event) and profile_id = '70000000-0000-0000-0000-000000000001' $$,
  '22023', 'The owner membership cannot be changed.', 'privileged writes cannot delete the permanent owner membership'
);
select throws_ok(
  $$ update public.event_members set role = 'owner' where event_id = (select (result ->> 'event_id')::uuid from lifecycle_event) and profile_id = '70000000-0000-0000-0000-000000000002' $$,
  '22023', 'The owner membership cannot be changed.', 'privileged writes cannot appoint a second owner'
);
select throws_ok(
  $$ update public.events set owner_id = '70000000-0000-0000-0000-000000000002' where id = (select (result ->> 'event_id')::uuid from lifecycle_event) $$,
  '22023', 'The event owner cannot be changed.', 'privileged writes cannot replace the permanent event owner'
);
select throws_ok(
  $$ delete from public.events where id = (select (result ->> 'event_id')::uuid from lifecycle_event) $$,
  '22023', 'Events cannot be deleted.', 'privileged writes cannot physically delete an event'
);
set local request.jwt.claim.sub = '70000000-0000-0000-0000-000000000001';
set local role authenticated;
select public.set_coadmin((select (result ->> 'event_id')::uuid from lifecycle_event), '70000000-0000-0000-0000-000000000002', true);
select is(
  (select revision from public.events where id = (select (result ->> 'event_id')::uuid from lifecycle_event)),
  2::bigint,
  'several active mutations increment the event revision exactly once in one transaction'
);

select set_config('transcefrencias.revised_events', '', true);
select public.rename_event((select (result ->> 'event_id')::uuid from lifecycle_event), 'Lifecycle renamed');
select public.create_manual_participant((select (result ->> 'event_id')::uuid from lifecycle_event), 'Manual');
select is(
  (select revision from public.events where id = (select (result ->> 'event_id')::uuid from lifecycle_event)),
  3::bigint,
  'event revision advances only once despite multiple writes in the same transaction'
);

create temporary table lifecycle_expense as
select public.create_expense(
  (select (result ->> 'event_id')::uuid from lifecycle_event),
  'Cena', 'food', 500,
  array[(select id from public.participants where event_id = (select (result ->> 'event_id')::uuid from lifecycle_event) and profile_id = '70000000-0000-0000-0000-000000000001')],
  array[500::bigint],
  array[(select id from public.participants where event_id = (select (result ->> 'event_id')::uuid from lifecycle_event) and profile_id = '70000000-0000-0000-0000-000000000001')]
) as id;
select throws_ok(
  $$ select public.update_expense((select id from lifecycle_expense), null::bigint, 'Cena', 'food', 500, array[(select participant_id from public.expense_payers where expense_id = (select id from lifecycle_expense))], array[500::bigint], array[(select participant_id from public.expense_participants where expense_id = (select id from lifecycle_expense))]) $$,
  '22023', 'Expected revision must be a positive integer.', 'expense update rejects a null expected revision'
);
select throws_ok(
  $$ select public.delete_expense((select id from lifecycle_expense), 0) $$,
  '22023', 'Expected revision must be a positive integer.', 'expense deletion rejects a zero expected revision'
);
select throws_ok(
  $$ select public.transition_event_to_paying((select (result ->> 'event_id')::uuid from lifecycle_event), null::bigint) $$,
  '22023', 'Expected revision must be a positive integer.', 'paying transition rejects a null expected revision'
);
select throws_ok(
  $$ select public.transition_event_to_paying((select (result ->> 'event_id')::uuid from lifecycle_event), 0) $$,
  '22023', 'Expected revision must be a positive integer.', 'paying transition rejects a zero expected revision'
);
select throws_ok(
  $$ select public.transition_event_to_paying((select (result ->> 'event_id')::uuid from lifecycle_event), 1) $$,
  '40001', 'The event changed. Reload before continuing.', 'paying transition rejects a stale expected revision'
);

select set_config('transcefrencias.revised_events', '', true);
select is(
  public.transition_event_to_paying(
    (select (result ->> 'event_id')::uuid from lifecycle_event),
    (select revision from public.events where id = (select (result ->> 'event_id')::uuid from lifecycle_event))
  ) ->> 'status',
  'paying',
  'owner transitions a non-empty event to paying with its revision'
);
select throws_ok(
  $$ select public.reopen_event_expenses((select (result ->> 'event_id')::uuid from lifecycle_event), null::bigint) $$,
  '22023', 'Expected revision must be a positive integer.', 'reopening rejects a null expected revision'
);
select throws_ok(
  $$ select public.reopen_event_expenses((select (result ->> 'event_id')::uuid from lifecycle_event), 0) $$,
  '22023', 'Expected revision must be a positive integer.', 'reopening rejects a zero expected revision'
);
select throws_ok(
  $$ select public.reopen_event_expenses((select (result ->> 'event_id')::uuid from lifecycle_event), 1) $$,
  '40001', 'The event changed. Reload before continuing.', 'stale event revisions are rejected'
);

select set_config('transcefrencias.revised_events', '', true);
select public.reopen_event_expenses((select (result ->> 'event_id')::uuid from lifecycle_event), (select revision from public.events where id = (select (result ->> 'event_id')::uuid from lifecycle_event)));

reset role;
set local request.jwt.claim.sub = '70000000-0000-0000-0000-000000000003';
set local role authenticated;
select throws_ok(
  $$ select public.archive_event((select (result ->> 'event_id')::uuid from lifecycle_event), (select revision from public.events where id = (select (result ->> 'event_id')::uuid from lifecycle_event))) $$,
  '42501', 'Administrator permission required.', 'regular members cannot archive events'
);
reset role;

set local request.jwt.claim.sub = '70000000-0000-0000-0000-000000000002';
set local role authenticated;
create temporary table move_target_event as select public.create_event('Move target') as result;
select throws_ok(
  $$ select public.archive_event((select (result ->> 'event_id')::uuid from lifecycle_event), null::bigint) $$,
  '22023', 'Expected revision must be a positive integer.', 'archive rejects a null expected revision'
);
select throws_ok(
  $$ select public.archive_event((select (result ->> 'event_id')::uuid from lifecycle_event), 0) $$,
  '22023', 'Expected revision must be a positive integer.', 'archive rejects a zero expected revision'
);
select throws_ok(
  $$ select public.archive_event((select (result ->> 'event_id')::uuid from lifecycle_event), 1) $$,
  '40001', 'The event changed. Reload before continuing.', 'archive rejects a stale expected revision'
);
select set_config('transcefrencias.revised_events', '', true);
create temporary table archive_revision as
select revision from public.events where id = (select (result ->> 'event_id')::uuid from lifecycle_event);
select is(
  public.archive_event((select (result ->> 'event_id')::uuid from lifecycle_event), (select revision from public.events where id = (select (result ->> 'event_id')::uuid from lifecycle_event))) ->> 'status',
  'archived',
  'coadmins can archive an event'
);
select is(
  (select revision from public.events where id = (select (result ->> 'event_id')::uuid from lifecycle_event)),
  (select revision + 1 from archive_revision),
  'archiving increments the event revision exactly once'
);
select ok(
  (select archived_at is not null and archived_from_status = 'loading_expenses' from public.events where id = (select (result ->> 'event_id')::uuid from lifecycle_event)),
  'archive metadata coherently preserves the prior status'
);
select is(
  public.get_invitation_preview((select (result ->> 'invitation_id')::uuid from lifecycle_event), (select result ->> 'token' from lifecycle_invitation)) ->> 'status',
  'archived',
  'invitation preview exposes archived status without changing the stable invitation'
);
select throws_ok(
  $$ select public.rename_event((select (result ->> 'event_id')::uuid from lifecycle_event), 'Forbidden') $$,
  '22023', 'Archived events are read-only.', 'archived events reject ordinary mutating RPCs'
);
select throws_ok(
  $$ select public.create_expense((select (result ->> 'event_id')::uuid from lifecycle_event), 'Forbidden', 'food', 500, array[(select participant_id from public.expense_payers where expense_id = (select id from lifecycle_expense))], array[500::bigint], array[(select participant_id from public.expense_participants where expense_id = (select id from lifecycle_expense))]) $$,
  '22023', 'Archived events are read-only.', 'archived events reject expense creation'
);
select throws_ok(
  $$ select public.update_expense((select id from lifecycle_expense), 1, 'Forbidden', 'food', 500, array[(select participant_id from public.expense_payers where expense_id = (select id from lifecycle_expense))], array[500::bigint], array[(select participant_id from public.expense_participants where expense_id = (select id from lifecycle_expense))]) $$,
  '22023', 'Archived events are read-only.', 'archived events reject expense updates'
);
select throws_ok(
  $$ select public.delete_expense((select id from lifecycle_expense), 1) $$,
  '22023', 'Archived events are read-only.', 'archived events reject expense deletion'
);
select throws_ok(
  $$ select public.leave_event((select (result ->> 'event_id')::uuid from lifecycle_event)) $$,
  '22023', 'Archived events are read-only.', 'archived events reject leaving'
);
select throws_ok(
  $$ select public.set_coadmin((select (result ->> 'event_id')::uuid from lifecycle_event), '70000000-0000-0000-0000-000000000003', true) $$,
  '42501', 'Owner permission required.', 'archived events reject unauthorized role changes before exposing state'
);
select throws_ok(
  $$ select public.create_manual_participant((select (result ->> 'event_id')::uuid from lifecycle_event), 'Forbidden') $$,
  '22023', 'Archived events are read-only.', 'archived events reject manual people'
);
select throws_ok(
  $$ select public.deactivate_participant((select id from public.participants where event_id = (select (result ->> 'event_id')::uuid from lifecycle_event) and display_name = 'Manual')) $$,
  '22023', 'Archived events are read-only.', 'archived events reject person deactivation'
);
select throws_ok(
  $$ select public.link_manual_participant((select id from public.participants where event_id = (select (result ->> 'event_id')::uuid from lifecycle_event) and display_name = 'Manual'), '70000000-0000-0000-0000-000000000003') $$,
  '22023', 'Archived events are read-only.', 'archived events reject person linking'
);
select throws_ok(
  $$ select public.expel_event_member((select (result ->> 'event_id')::uuid from lifecycle_event), '70000000-0000-0000-0000-000000000003') $$,
  '22023', 'Archived events are read-only.', 'archived events reject expulsion'
);
select throws_ok(
  $$ select public.allow_event_rejoin((select (result ->> 'event_id')::uuid from lifecycle_event), '70000000-0000-0000-0000-000000000003') $$,
  '42501', 'Owner permission required.', 'archived events reject unauthorized rejoin changes before exposing state'
);
select throws_ok(
  $$ select public.transition_event_to_paying((select (result ->> 'event_id')::uuid from lifecycle_event), (select revision from public.events where id = (select (result ->> 'event_id')::uuid from lifecycle_event))) $$,
  '22023', 'Archived events are read-only.', 'archived events reject the paying transition'
);
select throws_ok(
  $$ select public.reopen_event_expenses((select (result ->> 'event_id')::uuid from lifecycle_event), (select revision from public.events where id = (select (result ->> 'event_id')::uuid from lifecycle_event))) $$,
  '22023', 'Archived events are read-only.', 'archived events reject reopening'
);
reset role;
select throws_ok(
  $$ update public.participants set display_name = 'Forbidden' where event_id = (select (result ->> 'event_id')::uuid from lifecycle_event) and display_name = 'Manual' $$,
  '22023', 'Archived events are read-only.', 'archived events reject privileged participant updates'
);
select throws_ok(
  $$ update public.event_members set role = 'member' where event_id = (select (result ->> 'event_id')::uuid from lifecycle_event) and profile_id = '70000000-0000-0000-0000-000000000002' $$,
  '22023', 'Archived events are read-only.', 'archived events reject privileged membership updates'
);
select throws_ok(
  $$ update public.participants set event_id = (select (result ->> 'event_id')::uuid from move_target_event) where event_id = (select (result ->> 'event_id')::uuid from lifecycle_event) and display_name = 'Manual' $$,
  '22023', 'Rows cannot move between events.', 'archived participant rows cannot move to an active event'
);
select throws_ok(
  $$ update public.expenses set event_id = (select (result ->> 'event_id')::uuid from move_target_event) where id = (select id from lifecycle_expense) $$,
  '22023', 'Rows cannot move between events.', 'archived expense rows cannot move to an active event'
);
select throws_ok(
  $$ update public.event_members set event_id = (select (result ->> 'event_id')::uuid from move_target_event) where event_id = (select (result ->> 'event_id')::uuid from lifecycle_event) and profile_id = '70000000-0000-0000-0000-000000000003' $$,
  '22023', 'Rows cannot move between events.', 'archived membership rows cannot move to an active event'
);
set local request.jwt.claim.sub = '70000000-0000-0000-0000-000000000002';
set local role authenticated;
select ok(
  (select details ? 'before' and details ? 'after' and details -> 'before' ->> 'status' = 'loading_expenses' and details -> 'after' ->> 'status' = 'archived' from public.audit_log where event_id = (select (result ->> 'event_id')::uuid from lifecycle_event) and action = 'event_archived' order by created_at desc limit 1),
  'archive audit preserves before and after snapshots'
);

reset role;
set local request.jwt.claim.sub = '70000000-0000-0000-0000-000000000004';
set local role authenticated;
select throws_ok(
  $$ select public.join_event((select (result ->> 'invitation_id')::uuid from lifecycle_event), (select result ->> 'token' from lifecycle_invitation)) $$,
  '22023', 'Archived events are read-only.', 'a stable invitation cannot join an archived event'
);
reset role;

set local request.jwt.claim.sub = '70000000-0000-0000-0000-000000000003';
set local role authenticated;
select is(
  (select id from public.events where id = (select (result ->> 'event_id')::uuid from lifecycle_event)),
  (select (result ->> 'event_id')::uuid from lifecycle_event),
  'active members retain read access to archived events'
);
select throws_ok(
  $$ select public.restore_event((select (result ->> 'event_id')::uuid from lifecycle_event), (select revision from public.events where id = (select (result ->> 'event_id')::uuid from lifecycle_event))) $$,
  '42501', 'Administrator permission required.', 'regular members cannot restore events'
);
reset role;

set local request.jwt.claim.sub = '70000000-0000-0000-0000-000000000002';
set local role authenticated;
select throws_ok(
  $$ select public.restore_event((select (result ->> 'event_id')::uuid from lifecycle_event), null::bigint) $$,
  '22023', 'Expected revision must be a positive integer.', 'restore rejects a null expected revision'
);
select throws_ok(
  $$ select public.restore_event((select (result ->> 'event_id')::uuid from lifecycle_event), 0) $$,
  '22023', 'Expected revision must be a positive integer.', 'restore rejects a zero expected revision'
);
select throws_ok(
  $$ select public.restore_event((select (result ->> 'event_id')::uuid from lifecycle_event), 1) $$,
  '40001', 'The event changed. Reload before continuing.', 'restore rejects a stale expected revision'
);
select set_config('transcefrencias.revised_events', '', true);
create temporary table restore_revision as
select revision from public.events where id = (select (result ->> 'event_id')::uuid from lifecycle_event);
select is(
  public.restore_event((select (result ->> 'event_id')::uuid from lifecycle_event), (select revision from public.events where id = (select (result ->> 'event_id')::uuid from lifecycle_event))) ->> 'status',
  'loading_expenses',
  'coadmins restore an event to its immediately previous status'
);
select is(
  (select revision from public.events where id = (select (result ->> 'event_id')::uuid from lifecycle_event)),
  (select revision + 1 from restore_revision),
  'restoring increments the event revision exactly once'
);
select ok(
  (select archived_at is null and archived_from_status is null from public.events where id = (select (result ->> 'event_id')::uuid from lifecycle_event)),
  'restore clears archive metadata'
);
reset role;
set local request.jwt.claim.sub = '70000000-0000-0000-0000-000000000001';
set local role authenticated;
select set_config('transcefrencias.revised_events', '', true);
select is(
  public.archive_event((select (result ->> 'event_id')::uuid from lifecycle_event), (select revision from public.events where id = (select (result ->> 'event_id')::uuid from lifecycle_event))) ->> 'status',
  'archived',
  'owners can archive events'
);
select throws_ok(
  $$ select public.set_coadmin((select (result ->> 'event_id')::uuid from lifecycle_event), '70000000-0000-0000-0000-000000000003', true) $$,
  '22023', 'Archived events are read-only.', 'archived events reject authorized role changes'
);
select throws_ok(
  $$ select public.allow_event_rejoin((select (result ->> 'event_id')::uuid from lifecycle_event), '70000000-0000-0000-0000-000000000003') $$,
  '22023', 'Archived events are read-only.', 'archived events reject authorized rejoin changes'
);
select set_config('transcefrencias.revised_events', '', true);
select is(
  public.restore_event((select (result ->> 'event_id')::uuid from lifecycle_event), (select revision from public.events where id = (select (result ->> 'event_id')::uuid from lifecycle_event))) ->> 'status',
  'loading_expenses',
  'owners can restore events'
);
select is(
  public.get_event_invitation((select (result ->> 'event_id')::uuid from lifecycle_event)) ->> 'token',
  (select result ->> 'token' from lifecycle_invitation),
  'archive and restore preserve the stable invitation token'
);
select ok(
  (select details -> 'before' ->> 'status' = 'archived' and details -> 'after' ->> 'status' = 'loading_expenses' from public.audit_log where event_id = (select (result ->> 'event_id')::uuid from lifecycle_event) and action = 'event_restored' order by created_at desc limit 1),
  'restore audit preserves before and after snapshots'
);

select set_config('transcefrencias.revised_events', '', true);
select public.transition_event_to_paying((select (result ->> 'event_id')::uuid from lifecycle_event), (select revision from public.events where id = (select (result ->> 'event_id')::uuid from lifecycle_event)));
select set_config('transcefrencias.revised_events', '', true);
select public.archive_event((select (result ->> 'event_id')::uuid from lifecycle_event), (select revision from public.events where id = (select (result ->> 'event_id')::uuid from lifecycle_event)));
select set_config('transcefrencias.revised_events', '', true);
select is(
  public.restore_event((select (result ->> 'event_id')::uuid from lifecycle_event), (select revision from public.events where id = (select (result ->> 'event_id')::uuid from lifecycle_event))) ->> 'status',
  'paying',
  'restore returns archived paying events to paying'
);
select * from finish();
rollback;
