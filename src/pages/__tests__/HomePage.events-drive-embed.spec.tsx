import { render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import HomePage from '@/pages/HomePage'

type PublicEventoRow = {
  id: string
  titulo: string
  descripcion: string | null
  tipo: string
  fecha_inicio: string
  fecha_fin: string | null
  todo_el_dia: boolean
  lugar: string | null
  destinatarios?: string[] | null
  drive_public_url?: string | null
}

type PublicAnuncioRow = {
  id: string
  titulo: string
  contenido: string
  importante: boolean
  fecha_publicacion: string
  destinatarios?: string[] | null
  drive_public_url?: string | null
}

let eventosMockData: PublicEventoRow[] = []
let anunciosMockData: PublicAnuncioRow[] = []

function createBuilder(table: string) {
  const result = {
    data: table === 'eventos' ? eventosMockData : anunciosMockData,
    error: null,
  }

  const builder = {
    select: vi.fn().mockReturnThis(),
    gte: vi.fn().mockReturnThis(),
    or: vi.fn().mockReturnThis(),
    order: vi.fn().mockReturnThis(),
    limit: vi.fn().mockReturnThis(),
    then: (resolve: (value: typeof result) => unknown, reject?: (reason: unknown) => unknown) =>
      Promise.resolve(result).then(resolve, reject),
  }

  return builder
}

vi.mock('@/lib/supabase', () => ({
  supabase: {
    from: vi.fn((table: string) => createBuilder(table)),
  },
}))

vi.mock('@/lib/async-utils', () => ({
  withTimeout: async (promise: Promise<unknown>) => promise,
  withRetry: async (fn: () => Promise<unknown>) => fn(),
}))

describe('HomePage - eventos DriveEmbed', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    eventosMockData = []
    anunciosMockData = []
  })

  it('renderiza DriveEmbed cuando el evento es para todos y tiene drive_public_url', async () => {
    eventosMockData = [
      {
        id: 'evento-todos-drive',
        titulo: 'Evento institucional',
        descripcion: 'Descripción que no debe mostrarse si hay embed',
        tipo: 'academico',
        fecha_inicio: '2026-05-20T10:00:00.000Z',
        fecha_fin: null,
        todo_el_dia: false,
        lugar: 'Auditorio',
        destinatarios: ['todos'],
        drive_public_url: 'https://drive.google.com/file/d/DRIVE-EVENTO-123/view?usp=sharing',
      },
    ]

    render(
      <MemoryRouter>
        <HomePage />
      </MemoryRouter>,
    )

    expect(await screen.findByText('Evento institucional')).toBeInTheDocument()
    expect(screen.getByTitle('Vista previa del documento de Google Drive')).toBeInTheDocument()
    expect(screen.queryByText('Descripción que no debe mostrarse si hay embed')).not.toBeInTheDocument()
  })

  it('no renderiza DriveEmbed cuando no hay drive_public_url o el evento no es para todos y mantiene contenido original', async () => {
    eventosMockData = [
      {
        id: 'evento-sin-drive',
        titulo: 'Evento sin Drive',
        descripcion: 'Descripción visible del evento sin Drive',
        tipo: 'academico',
        fecha_inicio: '2026-05-21T10:00:00.000Z',
        fecha_fin: null,
        todo_el_dia: false,
        lugar: 'Salón 1',
        destinatarios: ['todos'],
        drive_public_url: null,
      },
      {
        id: 'evento-no-todos',
        titulo: 'Evento solo docentes',
        descripcion: 'Descripción visible del evento por destinatario',
        tipo: 'reunion',
        fecha_inicio: '2026-05-22T10:00:00.000Z',
        fecha_fin: null,
        todo_el_dia: false,
        lugar: 'Sala de maestros',
        destinatarios: ['estudiante'],
        drive_public_url: 'https://drive.google.com/file/d/DRIVE-EVENTO-999/view?usp=sharing',
      },
    ]

    render(
      <MemoryRouter>
        <HomePage />
      </MemoryRouter>,
    )

    expect(await screen.findByText('Evento sin Drive')).toBeInTheDocument()
    expect(screen.getByText('Descripción visible del evento sin Drive')).toBeInTheDocument()
    expect(screen.getByText('Descripción visible del evento por destinatario')).toBeInTheDocument()
    expect(screen.queryByTitle('Vista previa del documento de Google Drive')).not.toBeInTheDocument()
  })
})
