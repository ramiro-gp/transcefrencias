begin;

select no_plan();

select has_schema('private', 'private schema exists');
select has_table('public', 'profiles', 'profiles table exists');

select has_column('public', 'profiles', 'id', 'profiles.id exists');
select has_column('public', 'profiles', 'full_name', 'profiles.full_name exists');
select has_column('public', 'profiles', 'nickname', 'profiles.nickname exists');
select has_column('public', 'profiles', 'created_at', 'profiles.created_at exists');
select has_column('public', 'profiles', 'updated_at', 'profiles.updated_at exists');

select col_type_is('public', 'profiles', 'id', 'uuid', 'profiles.id is uuid');
select col_type_is('public', 'profiles', 'full_name', 'text', 'profiles.full_name is text');
select col_type_is('public', 'profiles', 'nickname', 'text', 'profiles.nickname is text');
select col_type_is(
  'public',
  'profiles',
  'created_at',
  'timestamp with time zone',
  'profiles.created_at is timestamptz'
);
select col_type_is(
  'public',
  'profiles',
  'updated_at',
  'timestamp with time zone',
  'profiles.updated_at is timestamptz'
);

select col_not_null('public', 'profiles', 'id', 'profiles.id is required');
select col_not_null('public', 'profiles', 'full_name', 'profiles.full_name is required');
select col_is_null('public', 'profiles', 'nickname', 'profiles.nickname is optional');
select col_not_null('public', 'profiles', 'created_at', 'profiles.created_at is required');
select col_not_null('public', 'profiles', 'updated_at', 'profiles.updated_at is required');

select has_pk('public', 'profiles', 'profiles has a primary key');
select has_fk('public', 'profiles', 'profiles references auth.users');
select ok(
  exists (
    select 1
    from pg_catalog.pg_constraint
    where conrelid = 'public.profiles'::regclass
      and conname = 'profiles_full_name_valid'
      and contype = 'c'
  ),
  'full_name constraint exists'
);
select ok(
  exists (
    select 1
    from pg_catalog.pg_constraint
    where conrelid = 'public.profiles'::regclass
      and conname = 'profiles_nickname_valid'
      and contype = 'c'
  ),
  'nickname constraint exists'
);

select ok(
  (select relrowsecurity from pg_catalog.pg_class where oid = 'public.profiles'::regclass),
  'RLS is enabled on profiles'
);
select ok(
  not (select relforcerowsecurity from pg_catalog.pg_class where oid = 'public.profiles'::regclass),
  'FORCE RLS is intentionally not enabled'
);

select policies_are(
  'public',
  'profiles',
  array['profiles_select_own_or_coparticipant', 'profiles_update_own'],
  'profiles exposes the own-or-coparticipant select and own-update policies'
);
select results_eq(
  $$
    select cmd
    from pg_catalog.pg_policies
    where schemaname = 'public' and tablename = 'profiles'
    order by cmd
  $$,
  $$ values ('SELECT'::text), ('UPDATE'::text) $$,
  'profiles policies cover SELECT and UPDATE only'
);

select ok(
  has_table_privilege('authenticated', 'public.profiles', 'SELECT'),
  'authenticated has SELECT on profiles'
);
select ok(
  not has_table_privilege('anon', 'public.profiles', 'SELECT'),
  'anon has no SELECT on profiles'
);
select ok(
  not has_table_privilege('authenticated', 'public.profiles', 'INSERT'),
  'authenticated has no INSERT on profiles'
);
select ok(
  not has_table_privilege('authenticated', 'public.profiles', 'DELETE'),
  'authenticated has no DELETE on profiles'
);
select ok(
  has_column_privilege('authenticated', 'public.profiles', 'full_name', 'UPDATE'),
  'authenticated can update full_name'
);
select ok(
  has_column_privilege('authenticated', 'public.profiles', 'nickname', 'UPDATE'),
  'authenticated can update nickname'
);
select ok(
  not has_column_privilege('authenticated', 'public.profiles', 'id', 'UPDATE'),
  'authenticated cannot update id'
);
select ok(
  not has_column_privilege('authenticated', 'public.profiles', 'created_at', 'UPDATE'),
  'authenticated cannot update created_at'
);
select ok(
  not has_column_privilege('authenticated', 'public.profiles', 'updated_at', 'UPDATE'),
  'authenticated cannot update updated_at'
);

