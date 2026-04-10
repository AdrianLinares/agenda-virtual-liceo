import { describe, expect, it } from 'vitest'
import { normalizeEmail } from '@/utils/normalizeEmail'

describe('normalizeEmail', () => {
  it('trims and lowercases valid email input', () => {
    expect(normalizeEmail('  USER@LICEO.EDU  ')).toBe('user@liceo.edu')
  })

  it('returns empty string for whitespace-only input', () => {
    expect(normalizeEmail('   ')).toBe('')
  })
})
