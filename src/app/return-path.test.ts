import { describe, expect, it } from 'vitest'
import { sanitizeReturnPath } from './return-path'

describe('sanitizeReturnPath', () => {
  it('keeps an internal future invitation destination', () => {
    expect(sanitizeReturnPath('/invitaciones/opaque-token?source=link')).toBe(
      '/invitaciones/opaque-token?source=link',
    )
  })

  it.each([
    undefined,
    '',
    'https://example.test',
    '//example.test',
    'javascript:alert(1)',
    '/login',
    '/registro',
    '/nueva-contrasena',
  ])('rejects unsafe or circular return paths: %s', (value) => {
    expect(sanitizeReturnPath(value)).toBeNull()
  })
})