select has_function(
  'private',
  'handle_new_user',
  array[]::text[],
  'profile creation trigger function exists'
);
select has_function(
  'private',
  'set_profile_updated_at',
  array[]::text[],
  'profile timestamp trigger function exists'
);
select ok(
  (
    select prosecdef
    from pg_catalog.pg_proc
    where oid = 'private.handle_new_user()'::regprocedure
  ),
  'profile creation function is security definer'
);
select ok(
  not (
    select prosecdef
    from pg_catalog.pg_proc
    where oid = 'private.set_profile_updated_at()'::regprocedure
  ),
  'timestamp function uses invoker security'
);
select ok(
  (
    select proconfig @> array['search_path=""']
    from pg_catalog.pg_proc
    where oid = 'private.handle_new_user()'::regprocedure
  ),
  'profile creation function has an empty search_path'
);
select ok(
  (
    select proconfig @> array['search_path=""']
    from pg_catalog.pg_proc
    where oid = 'private.set_profile_updated_at()'::regprocedure
  ),
  'timestamp function has an empty search_path'
);
select ok(
  not has_function_privilege('public', 'private.handle_new_user()', 'EXECUTE'),
  'public cannot execute profile creation function'
);
select ok(
  not has_function_privilege('anon', 'private.handle_new_user()', 'EXECUTE'),
  'anon cannot execute profile creation function'
);
select ok(
  not has_function_privilege('authenticated', 'private.handle_new_user()', 'EXECUTE'),
  'authenticated cannot execute profile creation function'
);
select ok(
  not has_function_privilege('public', 'private.set_profile_updated_at()', 'EXECUTE'),
  'public cannot execute timestamp function'
);

insert into auth.users (id, email, raw_user_meta_data)
values
  (
    '10000000-0000-0000-0000-000000000001',
    'profile-a@example.test',
    '{"full_name":"Profile A","nickname":"Alpha"}'::jsonb
  ),
  (
    '10000000-0000-0000-0000-000000000002',
    'profile-b@example.test',
    '{"full_name":"Profile B"}'::jsonb
  ),
  (
    '10000000-0000-0000-0000-000000000003',
    'profile-empty-nickname@example.test',
    '{"full_name":"Profile Empty","nickname":"   "}'::jsonb
  );

select is(
  (
    select count(*)
    from public.profiles
    where id in (
      '10000000-0000-0000-0000-000000000001',
      '10000000-0000-0000-0000-000000000002',
      '10000000-0000-0000-0000-000000000003'
    )
  ),
  3::bigint,
  'each valid auth user creates exactly one profile'
);
select is(
  (
    select nickname
    from public.profiles
    where id = '10000000-0000-0000-0000-000000000003'
  ),
  null,
  'an empty nickname is normalized to NULL'
);

select throws_ok(
  $$
    insert into auth.users (id, email, raw_user_meta_data)
    values (
      '10000000-0000-0000-0000-000000000004',
      'profile-invalid@example.test',
      '{"full_name":42}'::jsonb
    )
  $$,
  '22023',
  'Profile full_name must be a string.',
  'untrusted non-string full_name metadata is rejected'
);
select is(
  (
    select count(*)
    from auth.users
    where id = '10000000-0000-0000-0000-000000000004'
  ),
  0::bigint,
  'invalid metadata leaves no auth user'
);
select is(
  (
    select count(*)
    from public.profiles
    where id = '10000000-0000-0000-0000-000000000004'
  ),
  0::bigint,
  'invalid metadata leaves no profile'
);

