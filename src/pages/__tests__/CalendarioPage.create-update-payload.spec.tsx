import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import CalendarioPage from '@/pages/CalendarioPage'

type EventoRow = {
  id: string
  titulo: string
  descripcion: string | null
  tipo: string
  fecha_inicio: string
  fecha_fin: string | null
  todo_el_dia: boolean
  lugar: string | null
  destinatarios: string[]
  drive_public_url: string | null
  creado_por: string | null
  created_at: string
}

const insertMock = vi.fn()
const updateMock = vi.fn()

const profileMock = {
  id: 'docente-1',
  rol: 'docente',
  email: 'docente@liceo.edu',
  nombre_completo: 'Docente Test',
  activo: true,
}

const eventosStore: EventoRow[] = [
  {
    id: 'evento-1',
    titulo: 'Evento editable',
    descripcion: 'Descripción inicial',
    tipo: 'General',
    fecha_inicio: '2099-04-26T10:00:00.000Z',
    fecha_fin: null,
    todo_el_dia: false,
    lugar: 'Salón 1',
    destinatarios: ['todos'],
    drive_public_url: 'https://drive.google.com/file/d/EXISTENTE123/view?usp=sharing',
    creado_por: 'docente-1',
    created_at: '2099-04-20T10:00:00.000Z',
  },
]

const initialEventos = (): EventoRow[] => [
  {
    id: 'evento-1',
    titulo: 'Evento editable',
    descripcion: 'Descripción inicial',
    tipo: 'General',
    fecha_inicio: '2099-04-26T10:00:00.000Z',
    fecha_fin: null,
    todo_el_dia: false,
    lugar: 'Salón 1',
    destinatarios: ['todos'],
    drive_public_url: 'https://drive.google.com/file/d/EXISTENTE123/view?usp=sharing',
    creado_por: 'docente-1',
    created_at: '2099-04-20T10:00:00.000Z',
  },
]

function createBuilder(table: string) {
  let op: 'select' | 'insert' | 'update' | 'delete' = 'select'
  let payload: Record<string, unknown> | null = null
  const eqFilters = new Map<string, unknown>()

  const buildResult = () => {
    if (table !== 'eventos') {
      return { data: [], error: null }
    }

    if (op === 'select') {
      return { data: eventosStore, error: null }
    }

    if (op === 'insert') {
      const next = payload ?? {}
      eventosStore.unshift({
        id: `evento-${eventosStore.length + 1}`,
        titulo: String(next.titulo ?? ''),
        descripcion: (next.descripcion as string | null) ?? null,
        tipo: String(next.tipo ?? 'General'),
        fecha_inicio: String(next.fecha_inicio ?? new Date().toISOString()),
        fecha_fin: (next.fecha_fin as string | null) ?? null,
        todo_el_dia: Boolean(next.todo_el_dia),
        lugar: (next.lugar as string | null) ?? null,
        destinatarios: (next.destinatarios as string[]) ?? ['todos'],
        drive_public_url: (next.drive_public_url as string | null) ?? null,
        creado_por: String(next.creado_por ?? 'docente-1'),
        created_at: new Date().toISOString(),
      })

      return { data: eventosStore, error: null }
    }

    if (op === 'update') {
      const id = String(eqFilters.get('id') ?? '')
      const current = eventosStore.find((item) => item.id === id)
      const next = payload ?? {}

      if (current) {
        current.titulo = String(next.titulo ?? current.titulo)
        current.descripcion = (next.descripcion as string | null | undefined) ?? current.descripcion
        current.tipo = String(next.tipo ?? current.tipo)
        current.fecha_inicio = String(next.fecha_inicio ?? current.fecha_inicio)
        current.fecha_fin = (next.fecha_fin as string | null | undefined) ?? current.fecha_fin
        current.todo_el_dia = next.todo_el_dia === undefined ? current.todo_el_dia : Boolean(next.todo_el_dia)
        current.lugar = (next.lugar as string | null | undefined) ?? current.lugar
        current.destinatarios = (next.destinatarios as string[] | undefined) ?? current.destinatarios
        current.drive_public_url =
          (next.drive_public_url as string | null | undefined) ?? current.drive_public_url
      }

      return { data: current ? [current] : [], error: null }
    }

    return { data: [], error: null }
  }

  const builder = {
    select: vi.fn().mockReturnThis(),
    order: vi.fn().mockReturnThis(),
    or: vi.fn().mockReturnThis(),
    eq: vi.fn().mockImplementation((column: string, value: unknown) => {
      eqFilters.set(column, value)
      return builder
    }),
    delete: vi.fn().mockImplementation(() => {
      op = 'delete'
      return builder
    }),
    insert: vi.fn().mockImplementation((data: Record<string, unknown>) => {
      op = 'insert'
      payload = data
      insertMock(data)
      return builder
    }),
    update: vi.fn().mockImplementation((data: Record<string, unknown>) => {
      op = 'update'
      payload = data
      updateMock(data)
      return builder
    }),
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
    profile: profileMock,
  }),
}))

vi.mock('@/lib/async-utils', () => ({
  withTimeout: (promise: Promise<unknown>) => promise,
}))

describe('CalendarioPage - payload drive_public_url', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.stubEnv('VITE_ENABLE_GOOGLE_DRIVE_EMBED', 'true')
    eventosStore.length = 0
    eventosStore.push(...initialEventos())
  })

  it('incluye drive_public_url en payload al crear evento', async () => {
    const user = userEvent.setup()
    render(<CalendarioPage />)

    await waitFor(() => {
      expect(screen.getByRole('button', { name: /Crear evento/i })).toBeInTheDocument()
    })

    await user.click(screen.getByRole('button', { name: /Crear evento/i }))
    await user.type(screen.getByLabelText('Título'), 'Evento con drive')
    await user.type(screen.getByLabelText('Fecha inicio'), '2099-06-01T08:00')

    const driveUrl = 'https://drive.google.com/file/d/CREATE123/view?usp=sharing'
    await user.type(screen.getByLabelText('Enlace público de Google Drive (opcional)'), driveUrl)

    await user.click(screen.getByRole('button', { name: /^Crear evento$/i }))

    await waitFor(() => {
      expect(insertMock).toHaveBeenCalledTimes(1)
    })

    const payload = insertMock.mock.calls[0][0] as { drive_public_url: string | null }
    expect(payload.drive_public_url).toBe(driveUrl)
  })

  it('precarga y envía drive_public_url en payload al actualizar evento', async () => {
    const user = userEvent.setup()
    render(<CalendarioPage />)

    await waitFor(() => {
      expect(screen.getAllByRole('button', { name: /Editar/i }).length).toBeGreaterThan(0)
    })

    await user.click(screen.getAllByRole('button', { name: /Editar/i })[0])

    const driveInput = screen.getByLabelText('Enlace público de Google Drive (opcional)') as HTMLInputElement
    expect(driveInput.value).toBe('https://drive.google.com/file/d/EXISTENTE123/view?usp=sharing')

    await user.clear(driveInput)
    const updatedUrl = 'https://drive.google.com/file/d/UPDATED456/view?usp=sharing'
    await user.type(driveInput, updatedUrl)

    await user.click(screen.getByRole('button', { name: /Guardar cambios/i }))

    await waitFor(() => {
      expect(updateMock).toHaveBeenCalledTimes(1)
    })

    const payload = updateMock.mock.calls[0][0] as { drive_public_url: string | null }
    expect(payload.drive_public_url).toBe(updatedUrl)
  })
})
