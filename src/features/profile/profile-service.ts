import type { supabase } from '../../lib/supabase/client'
import { normalizeProfileValues, type ProfileValues } from '../auth/auth-schemas'

type ProfileClient = Pick<typeof supabase, 'from'>

export interface Profile {
  readonly id: string
  readonly fullName: string
  readonly nickname: string | null
  readonly createdAt: string
  readonly updatedAt: string
}

export class ProfileInvariantError extends Error {
  constructor() {
    super('No encontramos el perfil asociado a esta cuenta.')
    this.name = 'ProfileInvariantError'
  }
}

export class ProfileRequestError extends Error {
  constructor() {
    super('No pudimos cargar o actualizar tu perfil. Intentá de nuevo.')
    this.name = 'ProfileRequestError'
  }
}

function toProfile(row: {
  id: string
  full_name: string
  nickname: string | null
  created_at: string
  updated_at: string
}): Profile {
  return {
    id: row.id,
    fullName: row.full_name,
    nickname: row.nickname,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  }
}

export async function getOwnProfile(
  client: ProfileClient,
  userId: string,
): Promise<Profile> {
  const { data, error } = await client
    .from('profiles')
    .select('id, full_name, nickname, created_at, updated_at')
    .eq('id', userId)
    .maybeSingle()

  if (error) {
    throw new ProfileRequestError()
  }

  if (!data) {
    throw new ProfileInvariantError()
  }

  return toProfile(data)
}

export async function updateOwnProfile(
  client: ProfileClient,
  userId: string,
  values: ProfileValues,
): Promise<Profile> {
  const profile = normalizeProfileValues(values)
  const { data, error } = await client
    .from('profiles')
    .update({ full_name: profile.fullName, nickname: profile.nickname })
    .eq('id', userId)
    .select('id, full_name, nickname, created_at, updated_at')
    .single()

  if (error || !data) {
    throw new ProfileRequestError()
  }

  return toProfile(data)
}
