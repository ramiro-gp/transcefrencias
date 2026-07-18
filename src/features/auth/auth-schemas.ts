import { z } from 'zod'

const CONTROL_CHARACTERS = /[\p{Cc}]/u

const emailSchema = z
  .string()
  .trim()
  .min(1, 'Ingresá tu email.')
  .email('Ingresá un email válido.')

export const passwordSchema = z
  .string()
  .min(8, 'La contraseña debe tener al menos 8 caracteres.')

export const fullNameSchema = z
  .string()
  .trim()
  .min(1, 'Ingresá tu nombre.')
  .max(100, 'El nombre admite hasta 100 caracteres.')
  .refine((value) => !CONTROL_CHARACTERS.test(value), {
    message: 'El nombre no puede incluir caracteres de control.',
  })

export const nicknameSchema = z
  .string()
  .trim()
  .max(50, 'El apodo admite hasta 50 caracteres.')
  .refine((value) => !CONTROL_CHARACTERS.test(value), {
    message: 'El apodo no puede incluir caracteres de control.',
  })

export const loginSchema = z.object({
  email: emailSchema,
  password: z.string().min(1, 'Ingresá tu contraseña.'),
})

export const registerSchema = z
  .object({
    email: emailSchema,
    password: passwordSchema,
    passwordConfirmation: z.string().min(1, 'Repetí tu contraseña.'),
    fullName: fullNameSchema,
    nickname: nicknameSchema,
  })
  .refine((value) => value.password === value.passwordConfirmation, {
    message: 'Las contraseñas no coinciden.',
    path: ['passwordConfirmation'],
  })

export const passwordResetRequestSchema = z.object({
  email: emailSchema,
})

export const newPasswordSchema = z
  .object({
    password: passwordSchema,
    passwordConfirmation: z.string().min(1, 'Repetí tu contraseña.'),
  })
  .refine((value) => value.password === value.passwordConfirmation, {
    message: 'Las contraseñas no coinciden.',
    path: ['passwordConfirmation'],
  })

export const profileSchema = z.object({
  fullName: fullNameSchema,
  nickname: nicknameSchema,
})

export type LoginValues = z.infer<typeof loginSchema>
export type RegisterValues = z.infer<typeof registerSchema>
export type PasswordResetRequestValues = z.infer<typeof passwordResetRequestSchema>
export type NewPasswordValues = z.infer<typeof newPasswordSchema>
export type ProfileValues = z.infer<typeof profileSchema>

export function normalizeEmail(email: string): string {
  return email.trim().toLowerCase()
}

export function normalizeProfileValues(
  values: Pick<ProfileValues, 'fullName' | 'nickname'>,
) {
  const nickname = values.nickname.trim()

  return {
    fullName: values.fullName.trim(),
    nickname: nickname === '' ? null : nickname,
  }
}
