import { render, screen } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import AsistenciaPage from '@/pages/AsistenciaPage'

type Profile = {
  id: string
  rol: 'docente' | 'administrador' | 'administrativo'
  email: string
  nombre_completo: string
  activo: boolean
}

type AttendanceRow = {
  id: string
  estudiante_id: string
  grupo_id: string
  fecha: string
  estado: 'presente' | 'ausente' | 'tarde' | 'excusa'
  observaciones: string | null
  registrado_por: string | null
  created_at: string
  asignatura: { nombre: string } | null
  estudiante: { nombre_completo: string; email: string }
  grupo: { nombre: string; grado: { nombre: string } }
  asignatura_id: string
}

type AssignmentRow = {
  asignatura_id: string | null
}

type MockSelectContextValue = {
  value?: string
  onValueChange?: (value: string) => void
}

const todayIso = () => new Date().toISOString().split('T')[0]

const docenteProfile: Profile = {
  id: 'docente-1',
  rol: 'docente',
  email: 'docente@liceo.edu',
  nombre_completo: 'Docente Test',
  activo: true,
}

const adminProfile: Profile = {
  id: 'admin-1',
  rol: 'administrador',
  email: 'admin@liceo.edu',
  nombre_completo: 'Administrador Test',
  activo: true,
}

const asignaturasData = [
  { id: 'asig-1', nombre: 'Matemáticas', codigo: 'MAT' },
  { id: 'asig-2', nombre: 'Ciencias', codigo: 'CIE' },
]

const gruposData = [
  { id: 'grupo-1', nombre: 'A', grado: { nombre: '6A' }, año_academico: 2026 },
]

const attendanceData: AttendanceRow[] = [
  {
    id: 'asis-1',
    estudiante_id: 'est-1',
    grupo_id: 'grupo-1',
    fecha: todayIso(),
    estado: 'presente',
    observaciones: null,
    registrado_por: 'admin-1',
    created_at: '2026-04-14T10:00:00.000Z',
    asignatura: { nombre: 'Matemáticas' },
    estudiante: { nombre_completo: 'Ana Pérez', email: 'ana@liceo.edu' },
    grupo: { nombre: 'A', grado: { nombre: '6A' } },
    asignatura_id: 'asig-1',
  },
  {
    id: 'asis-2',
    estudiante_id: 'est-2',
    grupo_id: 'grupo-1',
    fecha: todayIso(),
    estado: 'tarde',
    observaciones: null,
    registrado_por: 'admin-2',
    created_at: '2026-04-14T11:00:00.000Z',
    asignatura: { nombre: 'Ciencias' },
    estudiante: { nombre_completo: 'Luis Gómez', email: 'luis@liceo.edu' },
    grupo: { nombre: 'A', grado: { nombre: '6A' } },
    asignatura_id: 'asig-2',
  },
]

let currentProfile: Profile = docenteProfile

function createBuilder(table: string) {
  const eqFilters = new Map<string, unknown>()
  const inFilters = new Map<string, unknown[]>()

  const buildResult = () => {
    if (table === 'asignaciones_docentes') {
      const rows: AssignmentRow[] = currentProfile.rol === 'docente'
        ? [{ asignatura_id: 'asig-1' }]
        : []

      return { data: rows, error: null }
    }

    if (table === 'grupos') {
      return { data: gruposData, error: null }
    }

    if (table === 'asignaturas') {
      return { data: asignaturasData, error: null }
    }

    if (table === 'asistencias') {
      const fecha = eqFilters.get('fecha')
      const grupoId = eqFilters.get('grupo_id')
      const asignaturaIds = inFilters.get('asignatura_id')

      const rows = attendanceData.filter((row) => {
        const fechaOk = !fecha || row.fecha === fecha
        const grupoOk = !grupoId || row.grupo_id === grupoId
        const asignaturaOk = !asignaturaIds || asignaturaIds.includes(row.asignatura_id)

        return fechaOk && grupoOk && asignaturaOk
      })

      return { data: rows, error: null }
    }

    return { data: [], error: null }
  }

  const builder = {
    select: vi.fn().mockReturnThis(),
    eq: vi.fn().mockImplementation((column: string, value: unknown) => {
      eqFilters.set(column, value)
      return builder
    }),
    in: vi.fn().mockImplementation((column: string, values: unknown[]) => {
      inFilters.set(column, values)
      return builder
    }),
    order: vi.fn().mockReturnThis(),
    returns: vi.fn().mockImplementation(() => Promise.resolve(buildResult())),
    then: (resolve: (value: unknown) => unknown, reject?: (reason: unknown) => unknown) =>
      Promise.resolve(buildResult()).then(resolve, reject),
  }

  return builder
}

vi.mock('@/lib/supabase', () => ({
  supabase: {
    from: vi.fn((table: string) => createBuilder(table)),
  },
}))

vi.mock('@/lib/auth-store', () => ({
  useAuthStore: () => ({
    profile: currentProfile,
  }),
}))

vi.mock('@/components/ui/select', async () => {
  const React = await import('react')

  const SelectContext = React.createContext<MockSelectContextValue>({})

  return {
    Select: ({ value, onValueChange, children }: { value?: string; onValueChange?: (value: string) => void; children: React.ReactNode }) => (
      <SelectContext.Provider value={{ value, onValueChange }}>{children}</SelectContext.Provider>
    ),
    SelectTrigger: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
    SelectContent: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
    SelectItem: ({ value, children }: { value: string; children: React.ReactNode }) => {
      const ctx = React.useContext(SelectContext)

      return (
        <button type="button" data-testid={`mock-select-item-${value}`} onClick={() => ctx.onValueChange?.(value)}>
          {children}
        </button>
      )
    },
    SelectValue: ({ placeholder }: { placeholder?: string }) => <span>{placeholder ?? 'Selecciona'}</span>,
  }
})

describe('AsistenciaPage - visibilidad por asignaturas', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('docente solo ve asistencia de sus asignaturas, aunque la haya creado otro usuario', async () => {
    currentProfile = docenteProfile

    render(<AsistenciaPage />)

    expect(await screen.findByText('Ana Pérez')).toBeInTheDocument()
    expect(screen.queryByText('Luis Gómez')).toBeNull()
    expect(screen.getByText(/Matemáticas/)).toBeInTheDocument()
  })

  it('administrador ve todas las asistencias del día sin importar quién las registró', async () => {
    currentProfile = adminProfile

    render(<AsistenciaPage />)

    expect(await screen.findByText('Ana Pérez')).toBeInTheDocument()
    expect(screen.getByText('Luis Gómez')).toBeInTheDocument()
    expect(screen.getByText(/Matemáticas/)).toBeInTheDocument()
    expect(screen.getByText(/Ciencias/)).toBeInTheDocument()
  })
})