import { render, screen } from '@testing-library/react'
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

let eventosMockData: EventoRow[] = []

const profileMock = {
  id: 'docente-1',
  rol: 'docente',
  email: 'docente@liceo.edu',
  nombre_completo: 'Docente Test',
  activo: true,
}

function createBuilder() {
  const result = { data: eventosMockData, error: null }

  const builder = {
    select: vi.fn().mockReturnThis(),
    order: vi.fn().mockReturnThis(),
    or: vi.fn().mockReturnThis(),
    then: (resolve: (value: typeof result) => unknown, reject?: (reason: unknown) => unknown) =>
      Promise.resolve(result).then(resolve, reject),
  }

  return builder
}

vi.mock('@/lib/supabase', () => ({
  supabase: {
    from: vi.fn(() => createBuilder()),
  },
}))

vi.mock('@/lib/auth-store', () => ({
  useAuthStore: () => ({
    profile: profileMock,
  }),
}))

vi.mock('@/lib/async-utils', () => ({
  withTimeout: async (promise: Promise<unknown>) => promise,
}))

describe('CalendarioPage - integración DriveEmbed', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.stubEnv('VITE_ENABLE_GOOGLE_DRIVE_EMBED', 'true')
    eventosMockData = []
  })

  it('renderiza el embed cuando el evento es para todos y tiene drive_public_url', async () => {
    eventosMockData = [
      {
        id: 'evento-publico-drive',
        titulo: 'Reunión general',
        descripcion: 'Descripción del evento',
        tipo: 'General',
        fecha_inicio: '2099-04-26T10:00:00.000Z',
        fecha_fin: null,
        todo_el_dia: false,
        lugar: 'Auditorio',
        destinatarios: ['todos'],
        drive_public_url: 'https://drive.google.com/file/d/DRIVE123/view?usp=sharing',
        creado_por: 'docente-1',
        created_at: '2099-04-20T10:00:00.000Z',
      },
    ]

    render(<CalendarioPage />)

    expect(await screen.findByText('Reunión general')).toBeInTheDocument()
    expect(screen.getByTitle('Vista previa del documento de Google Drive')).toBeInTheDocument()
  })

  it('no renderiza el embed cuando no aplica la regla de todos + drive_public_url', async () => {
    eventosMockData = [
      {
        id: 'evento-grupo-drive',
        titulo: 'Taller para estudiantes',
        descripcion: 'Solo estudiantes',
        tipo: 'Académico',
        fecha_inicio: '2099-05-01T08:00:00.000Z',
        fecha_fin: null,
        todo_el_dia: false,
        lugar: null,
        destinatarios: ['estudiante'],
        drive_public_url: 'https://drive.google.com/file/d/DRIVE999/view?usp=sharing',
        creado_por: 'docente-1',
        created_at: '2099-04-20T10:00:00.000Z',
      },
    ]

    render(<CalendarioPage />)

    expect(await screen.findByText('Taller para estudiantes')).toBeInTheDocument()
    expect(screen.queryByTitle('Vista previa del documento de Google Drive')).not.toBeInTheDocument()
  })
})