select throws_ok(
  $$
    update public.profiles
    set full_name = ' Profile A '
    where id = '10000000-0000-0000-0000-000000000001'
  $$,
  '23514',
  'new row for relation "profiles" violates check constraint "profiles_full_name_valid"',
  'full_name rejects surrounding whitespace'
);
select throws_ok(
  $$
    update public.profiles
    set nickname = repeat('n', 51)
    where id = '10000000-0000-0000-0000-000000000001'
  $$,
  '23514',
  'new row for relation "profiles" violates check constraint "profiles_nickname_valid"',
  'nickname rejects values longer than 50 characters'
);
select throws_ok(
  $$
    update public.profiles
    set full_name = E'Profile\nA'
    where id = '10000000-0000-0000-0000-000000000001'
  $$,
  '23514',
  'new row for relation "profiles" violates check constraint "profiles_full_name_valid"',
  'full_name rejects control characters'
);

select pg_sleep(0.01);
update public.profiles
set full_name = 'Profile A Updated'
where id = '10000000-0000-0000-0000-000000000001';
select ok(
  (
    select updated_at > created_at
    from public.profiles
    where id = '10000000-0000-0000-0000-000000000001'
  ),
  'updated_at changes after a profile update'
);

set local role anon;
select throws_ok(
  $$ select * from public.profiles $$,
  '42501',
  'permission denied for table profiles',
  'anon cannot read profiles'
);
reset role;

set local request.jwt.claim.sub = '10000000-0000-0000-0000-000000000001';
set local role authenticated;
select results_eq(
  $$ select id from public.profiles order by id $$,
  $$ values ('10000000-0000-0000-0000-000000000001'::uuid) $$,
  'user A can only read profile A'
);
select results_eq(
  $$
    update public.profiles
    set nickname = 'A-updated'
    where id = '10000000-0000-0000-0000-000000000001'
    returning id
  $$,
  $$ values ('10000000-0000-0000-0000-000000000001'::uuid) $$,
  'user A can update profile A'
);
select is_empty(
  $$
    update public.profiles
    set nickname = 'Compromised'
    where id = '10000000-0000-0000-0000-000000000002'
    returning id
  $$,
  'user A cannot update profile B'
);
select throws_ok(
  $$
    insert into public.profiles (id, full_name)
    values ('10000000-0000-0000-0000-000000000001', 'Duplicate')
  $$,
  '42501',
  'permission denied for table profiles',
  'authenticated clients cannot insert profiles'
);
select throws_ok(
  $$
    delete from public.profiles
    where id = '10000000-0000-0000-0000-000000000001'
  $$,
  '42501',
  'permission denied for table profiles',
  'authenticated clients cannot delete profiles'
);
select throws_ok(
  $$
    update public.profiles
    set id = '10000000-0000-0000-0000-000000000002'
    where id = '10000000-0000-0000-0000-000000000001'
  $$,
  '42501',
  'permission denied for table profiles',
  'authenticated clients cannot update profile ids'
);
select throws_ok(
  $$
    update public.profiles
    set created_at = statement_timestamp()
    where id = '10000000-0000-0000-0000-000000000001'
  $$,
  '42501',
  'permission denied for table profiles',
  'authenticated clients cannot update timestamps'
);
reset role;

set local request.jwt.claim.sub = '10000000-0000-0000-0000-000000000002';
set local role authenticated;
select results_eq(
  $$ select id from public.profiles order by id $$,
  $$ values ('10000000-0000-0000-0000-000000000002'::uuid) $$,
  'user B can only read profile B'
);
select results_eq(
  $$ select nickname from public.profiles $$,
  $$ values (null::text) $$,
  'user B cannot observe user A nickname changes'
);
reset role;

select is(
  (
    select nickname
    from public.profiles
    where id = '10000000-0000-0000-0000-000000000002'
  ),
  null,
  'user A did not modify profile B'
);

select * from finish();
rollback;
