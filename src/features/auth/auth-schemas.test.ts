import { describe, expect, it } from 'vitest'
import {
  newPasswordSchema,
  normalizeEmail,
  normalizeProfileValues,
  profileSchema,
  registerSchema,
} from './auth-schemas'

describe('auth schemas', () => {
  it('normalizes email and an empty nickname without restricting real names', () => {
    expect(normalizeEmail('  ANA@EXAMPLE.TEST ')).toBe('ana@example.test')
    expect(
      normalizeProfileValues({ fullName: '  Ana María  ', nickname: '   ' }),
    ).toEqual({
      fullName: 'Ana María',
      nickname: null,
    })
  })

  it('accepts names at the approved limits', () => {
    expect(
      profileSchema.safeParse({ fullName: 'n'.repeat(100), nickname: 'a'.repeat(50) })
        .success,
    ).toBe(true)
  })

  it('rejects empty or unsafe names and an oversized nickname', () => {
    expect(profileSchema.safeParse({ fullName: '  ', nickname: '' }).success).toBe(false)
    expect(
      profileSchema.safeParse({ fullName: 'Ana\nMaría', nickname: '' }).success,
    ).toBe(false)
    expect(
      profileSchema.safeParse({ fullName: 'Ana', nickname: 'a'.repeat(51) }).success,
    ).toBe(false)
  })

  it('requires matching passwords with at least eight characters', () => {
    expect(
      registerSchema.safeParse({
        email: 'ana@example.test',
        password: 'short',
        passwordConfirmation: 'short',
        fullName: 'Ana',
        nickname: '',
      }).success,
    ).toBe(false)
    expect(
      newPasswordSchema.safeParse({
        password: 'password1',
        passwordConfirmation: 'password2',
      }).success,
    ).toBe(false)
  })
})
