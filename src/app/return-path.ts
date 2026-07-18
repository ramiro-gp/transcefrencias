const AUTH_PATHS = new Set([
  '/login',
  '/registro',
  '/olvide-mi-contrasena',
  '/nueva-contrasena',
])

export function sanitizeReturnPath(value: string | null | undefined): string | null {
  if (!value || !value.startsWith('/') || value.startsWith('//')) {
    return null
  }

  try {
    const url = new URL(value, 'https://transcefrencias.local')

    if (url.origin !== 'https://transcefrencias.local' || AUTH_PATHS.has(url.pathname)) {
      return null
    }

    return `${url.pathname}${url.search}${url.hash}`
  } catch {
    return null
  }
}

export function locationToReturnPath(location: {
  readonly pathname: string
  readonly search: string
  readonly hash: string
}): string {
  return `${location.pathname}${location.search}${location.hash}`
}
