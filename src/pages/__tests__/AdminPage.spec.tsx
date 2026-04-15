import { render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi, beforeEach } from 'vitest'

import AdminPage from '@/pages/AdminPage'

// Mock data for the tests
const profilesData = [
  { id: 'padre-1', nombre_completo: 'Padre Uno', email: 'padre1@liceo.edu', rol: 'padre', activo: true },
  { id: 'est-1', nombre_completo: 'Estudiante Uno', email: 'est1@liceo.edu', rol: 'estudiante', activo: true }
]

const gruposData = [
  { id: 'grupo-1', nombre: 'A', grado: { nombre: '6A' }, año_academico: 2026 }
]

const estudiantesGruposData = [
  { grupo_id: 'grupo-1', estudiante: { id: 'est-1', nombre_completo: 'Estudiante Uno', email: 'est1@liceo.edu' }, estado: 'activo' }
]

const padresEstudiantesData = [
  {
    id: 'rel-1',
    padre_id: 'padre-1',
    estudiante_id: 'est-1',
    parentesco: 'Padre',
    principal: true,
    created_at: '2026-01-01T00:00:00.000Z',
    padre: { id: 'padre-1', nombre_completo: 'Padre Uno', email: 'padre1@liceo.edu' },
    estudiante: { id: 'est-1', nombre_completo: 'Estudiante Uno', email: 'est1@liceo.edu' }
  }
]

function createBuilder(table: string) {
  const eqFilters = new Map<string, unknown>()

  const buildResult = () => {
    if (table === 'profiles') return { data: profilesData, error: null }
    if (table === 'grupos') return { data: gruposData, error: null }
    if (table === 'estudiantes_grupos') {
      if (eqFilters.has('grupo_id')) {
        const gid = String(eqFilters.get('grupo_id'))
        return { data: estudiantesGruposData.filter((r) => r.grupo_id === gid), error: null }
      }
      return { data: estudiantesGruposData, error: null }
    }
    if (table === 'padres_estudiantes') return { data: padresEstudiantesData, error: null }
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
          // emulate subscription callback
          if (typeof cb === 'function') cb('SUBSCRIBED')
          return channelObj
        })
      }
      return channelObj
    }),
    removeChannel: vi.fn()
  }
}))

vi.mock('@/lib/auth-store', () => ({
  useAuthStore: () => ({ profile: { id: 'admin-1', rol: 'administrador', email: 'admin@liceo.edu', nombre_completo: 'Admin', activo: true } })
}))

describe('AdminPage - filtros de Usuarios (rol, grupo, búsqueda)', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('muestra estudiantes activos cuando se selecciona rol=estudiante y se elige un grupo', async () => {
    const user = userEvent.setup()
    const { container } = render(<AdminPage />)

    // Esperar que el selector de rol esté disponible
    const roleSelect = await screen.findByLabelText(/Filtrar por rol/i)
    await user.selectOptions(roleSelect, 'estudiante')

    // El select de grupos es nativo con id 'usuarios-group-filter'
    const groupSelect = await waitFor(() => container.querySelector('#usuarios-group-filter') as HTMLSelectElement)
    expect(groupSelect).toBeTruthy()

    await user.selectOptions(groupSelect, 'grupo-1')

    // Ahora debe aparecer la fila del estudiante con estado Activo
    const row = await waitFor(() => screen.getByText('Estudiante Uno').closest('tr'))
    expect(row).toBeTruthy()
    expect(within(row as HTMLElement).getByText(/Activo/i)).toBeInTheDocument()
  })

  it('muestra padres relacionados a estudiantes del grupo cuando rol=padre', async () => {
    const user = userEvent.setup()
    const { container } = render(<AdminPage />)

    const roleSelect = await screen.findByLabelText(/Filtrar por rol/i)
    await user.selectOptions(roleSelect, 'padre')

    const groupSelect = await waitFor(() => container.querySelector('#usuarios-group-filter') as HTMLSelectElement)
    expect(groupSelect).toBeTruthy()

    await user.selectOptions(groupSelect, 'grupo-1')

    const row = await waitFor(() => screen.getByText('Padre Uno').closest('tr'))
    expect(row).toBeTruthy()
    expect(within(row as HTMLElement).getByText(/Activo/i)).toBeInTheDocument()
  })

    it('filtra por nombre o email usando el input de búsqueda', async () => {
    const user = userEvent.setup()
    render(<AdminPage />)

    // El input de búsqueda está presente y por defecto el rol es 'todos'
    const searchInput = await screen.findByPlaceholderText('Buscar por nombre o email')
    await user.type(searchInput, 'Padre')

    // Debe mostrar sólo al padre
    await waitFor(() => expect(screen.getByText('Padre Uno')).toBeTruthy())
    expect(screen.queryByText('Estudiante Uno')).toBeNull()
  })

  it('muestra placeholder/aviso cuando rol estudiante/padre y no se selecciona grupo', async () => {
    const user = userEvent.setup()
    render(<AdminPage />)

    const roleSelect = await screen.findByLabelText(/Filtrar por rol/i)
    await user.selectOptions(roleSelect, 'estudiante')

    // No seleccionamos grupo, la tabla debe indicar que no hay usuarios para el rol seleccionado
    await waitFor(() => expect(screen.getByText(/No hay usuarios para el rol seleccionado\./i)).toBeTruthy())
  })
})
