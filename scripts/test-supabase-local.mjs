import assert from 'node:assert/strict'
import { execSync } from 'node:child_process'
import { randomUUID } from 'node:crypto'
import { createClient } from '@supabase/supabase-js'

function readLocalSupabaseEnvironment() {
  const output = execSync('pnpm supabase status -o env', {
    encoding: 'utf8',
  })
  const values = new Map()

  for (const line of output.split(/\r?\n/u)) {
    const match = /^([A-Z_]+)="(.*)"$/u.exec(line.trim())

    if (match) {
      values.set(match[1], match[2])
    }
  }

  const url = values.get('API_URL')
  const publicKey = values.get('PUBLISHABLE_KEY') ?? values.get('ANON_KEY')
  const secretKey = values.get('SECRET_KEY') ?? values.get('SERVICE_ROLE_KEY')

  if (!url || !publicKey || !secretKey) {
    throw new Error('Supabase local no informo las credenciales de prueba esperadas.')
  }

  return { url, publicKey, secretKey }
}

function createPublicClient(url, publicKey) {
  return createClient(url, publicKey, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
      detectSessionInUrl: false,
    },
  })
}

const { url, publicKey, secretKey } = readLocalSupabaseEnvironment()
const admin = createClient(url, secretKey, {
  auth: {
    persistSession: false,
    autoRefreshToken: false,
    detectSessionInUrl: false,
  },
})
const createdUserIds = []
const runId = randomUUID()
const password = 'Integration-test-2026!'

async function signUpProfile(label, metadata) {
  const client = createPublicClient(url, publicKey)
  const email = `${label}-${runId}@example.test`
  const { data, error } = await client.auth.signUp({
    email,
    password,
    options: { data: metadata },
  })

  assert.equal(error, null, `signUp failed for ${label}: ${error?.message}`)
  assert.ok(data.user, `signUp returned no user for ${label}`)
  assert.ok(data.session, `email confirmation is unexpectedly required for ${label}`)
  assert.equal(data.session.user.id, data.user.id)
  createdUserIds.push(data.user.id)

  return { client, email, user: data.user, session: data.session }
}

try {
  const anonymous = createPublicClient(url, publicKey)
  const anonymousRead = await anonymous.from('profiles').select('*')
  assert.ok(anonymousRead.error, 'anonymous profile reads must be denied')

  const profileA = await signUpProfile('profile-a', {
    full_name: 'Profile A',
    nickname: 'Alpha',
  })
  const profileB = await signUpProfile('profile-b', {
    full_name: 'Profile B',
  })
  const emptyNickname = await signUpProfile('empty-nickname', {
    full_name: 'Empty Nickname',
    nickname: '   ',
  })

  assert.equal(
    profileA.session.user.id,
    profileA.user.id,
    'JWT session belongs to user A',
  )

  const ownA = await profileA.client.from('profiles').select('*').single()
  assert.equal(ownA.error, null)
  assert.equal(ownA.data.id, profileA.user.id)
  assert.equal(ownA.data.full_name, 'Profile A')
  assert.equal(ownA.data.nickname, 'Alpha')

  const ownB = await profileB.client.from('profiles').select('*').single()
  assert.equal(ownB.error, null)
  assert.equal(ownB.data.id, profileB.user.id)

  const normalizedNickname = await emptyNickname.client
    .from('profiles')
    .select('nickname')
    .single()
  assert.equal(normalizedNickname.error, null)
  assert.equal(normalizedNickname.data.nickname, null)

  const readBAsA = await profileA.client
    .from('profiles')
    .select('id')
    .eq('id', profileB.user.id)
  assert.equal(readBAsA.error, null)
  assert.deepEqual(readBAsA.data, [])

  const updateBAsA = await profileA.client
    .from('profiles')
    .update({ nickname: 'Compromised' })
    .eq('id', profileB.user.id)
    .select('id')
  assert.equal(updateBAsA.error, null)
  assert.deepEqual(updateBAsA.data, [])

  const insertFromClient = await profileA.client.from('profiles').insert({
    id: profileA.user.id,
    full_name: 'Duplicate',
  })
  assert.ok(insertFromClient.error, 'authenticated clients must not insert profiles')

  const deleteFromClient = await profileA.client
    .from('profiles')
    .delete()
    .eq('id', profileA.user.id)
  assert.ok(deleteFromClient.error, 'authenticated clients must not delete profiles')

  const updateId = await profileA.client
    .from('profiles')
    .update({ id: profileB.user.id })
    .eq('id', profileA.user.id)
  assert.ok(updateId.error, 'authenticated clients must not update profile ids')

  const updateTimestamp = await profileA.client
    .from('profiles')
    .update({ created_at: new Date().toISOString() })
    .eq('id', profileA.user.id)
  assert.ok(updateTimestamp.error, 'authenticated clients must not update timestamps')

  await new Promise((resolve) => setTimeout(resolve, 20))
  const updatedA = await profileA.client
    .from('profiles')
    .update({ nickname: 'Alpha updated' })
    .eq('id', profileA.user.id)
    .select('created_at, updated_at, nickname')
    .single()
  assert.equal(updatedA.error, null)
  assert.equal(updatedA.data.nickname, 'Alpha updated')
  assert.ok(new Date(updatedA.data.updated_at) > new Date(updatedA.data.created_at))

  const verifyB = await profileB.client.from('profiles').select('nickname').single()
  assert.equal(verifyB.error, null)
  assert.equal(verifyB.data.nickname, null)

  const invalidEmail = `invalid-metadata-${runId}@example.test`
  const invalidClient = createPublicClient(url, publicKey)
  const invalidSignup = await invalidClient.auth.signUp({
    email: invalidEmail,
    password,
    options: { data: { full_name: 42 } },
  })
  assert.ok(invalidSignup.error, 'invalid metadata must fail signUp')
  assert.equal(invalidSignup.data.user, null)
  assert.equal(invalidSignup.data.session, null)

  const users = await admin.auth.admin.listUsers({ page: 1, perPage: 1000 })
  assert.equal(users.error, null)
  assert.equal(
    users.data.users.some((user) => user.email === invalidEmail),
    false,
    'invalid metadata must leave no auth user',
  )

  const refreshed = await profileA.client.auth.refreshSession()
  assert.equal(refreshed.error, null)
  assert.equal(refreshed.data.user?.id, profileA.user.id)

  console.log('Supabase local integration: PASS')
} finally {
  for (const userId of createdUserIds) {
    const { error } = await admin.auth.admin.deleteUser(userId)

    if (error) {
      console.error(`Could not remove local integration user ${userId}: ${error.message}`)
    }
  }
}
