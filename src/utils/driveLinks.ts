import { transformGoogleDriveUrlToEmbed } from './transformGoogleDriveUrlToEmbed'

export const MAX_DRIVE_LINKS = 5

export function normalizeDriveLinks(rawUrls: string[]): string[] {
    const trimmed = rawUrls
        .map((url) => url.trim())
        .filter((url) => url.length > 0)
    return Array.from(new Set(trimmed))
}

export function isValidDriveLink(url: string): boolean {
    return Boolean(transformGoogleDriveUrlToEmbed(url.trim()))
}
