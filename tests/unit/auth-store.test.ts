import { describe, it, expect } from 'vitest'
import { useAuthStore } from '@/lib/auth-store'

describe('useAuthStore', () => {
  it('setHydrating sets isHydrating to true', () => {
    const { setHydrating } = useAuthStore.getState()
    setHydrating(true)
    const { isHydrating } = useAuthStore.getState()
    expect(isHydrating).toBe(true)
  })

  it('setHydrating sets isHydrating to false', () => {
    const { setHydrating } = useAuthStore.getState()
    setHydrating(false)
    const { isHydrating } = useAuthStore.getState()
    expect(isHydrating).toBe(false)
  })
})