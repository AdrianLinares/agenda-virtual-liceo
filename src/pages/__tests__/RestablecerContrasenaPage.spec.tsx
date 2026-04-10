import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import RestablecerContrasenaPage from '@/pages/RestablecerContrasenaPage'

const {
  getSessionMock,
  setSessionMock,
  exchangeCodeForSessionMock,
  updatePasswordWithRecoveryMock,
  syncSessionMock,
} = vi.hoisted(() => ({
  getSessionMock: vi.fn(),
  setSessionMock: vi.fn(),
  exchangeCodeForSessionMock: vi.fn(),
  updatePasswordWithRecoveryMock: vi.fn(),
  syncSessionMock: vi.fn(),
}))

let authState = {
  loading: false,
  updatePasswordWithRecovery: updatePasswordWithRecoveryMock,
  syncSession: syncSessionMock,
}

vi.mock('@/lib/supabase', () => ({
  supabase: {
    auth: {
      getSession: getSessionMock,
      setSession: setSessionMock,
      exchangeCodeForSession: exchangeCodeForSessionMock,
    },
  },
}))

vi.mock('@/lib/auth-store', () => ({
  useAuthStore: (selector: (state: typeof authState) => unknown) => selector(authState),
}))

describe('RestablecerContrasenaPage', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    authState = {
      loading: false,
      updatePasswordWithRecovery: updatePasswordWithRecoveryMock,
      syncSession: syncSessionMock,
    }
    window.history.replaceState({}, '', '/restablecer-contrasena')
  })

  it('hydrates recovery session from hash tokens, syncs store and cleans URL', async () => {
    window.history.replaceState({}, '', '/restablecer-contrasena#access_token=at-1&refresh_token=rt-1')
    const replaceStateSpy = vi.spyOn(window.history, 'replaceState')

    getSessionMock
      .mockResolvedValueOnce({ data: { session: null }, error: null })
      .mockResolvedValueOnce({ data: { session: { user: { id: 'u1' } } }, error: null })
    setSessionMock.mockResolvedValue({ error: null })

    render(
      <MemoryRouter>
        <RestablecerContrasenaPage />
      </MemoryRouter>
    )

    await waitFor(() => {
      expect(setSessionMock).toHaveBeenCalledWith({ access_token: 'at-1', refresh_token: 'rt-1' })
    })

    expect(syncSessionMock).toHaveBeenCalledWith('manual')
    expect(replaceStateSpy).toHaveBeenCalled()
    const lastCall = replaceStateSpy.mock.calls.at(-1)
    expect(String(lastCall?.[2])).toBe('/restablecer-contrasena')

    const submit = screen.getByRole('button', { name: /restablecer contraseña/i })
    expect(submit).toBeEnabled()
    expect(screen.queryByText(/enlace de recuperación es inválido o expiró/i)).not.toBeInTheDocument()
  })

  it('hydrates recovery session from ?code flow and cleans URL', async () => {
    window.history.replaceState({}, '', '/restablecer-contrasena?code=abc123')
    const replaceStateSpy = vi.spyOn(window.history, 'replaceState')

    getSessionMock
      .mockResolvedValueOnce({ data: { session: null }, error: null })
      .mockResolvedValueOnce({ data: { session: { user: { id: 'u1' } } }, error: null })
    exchangeCodeForSessionMock.mockResolvedValue({ error: null })

    render(
      <MemoryRouter>
        <RestablecerContrasenaPage />
      </MemoryRouter>
    )

    await waitFor(() => {
      expect(exchangeCodeForSessionMock).toHaveBeenCalledWith('abc123')
    })

    expect(syncSessionMock).toHaveBeenCalledWith('manual')
    const lastCall = replaceStateSpy.mock.calls.at(-1)
    expect(String(lastCall?.[2])).toBe('/restablecer-contrasena')
  })

  it('shows friendly invalid link error and keeps submit disabled when no tokens or code', async () => {
    getSessionMock.mockResolvedValue({ data: { session: null }, error: null })

    render(
      <MemoryRouter>
        <RestablecerContrasenaPage />
      </MemoryRouter>
    )

    expect(await screen.findByText('El enlace de recuperación es inválido o expiró. Solicita uno nuevo.')).toBeInTheDocument()
    const submit = screen.getByRole('button', { name: /restablecer contraseña/i })
    expect(submit).toBeDisabled()
  })

  it('blocks submission with recoveryReady gating message', async () => {
    getSessionMock.mockResolvedValue({ data: { session: null }, error: null })

    render(
      <MemoryRouter>
        <RestablecerContrasenaPage />
      </MemoryRouter>
    )

    await screen.findByText('El enlace de recuperación es inválido o expiró. Solicita uno nuevo.')
    expect(screen.getByLabelText(/^Nueva contraseña$/i)).toBeInTheDocument()
    expect(screen.getByLabelText(/confirmar nueva contraseña/i)).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /restablecer contraseña/i })).toBeDisabled()
    expect(updatePasswordWithRecoveryMock).not.toHaveBeenCalled()
  })
})
