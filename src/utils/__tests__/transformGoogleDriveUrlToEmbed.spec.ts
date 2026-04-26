import { describe, expect, it } from 'vitest'

import { transformGoogleDriveUrlToEmbed } from '@/utils/transformGoogleDriveUrlToEmbed'

describe('transformGoogleDriveUrlToEmbed', () => {
  it('transforms valid Google Drive URL formats to preview embed URL', () => {
    expect(
      transformGoogleDriveUrlToEmbed('https://drive.google.com/file/d/abc123XYZ/view?usp=sharing'),
    ).toBe('https://drive.google.com/file/d/abc123XYZ/preview')

    expect(
      transformGoogleDriveUrlToEmbed('https://drive.google.com/file/d/abc123XYZ/edit'),
    ).toBe('https://drive.google.com/file/d/abc123XYZ/preview')

    expect(
      transformGoogleDriveUrlToEmbed('https://drive.google.com/open?id=abc123XYZ'),
    ).toBe('https://drive.google.com/file/d/abc123XYZ/preview')
  })

  it('returns null for invalid URLs', () => {
    expect(transformGoogleDriveUrlToEmbed('https://example.com/file/d/abc123XYZ/view')).toBeNull()
    expect(transformGoogleDriveUrlToEmbed('esto no es una url')).toBeNull()
    expect(transformGoogleDriveUrlToEmbed('')).toBeNull()
  })
})
