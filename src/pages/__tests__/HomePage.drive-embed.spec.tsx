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

describe('HomePage - integración DriveEmbed', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    eventosMockData = []
    anunciosMockData = []
  })

  it('renderiza DriveEmbed cuando el anuncio para todos incluye drive_public_url', async () => {
    anunciosMockData = [
      {
        id: 'anuncio-todos-drive',
        titulo: 'Comunicado general',
        contenido: 'Contenido textual que no debe mostrarse cuando hay embed',
        importante: true,
        fecha_publicacion: '2026-04-26T12:00:00.000Z',
        destinatarios: ['todos'],
        drive_public_url: 'https://drive.google.com/file/d/DRIVE123/view?usp=sharing',
      },
    ]

    render(
      <MemoryRouter>
        <HomePage />
      </MemoryRouter>,
    )

    expect(await screen.findByText('Comunicado general')).toBeInTheDocument()
    expect(screen.getByTitle('Vista previa del documento de Google Drive')).toBeInTheDocument()
    expect(
      screen.queryByText('Contenido textual que no debe mostrarse cuando hay embed'),
    ).not.toBeInTheDocument()
  })

  it('renderiza el párrafo de contenido para anuncio de grupo sin drive_public_url y no muestra iframe', async () => {
    anunciosMockData = [
      {
        id: 'anuncio-grupo-sin-drive',
        titulo: 'Comunicado estudiantes',
        contenido: 'Contenido visible para grupo sin vista previa',
        importante: false,
        fecha_publicacion: '2026-04-26T12:00:00.000Z',
        destinatarios: ['estudiante'],
        drive_public_url: null,
      },
    ]

    render(
      <MemoryRouter>
        <HomePage />
      </MemoryRouter>,
    )

    expect(await screen.findByText('Comunicado estudiantes')).toBeInTheDocument()
    expect(screen.getByText('Contenido visible para grupo sin vista previa')).toBeInTheDocument()
    expect(screen.queryByTitle('Vista previa del documento de Google Drive')).not.toBeInTheDocument()
  })
})
