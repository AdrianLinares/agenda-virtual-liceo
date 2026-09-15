import { describe, expect, it } from 'vitest'

import { isValidDriveLink, MAX_DRIVE_LINKS, normalizeDriveLinks } from '@/utils/driveLinks'

describe('driveLinks', () => {
  it('normaliza, recorta y deduplica enlaces', () => {
    expect(
      normalizeDriveLinks([
        '  https://drive.google.com/file/d/abc123/view  ',
        'https://drive.google.com/file/d/abc123/view',
        'https://drive.google.com/file/d/def456/view',
      ]),
    ).toEqual([
      'https://drive.google.com/file/d/abc123/view',
      'https://drive.google.com/file/d/def456/view',
    ])
  })

  it('filtra enlaces vacíos', () => {
    expect(normalizeDriveLinks(['', '   ', 'https://drive.google.com/file/d/abc123/view'])).toEqual([
      'https://drive.google.com/file/d/abc123/view',
    ])
    expect(normalizeDriveLinks([])).toEqual([])
  })

  it('rechaza enlaces que no son públicos de Google Drive', () => {
    expect(isValidDriveLink('https://example.com/file/d/abc123XYZ/view')).toBe(false)
    expect(isValidDriveLink('esto no es una url')).toBe(false)
    expect(isValidDriveLink('')).toBe(false)
  })

  it('acepta enlaces válidos de Google Drive', () => {
    expect(isValidDriveLink('https://drive.google.com/file/d/abc123XYZ/view?usp=sharing')).toBe(true)
    expect(isValidDriveLink('https://docs.google.com/document/d/abc123XYZ/edit')).toBe(true)
  })

  it('define el máximo de enlaces permitidos', () => {
    expect(MAX_DRIVE_LINKS).toBe(5)
  })
})
