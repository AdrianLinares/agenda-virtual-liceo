const GOOGLE_DRIVE_HOSTS = new Set(['drive.google.com', 'docs.google.com'])
const DRIVE_FILE_ID_REGEX = /\/d\/([a-zA-Z0-9_-]+)/

const getFileIdFromPath = (path: string): string | null => {
  const match = path.match(DRIVE_FILE_ID_REGEX)
  return match?.[1] ?? null
}

const getFileIdFromQuery = (url: URL): string | null => {
  const id = url.searchParams.get('id')
  return id && /^[a-zA-Z0-9_-]+$/.test(id) ? id : null
}

export function transformGoogleDriveUrlToEmbed(rawUrl: string): string | null {
  if (!rawUrl.trim()) {
    return null
  }

  try {
    const parsedUrl = new URL(rawUrl)

    if (!GOOGLE_DRIVE_HOSTS.has(parsedUrl.hostname)) {
      return null
    }

    const fileId = getFileIdFromPath(parsedUrl.pathname) ?? getFileIdFromQuery(parsedUrl)

    if (!fileId) {
      return null
    }

    return `https://drive.google.com/file/d/${fileId}/preview`
  } catch {
    return null
  }
}
