import type { AuthError } from '@supabase/supabase-js'
import type { supabase } from '../../lib/supabase/client'
import {
  normalizeEmail,
  normalizeProfileValues,
  type LoginValues,
  type RegisterValues,
} from './auth-schemas'

type AuthClient = Pick<typeof supabase, 'auth'>

export class AuthorizationError extends Error {
  constructor(message: string) {
    super(message)
    this.name = 'AuthorizationError'
  }
}

function logUnexpectedAuthError(context: string, error: AuthError) {
  if (import.meta.env.DEV) {
    console.error(`Supabase Auth error during ${context}.`, {
      code: error.code,
      status: error.status,
    })
  }
}

function isRateLimited(error: AuthError): boolean {
  return error.status === 429 || error.code === 'over_request_rate_limit'
}

function isNetworkError(error: AuthError): boolean {
  return error.name === 'AuthRetryableFetchError' || error.code === 'unexpected_failure'
}

function toAuthorizationError(
  context: 'login' | 'registration' | 'recovery' | 'password',
  error: AuthError,
) {
  if (context === 'login') {
    if (isRateLimited(error)) {
      return new AuthorizationError(
        'Demasiados intentos. Esperá un momento antes de volver a probar.',
      )
    }

    if (isNetworkError(error)) {
      return new AuthorizationError(
        'No pudimos conectarnos. Revisá tu conexión e intentá de nuevo.',
      )
    }

    return new AuthorizationError('No pudimos iniciar sesión con esos datos.')
  }

  if (isRateLimited(error)) {
    return new AuthorizationError(
      'Demasiados intentos. Esperá un momento antes de volver a probar.',
    )
  }

  if (isNetworkError(error)) {
    return new AuthorizationError(
      'No pudimos conectarnos. Revisá tu conexión e intentá de nuevo.',
    )
  }

  logUnexpectedAuthError(context, error)

  return new AuthorizationError(
    context === 'registration'
      ? 'No pudimos crear tu cuenta. Intentá de nuevo.'
      : context === 'recovery'
        ? 'No pudimos solicitar el correo. Intentá de nuevo.'
        : 'No pudimos actualizar tu contraseña. Intentá de nuevo.',
  )
}

export async function signUpWithPassword(client: AuthClient, values: RegisterValues) {
  const profile = normalizeProfileValues(values)
  const { data, error } = await client.auth.signUp({
    email: normalizeEmail(values.email),
    password: values.password,
    options: {
      data: {
        full_name: profile.fullName,
        nickname: profile.nickname,
      },
    },
  })

  if (error) {
    throw toAuthorizationError('registration', error)
  }

  if (!data.session || !data.user) {
    throw new AuthorizationError('No pudimos iniciar tu sesión después del registro.')
  }

  return data
}

export async function signInWithPassword(client: AuthClient, values: LoginValues) {
  const { data, error } = await client.auth.signInWithPassword({
    email: normalizeEmail(values.email),
    password: values.password,
  })

  if (error) {
    throw toAuthorizationError('login', error)
  }

  return data
}

export async function requestPasswordReset(
  client: AuthClient,
  email: string,
  redirectTo: string,
) {
  const { error } = await client.auth.resetPasswordForEmail(normalizeEmail(email), {
    redirectTo,
  })

  if (error) {
    throw toAuthorizationError('recovery', error)
  }
}

export async function updatePassword(client: AuthClient, password: string) {
  const { error } = await client.auth.updateUser({ password })

  if (error) {
    throw toAuthorizationError('password', error)
  }
}
