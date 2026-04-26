import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import AnunciosPage from '@/pages/AnunciosPage'

type AnuncioRow = {
  id: string
  titulo: string
  contenido: string
  autor_id: string
  destinatarios: string[]
  importante: boolean
  fecha_publicacion: string
  fecha_expiracion: string | null
  drive_public_url: string | null
  created_at: string
  autor?: {
    nombre_completo: string
    email: string
  }
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

const anunciosStore: AnuncioRow[] = [
  {
    id: 'anuncio-1',
    titulo: 'Circular académica',
    contenido: 'Contenido inicial',
    autor_id: 'docente-1',
    destinatarios: ['todos'],
    importante: false,
    fecha_publicacion: '2026-04-01T10:00:00.000Z',
    fecha_expiracion: null,
    drive_public_url: 'https://drive.google.com/file/d/EXISTENTE123/view?usp=sharing',
    created_at: '2026-04-01T10:00:00.000Z',
    autor: {
      nombre_completo: 'Docente Test',
      email: 'docente@liceo.edu',
    },
  },
]

const initialAnuncios = (): AnuncioRow[] => [
  {
    id: 'anuncio-1',
    titulo: 'Circular académica',
    contenido: 'Contenido inicial',
    autor_id: 'docente-1',
    destinatarios: ['todos'],
    importante: false,
    fecha_publicacion: '2026-04-01T10:00:00.000Z',
    fecha_expiracion: null,
    drive_public_url: 'https://drive.google.com/file/d/EXISTENTE123/view?usp=sharing',
    created_at: '2026-04-01T10:00:00.000Z',
    autor: {
      nombre_completo: 'Docente Test',
      email: 'docente@liceo.edu',
    },
  },
]

function createBuilder(table: string) {
  let op: 'select' | 'insert' | 'update' | 'delete' = 'select'
  let payload: Record<string, unknown> | null = null
  const eqFilters = new Map<string, unknown>()

  const buildResult = () => {
    if (table !== 'anuncios') {
      return { data: [], error: null }
    }

    if (op === 'select') {
      return { data: anunciosStore, error: null }
    }

    if (op === 'insert') {
      const next = payload ?? {}
      anunciosStore.unshift({
        id: `anuncio-${anunciosStore.length + 1}`,
        titulo: String(next.titulo ?? ''),
        contenido: String(next.contenido ?? ''),
        autor_id: String(next.autor_id ?? ''),
        destinatarios: (next.destinatarios as string[]) ?? ['todos'],
        importante: Boolean(next.importante),
        fecha_publicacion: String(next.fecha_publicacion ?? new Date().toISOString()),
        fecha_expiracion: (next.fecha_expiracion as string | null) ?? null,
        drive_public_url: (next.drive_public_url as string | null) ?? null,
        created_at: new Date().toISOString(),
        autor: {
          nombre_completo: 'Docente Test',
          email: 'docente@liceo.edu',
        },
      })

      return { data: anunciosStore, error: null }
    }

    if (op === 'update') {
      const id = String(eqFilters.get('id') ?? '')
      const current = anunciosStore.find((item) => item.id === id)
      const next = payload ?? {}

      if (current) {
        current.titulo = String(next.titulo ?? current.titulo)
        current.contenido = String(next.contenido ?? current.contenido)
        current.destinatarios = (next.destinatarios as string[]) ?? current.destinatarios
        current.importante = next.importante === undefined ? current.importante : Boolean(next.importante)
        current.fecha_expiracion = (next.fecha_expiracion as string | null | undefined) ?? current.fecha_expiracion
        current.drive_public_url = (next.drive_public_url as string | null | undefined) ?? current.drive_public_url
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
    maybeSingle: vi.fn().mockResolvedValue({ data: null, error: null }),
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

describe('AnunciosPage - integración drive_public_url', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.stubEnv('VITE_ENABLE_GOOGLE_DRIVE_EMBED', 'true')
    anunciosStore.length = 0
    anunciosStore.push(...initialAnuncios())
  })

  it('incluye drive_public_url en payload al crear anuncio', async () => {
    const user = userEvent.setup()
    render(<AnunciosPage />)

    await waitFor(() => {
      expect(screen.getByRole('button', { name: /Publicar anuncio/i })).toBeInTheDocument()
    })

    await user.click(screen.getByRole('button', { name: /Publicar anuncio/i }))

    await user.type(screen.getByLabelText('Título'), 'Anuncio con drive')
    await user.type(screen.getByLabelText('Contenido'), 'Detalle del anuncio')

    const driveUrl = 'https://drive.google.com/file/d/DRIVEID123/view?usp=sharing'
    await user.type(screen.getByLabelText('Enlace público de Google Drive (opcional)'), driveUrl)

    const submitButtons = screen.getAllByRole('button', { name: /^Publicar$/i })
    await user.click(submitButtons[0])

    await waitFor(() => {
      expect(insertMock).toHaveBeenCalledTimes(1)
    })

    const payload = insertMock.mock.calls[0][0] as { drive_public_url: string | null }
    expect(payload.drive_public_url).toBe(driveUrl)
  })

  it('precarga, actualiza y renderiza DriveEmbed con drive_public_url', async () => {
    const user = userEvent.setup()
    render(<AnunciosPage />)

    await waitFor(() => {
      expect(screen.getAllByRole('button', { name: /Editar/i }).length).toBeGreaterThan(0)
    })

    expect(screen.getByTitle('Vista previa del documento de Google Drive')).toBeInTheDocument()

    await user.click(screen.getAllByRole('button', { name: /Editar/i })[0])

    const driveInput = screen.getByLabelText('Enlace público de Google Drive (opcional)') as HTMLInputElement
    expect(driveInput.value).toBe('https://drive.google.com/file/d/EXISTENTE123/view?usp=sharing')

    await user.clear(driveInput)
    const updatedUrl = 'https://drive.google.com/file/d/ACTUALIZADO456/view?usp=sharing'
    await user.type(driveInput, updatedUrl)

    await user.click(screen.getByRole('button', { name: /Guardar cambios/i }))

    await waitFor(() => {
      expect(updateMock).toHaveBeenCalledTimes(1)
    })

    const payload = updateMock.mock.calls[0][0] as { drive_public_url: string | null }
    expect(payload.drive_public_url).toBe(updatedUrl)
  })
})
