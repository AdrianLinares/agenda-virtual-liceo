import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { useAuthStore } from '@/lib/auth-store'
import { supabase } from '@/lib/supabase'
import { recordEvent } from '@/lib/telemetry'

// Mock dependencies
vi.mock('@/lib/supabase', () => ({
  supabase: {
    auth: {
      getSession: vi.fn(),
      onAuthStateChange: vi.fn(),
      signInWithPassword: vi.fn(),
      signOut: vi.fn(),
    },
    from: vi.fn(() => ({
      select: vi.fn(() => ({
        eq: vi.fn(() => ({
          maybeSingle: vi.fn(),
          single: vi.fn(),
        })),
      })),
    })),
  },
}))

vi.mock('@/lib/async-utils', () => ({
  withRetry: vi.fn((fn) => fn()),
  withTimeout: vi.fn((fn) => fn()),
}))

vi.mock('@/utils/normalizeEmail', () => ({
  normalizeEmail: vi.fn((email) => email),
}))

vi.mock('@/config/feature-flags', () => ({
  getAuthHydrateWindowMs: vi.fn(() => 100), // Short for tests
}))

vi.mock('@/lib/telemetry', () => ({
  recordEvent: vi.fn(),
}))

describe('useAuthStore', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    useAuthStore.setState({
      user: null,
      profile: null,
      loading: true,
      authReady: false,
      resumeVersion: 0,
      isHydrating: false,
      pendingAuthUpdate: null,
    })
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it('setHydrating sets isHydrating to true', () => {
    const { setHydrating } = useAuthStore.getState()
    setHydrating(true)
    const { isHydrating } = useAuthStore.getState()
    expect(isHydrating).toBe(true)
  })

  it('markAppResumed increments resumeVersion and records event', () => {
    const { markAppResumed } = useAuthStore.getState()
    const initialVersion = useAuthStore.getState().resumeVersion
    markAppResumed()
    expect(useAuthStore.getState().resumeVersion).toBe(initialVersion + 1)
    expect(recordEvent).toHaveBeenCalledWith('markAppResumed')
  })

  it('setHydrating applies pending auth update when setting to false', () => {
    const mockUpdate = vi.fn()
    useAuthStore.setState({ pendingAuthUpdate: mockUpdate })
    const { setHydrating } = useAuthStore.getState()
    setHydrating(false)
    expect(mockUpdate).toHaveBeenCalled()
    expect(useAuthStore.getState().pendingAuthUpdate).toBeNull()
  })

  describe('initialize', () => {
    it('sets authReady to true after successful session fetch', async () => {
      const mockSession = { user: { id: '1' } }
      vi.mocked(supabase.auth.getSession).mockResolvedValue({ data: { session: mockSession }, error: null })
       
      vi.mocked(supabase.from).mockReturnValue({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            single: vi.fn().mockResolvedValue({ data: { id: '1', rol: 'user' }, error: null }),
          }),
        }),
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      } as any)

      const { initialize } = useAuthStore.getState()
      await initialize()

      expect(useAuthStore.getState().authReady).toBe(true)
      expect(recordEvent).toHaveBeenCalledWith('authReady', { timestamp: expect.any(Number) })
    })

    it('sets authReady to true on session fetch failure', async () => {
      vi.mocked(supabase.auth.getSession).mockResolvedValue({ data: { session: null }, error: new Error('fail') })

      const { initialize } = useAuthStore.getState()
      await initialize()

      expect(useAuthStore.getState().authReady).toBe(true)
      expect(recordEvent).toHaveBeenCalledWith('authReady', { timestamp: expect.any(Number), error: true })
    })
  })

  describe('syncSession', () => {
    it('prevents concurrent calls', async () => {
      vi.mocked(supabase.auth.getSession).mockResolvedValue({ data: { session: null }, error: null })

      const { syncSession } = useAuthStore.getState()
      const promise1 = syncSession()
      const promise2 = syncSession()

      await Promise.all([promise1, promise2])
      expect(vi.mocked(supabase.auth.getSession)).toHaveBeenCalledTimes(1)
    })
  })

  describe('onAuthStateChange deferral', () => {
    it('defers auth update when isHydrating is true', async () => {
      vi.useFakeTimers()
      useAuthStore.setState({ isHydrating: true })

      // Mock onAuthStateChange callback
      const mockCallback = vi.fn()
      vi.mocked(supabase.auth.onAuthStateChange).mockImplementation((callback) => {
        mockCallback.mockImplementation(callback)
        return { data: { subscription: { unsubscribe: vi.fn() } } }
      })

      const { initialize } = useAuthStore.getState()
      await initialize()

      // Trigger auth change
      await mockCallback('SIGNED_IN', { user: { id: '1' } })

      // Should not apply immediately
      expect(useAuthStore.getState().user).toBeNull()

      // Fast-forward timer
      await vi.advanceTimersByTime(100)

      // Now should apply
      expect(useAuthStore.getState().user).toEqual({ id: '1' })
    })

    it('applies auth update immediately when not hydrating', async () => {
      useAuthStore.setState({ isHydrating: false })

      const mockCallback = vi.fn()
      vi.mocked(supabase.auth.onAuthStateChange).mockImplementation((callback) => {
        mockCallback.mockImplementation(callback)
        return { data: { subscription: { unsubscribe: vi.fn() } } }
      })

      const { initialize } = useAuthStore.getState()
      await initialize()

      await mockCallback('SIGNED_IN', { user: { id: '1' } })

      expect(useAuthStore.getState().user).toEqual({ id: '1' })
    })
  })
})
