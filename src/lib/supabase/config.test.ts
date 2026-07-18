import { describe, expect, it } from 'vitest'
import { validateSupabaseConfig } from './config'

describe('validateSupabaseConfig', () => {
  it('accepts local public Supabase configuration', () => {
    expect(
      validateSupabaseConfig({
        VITE_SUPABASE_URL: ' http://127.0.0.1:54321 ',
        VITE_SUPABASE_ANON_KEY: ' public-test-key ',
      }),
    ).toEqual({
      url: 'http://127.0.0.1:54321',
      anonKey: 'public-test-key',
    })
  })

  it.each([
    '',
    'not-a-url',
    'file:///tmp/supabase',
    'https://user:password@example.com',
    'https://example.com/rest/v1',
  ])('rejects an unsafe or malformed URL without echoing it: %s', (value) => {
    expect(() =>
      validateSupabaseConfig({
        VITE_SUPABASE_URL: value,
        VITE_SUPABASE_ANON_KEY: 'public-test-key',
      }),
    ).toThrow('La URL publica de Supabase no esta configurada correctamente.')
  })

  it.each(['', 'your-local-publishable-or-anon-key', 'your-supabase-anon-key'])(
    'rejects a missing or fictitious public key without exposing it: %s',
    (value) => {
      expect(() =>
        validateSupabaseConfig({
          VITE_SUPABASE_URL: 'http://127.0.0.1:54321',
          VITE_SUPABASE_ANON_KEY: value,
        }),
      ).toThrow('La clave publica de Supabase no esta configurada.')
    },
  )

  it('rejects missing runtime variables with an actionable message', () => {
    expect(() =>
      validateSupabaseConfig({
        VITE_SUPABASE_URL: undefined,
        VITE_SUPABASE_ANON_KEY: undefined,
      } as unknown as ImportMetaEnv),
    ).toThrow('La URL publica de Supabase no esta configurada correctamente.')
  })
})
