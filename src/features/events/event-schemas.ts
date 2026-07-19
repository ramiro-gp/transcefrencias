import { z } from 'zod'

function hasControlCharacter(value: string) {
  return Array.from(value).some((character) => {
    const code = character.codePointAt(0) ?? 0
    return code < 32 || (code >= 127 && code <= 159)
  })
}

export const eventNameSchema = z
  .string()
  .trim()
  .min(1, 'Ingresá un nombre.')
  .max(100, 'Máximo 100 caracteres.')
  .refine((value) => !hasControlCharacter(value), 'No uses caracteres de control.')
export const participantNameSchema = eventNameSchema
