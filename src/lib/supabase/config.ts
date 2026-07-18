export interface SupabasePublicConfig {
  readonly url: string
  readonly anonKey: string
}

const PLACEHOLDER_VALUES = new Set([
  'your-local-publishable-or-anon-key',
  'your-supabase-anon-key',
])

export function validateSupabaseConfig(
  env: Pick<ImportMetaEnv, 'VITE_SUPABASE_URL' | 'VITE_SUPABASE_ANON_KEY'>,
): SupabasePublicConfig {
  const rawUrl = env.VITE_SUPABASE_URL.trim()
  const anonKey = env.VITE_SUPABASE_ANON_KEY.trim()

  let url: URL

  try {
    url = new URL(rawUrl)
  } catch {
    throw new Error('La URL publica de Supabase no esta configurada correctamente.')
  }

  if (
    !['http:', 'https:'].includes(url.protocol) ||
    url.username !== '' ||
    url.password !== '' ||
    url.pathname !== '/'
  ) {
    throw new Error('La URL publica de Supabase no esta configurada correctamente.')
  }

  if (anonKey === '' || PLACEHOLDER_VALUES.has(anonKey)) {
    throw new Error('La clave publica de Supabase no esta configurada.')
  }

  return {
    url: url.origin,
    anonKey,
  }
}
