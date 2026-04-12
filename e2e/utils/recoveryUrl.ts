function toBasePathname(baseUrl: string): string {
  const normalizedBase = new URL(baseUrl)
  return normalizedBase.pathname === '/' ? '' : normalizedBase.pathname.replace(/\/$/, '')
}

export function normalizeRecoveryUrl(actionLink: string, baseUrl: string): string {
  const source = new URL(actionLink)
  const base = new URL(baseUrl)
  const basePath = toBasePathname(baseUrl)

  const redirectTo = source.searchParams.get('redirect_to')

  let targetPath = '/restablecer-contrasena'
  if (redirectTo) {
    try {
      const redirectUrl = new URL(redirectTo)
      targetPath = redirectUrl.pathname || targetPath
    } catch {
      // keep fallback path
    }
  } else if (source.pathname.includes('/restablecer-contrasena')) {
    targetPath = source.pathname
  }

  base.pathname = `${basePath}${targetPath}`.replace(/\/\/+/, '/')
  base.search = ''
  base.hash = ''

  const candidateParams = new URLSearchParams()
  const passthroughKeys = ['code', 'type', 'token']
  for (const key of passthroughKeys) {
    const value = source.searchParams.get(key)
    if (value) {
      candidateParams.set(key, value)
    }
  }

  base.search = candidateParams.toString() ? `?${candidateParams.toString()}` : ''
  return base.toString()
}
