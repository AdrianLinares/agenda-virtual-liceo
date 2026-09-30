import { render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import AdminPage from '@/pages/AdminPage'

const { profileUpdates } = vi.hoisted(() => ({
  profileUpdates: [] as Array<Record<string, unknown>>,
}))

const profilesData = [
  {
    id: 'doc-1',
    nombre_completo: 'Ximena Patricia Ávila Díaz',
    email: 'ximena@liceo.edu',
    rol: 'docente',
    titulo_profesional: null,
    telefono: null,
    direccion: null,
    activo: true,
  },
]

function createBuilder(table: string) {
  const eqFilters = new Map<string, unknown>()

  const buildResult = () => {
    if (table === 'profiles') return { data: profilesData, error: null }
    return { data: [], error: null }
  }

  const builder = {
    select: vi.fn().mockImplementation(() => builder),
    eq: vi.fn().mockImplementation((col: string, val: unknown) => {
      eqFilters.set(col, val)
      return builder
    }),
    order: vi.fn().mockReturnThis(),
    single: vi.fn().mockImplementation(async () => buildResult()),
    update: vi.fn().mockImplementation((payload: Record<string, unknown>) => {
      if (table === 'profiles') profileUpdates.push(payload)
      return Promise.resolve({ data: null, error: null })
    }),
    then: (resolve: (value: unknown) => void) => Promise.resolve(buildResult()).then(resolve),
  }

  return builder
}

vi.mock('@/lib/supabase', () => ({
  supabase: {
    from: vi.fn((table: string) => createBuilder(table)),
    channel: vi.fn(() => {
      const channelObj = {
        on: vi.fn().mockReturnThis(),
        subscribe: vi.fn((cb: (arg: string) => void) => {
          if (typeof cb === 'function') cb('SUBSCRIBED')
          return channelObj
        }),
      }
      return channelObj
    }),
    removeChannel: vi.fn(),
  },
}))

vi.mock('@/lib/auth-store', () => ({
  useAuthStore: () => ({
    profile: {
      id: 'admin-1',
      rol: 'administrador',
      email: 'admin@liceo.edu',
      nombre_completo: 'Admin',
      activo: true,
    },
  }),
}))

async function openEditModal() {
  const user = userEvent.setup()
  render(<AdminPage />)

  const row = await waitFor(() => screen.getByText('Ximena Patricia Ávila Díaz').closest('tr'))
  await user.click(within(row as HTMLElement).getByRole('button', { name: 'Editar' }))

  return await screen.findByLabelText(/Título profesional/i)
}

describe('AdminPage - titulo profesional del usuario', () => {
  beforeEach(() => {
    profileUpdates.length = 0
    vi.clearAllMocks()
  })

  it('guarda el titulo profesional al editar el usuario', async () => {
    const user = userEvent.setup()
    const input = await openEditModal()

    await user.clear(input)
    await user.type(input, 'Lic. Ciencias Naturales y Educación Ambiental')

    await user.click(screen.getByRole('button', { name: /Guardar cambios/i }))

    await waitFor(() => expect(profileUpdates.length).toBe(1))
    expect(profileUpdates[0]).toMatchObject({
      nombre_completo: 'Ximena Patricia Ávila Díaz',
      rol: 'docente',
      titulo_profesional: 'Lic. Ciencias Naturales y Educación Ambiental',
    })
  })

  it('envia null cuando el titulo profesional se deja vacio', async () => {
    const user = userEvent.setup()
    const input = await openEditModal()

    expect(input).toHaveValue('')
    await user.click(screen.getByRole('button', { name: /Guardar cambios/i }))

    await waitFor(() => expect(profileUpdates.length).toBe(1))
    expect(profileUpdates[0]).toMatchObject({ titulo_profesional: null })
  })

  it('aclara que el titulo solo aplica a docentes, administrativos y administradores', async () => {
    await openEditModal()

    expect(
      screen.getByText(/Solo aplica a los roles docente, administrativo y administrador/i)
    ).toBeInTheDocument()
  })
})
