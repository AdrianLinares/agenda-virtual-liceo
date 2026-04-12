import { beforeEach, describe, expect, it, vi } from 'vitest'
import type { User } from '@supabase/supabase-js'
import type { Database } from '@/types/database.types'

type Profile = Database['public']['Tables']['profiles']['Row']

const getSessionMock = vi.fn()
const updateUserMock = vi.fn()
const signOutMock = vi.fn()

vi.mock('@/lib/supabase', () => ({
  supabase: {
    auth: {
      getSession: getSessionMock,
      updateUser: updateUserMock,
      signOut: signOutMock,
    },
    from: vi.fn(),
  },
}))

describe('useAuthStore.updatePasswordWithRecovery', () => {
  beforeEach(async () => {
    vi.clearAllMocks()
    const { useAuthStore } = await import('@/lib/auth-store')
    useAuthStore.setState({
      user: { id: 'user-1', email: 'test@liceo.edu' } as User,
      profile: {
        id: 'user-1',
        email: 'test@liceo.edu',
        rol: 'estudiante',
        nombre_completo: 'Usuario Test',
        activo: true,
        telefono: null,
        direccion: null,
        fecha_nacimiento: null,
        numero_documento: null,
        tipo_documento: null,
        created_at: null,
      } as Profile,
      loading: false,
      initialized: true,
      resumeVersion: 0,
    })
  })

  it('fails fast when recovery session is missing', async () => {
    const { useAuthStore } = await import('@/lib/auth-store')
    getSessionMock.mockResolvedValue({ data: { session: null } })

    await expect(useAuthStore.getState().updatePasswordWithRecovery('Nueva123*'))
      .rejects
      .toThrow('No se encontró una sesión de recuperación activa. Abre nuevamente el enlace enviado al correo.')

    expect(updateUserMock).not.toHaveBeenCalled()
  })

  it('updates password successfully and clears local auth state', async () => {
    const { useAuthStore } = await import('@/lib/auth-store')

    getSessionMock.mockResolvedValue({ data: { session: { user: { id: 'user-1' } } } })
    updateUserMock.mockResolvedValue({ error: null })
    signOutMock.mockResolvedValue({ error: null })

    await expect(useAuthStore.getState().updatePasswordWithRecovery('Nueva123*')).resolves.toBeUndefined()

    expect(updateUserMock).toHaveBeenCalledTimes(1)
    expect(signOutMock).toHaveBeenCalledWith({ scope: 'local' })
    expect(useAuthStore.getState().user).toBeNull()
    expect(useAuthStore.getState().profile).toBeNull()
  })

  it('retries once on transient network error and succeeds', async () => {
    const { useAuthStore } = await import('@/lib/auth-store')

    getSessionMock.mockResolvedValue({ data: { session: { user: { id: 'user-1' } } } })
    updateUserMock
      .mockResolvedValueOnce({ error: { message: 'Network request failed' } })
      .mockResolvedValueOnce({ error: null })
    signOutMock.mockResolvedValue({ error: null })

    await expect(useAuthStore.getState().updatePasswordWithRecovery('Nueva123*')).resolves.toBeUndefined()

    expect(updateUserMock).toHaveBeenCalledTimes(2)
  })

  it('does not fail when retry returns same-password style message', async () => {
    const { useAuthStore } = await import('@/lib/auth-store')

    getSessionMock.mockResolvedValue({ data: { session: { user: { id: 'user-1' } } } })
    updateUserMock
      .mockResolvedValueOnce({ error: { message: 'timeout while updating password' } })
      .mockResolvedValueOnce({ error: { message: 'Password should be different from old password' } })
    signOutMock.mockResolvedValue({ error: null })

    await expect(useAuthStore.getState().updatePasswordWithRecovery('Nueva123*')).resolves.toBeUndefined()

    expect(updateUserMock).toHaveBeenCalledTimes(2)
    expect(signOutMock).toHaveBeenCalled()
  })

  it('falls back to generic signOut when local signOut fails', async () => {
    const { useAuthStore } = await import('@/lib/auth-store')

    getSessionMock.mockResolvedValue({ data: { session: { user: { id: 'user-1' } } } })
    updateUserMock.mockResolvedValue({ error: null })
    signOutMock
      .mockResolvedValueOnce({ error: { message: 'scope not supported' } })
      .mockResolvedValueOnce({ error: null })

    await expect(useAuthStore.getState().updatePasswordWithRecovery('Nueva123*')).resolves.toBeUndefined()

    expect(signOutMock).toHaveBeenNthCalledWith(1, { scope: 'local' })
    expect(signOutMock).toHaveBeenNthCalledWith(2)
  })
})
