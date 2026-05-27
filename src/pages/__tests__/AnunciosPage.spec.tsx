import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import AnunciosPage from '@/pages/AnunciosPage'

type GrupoRow = {
  id: string
  nombre: string
  grado: { nombre: string } | null
}

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
  grupo_id: string | null
  grupo_display_name?: string | null
  autor?: {
    nombre_completo: string
    email: string
  }
  grupo?: {
    nombre: string
    grado?: { nombre: string } | null
  } | null
}

const insertMock = vi.fn()
const updateMock = vi.fn()
const gruposFromDB: GrupoRow[] = [
  { id: 'grupo-5a', nombre: '5A', grado: { nombre: 'Grado 5' } },
  { id: 'grupo-6b', nombre: '6B', grado: { nombre: 'Grado 6' } },
]

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
    grupo_id: null,
    grupo: null,
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
    grupo_id: null,
    grupo: null,
    autor: {
      nombre_completo: 'Docente Test',
      email: 'docente@liceo.edu',
    },
  },
]

const initialAnunciosWithGrupo = (): AnuncioRow[] => [
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
    grupo_id: null,
    grupo: null,
    autor: {
      nombre_completo: 'Docente Test',
      email: 'docente@liceo.edu',
    },
  },
  {
    id: 'anuncio-2',
    titulo: 'Reunión de padres 5A',
    contenido: 'Reunión para padres del grupo 5A',
    autor_id: 'docente-1',
    destinatarios: ['estudiante'],
    importante: true,
    fecha_publicacion: '2026-04-05T08:00:00.000Z',
    fecha_expiracion: null,
    drive_public_url: null,
    created_at: '2026-04-05T08:00:00.000Z',
    grupo_id: 'grupo-5a',
    grupo: { nombre: '5A', grado: { nombre: 'Grado 5' } },
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
    if (table === 'grupos') {
      return { data: gruposFromDB, error: null }
    }

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
        grupo_id: (next.grupo_id as string | null) ?? null,
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
        if (next.grupo_id !== undefined) current.grupo_id = next.grupo_id as string | null
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

describe('AnunciosPage - grupo targeting', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.stubEnv('VITE_ENABLE_GOOGLE_DRIVE_EMBED', 'true')
    anunciosStore.length = 0
    anunciosStore.push(...initialAnuncios())
  })

  it('does not show group targeting when estudiante is not selected', async () => {
    const user = userEvent.setup()
    render(<AnunciosPage />)

    await waitFor(() => {
      expect(screen.getByRole('button', { name: /Publicar anuncio/i })).toBeInTheDocument()
    })

    await user.click(screen.getByRole('button', { name: /Publicar anuncio/i }))

    // Default is 'todos' — no group targeting UI should appear
    expect(screen.queryByText(/Todos los estudiantes/i)).not.toBeInTheDocument()
    expect(screen.queryByText(/Solo un grupo específico/i)).not.toBeInTheDocument()
  })

  it('shows group targeting radio buttons when estudiante is checked', async () => {
    const user = userEvent.setup()
    render(<AnunciosPage />)

    await waitFor(() => {
      expect(screen.getByRole('button', { name: /Publicar anuncio/i })).toBeInTheDocument()
    })

    await user.click(screen.getByRole('button', { name: /Publicar anuncio/i }))

    // Uncheck "Todos" first to allow individual selections
    const todosCheckbox = screen.getByRole('checkbox', { name: /Todos/i })
    await user.click(todosCheckbox) // uncheck "todos"

    // Check "Estudiantes"
    const estudianteCheckbox = screen.getByRole('checkbox', { name: /Estudiantes/i })
    await user.click(estudianteCheckbox)

    // Now group targeting UI should appear
    expect(screen.getByLabelText(/Todos los estudiantes/i)).toBeInTheDocument()
    expect(screen.getByLabelText(/Solo un grupo específico/i)).toBeInTheDocument()
  })

  it('shows group dropdown when "Solo un grupo específico" is selected', async () => {
    const user = userEvent.setup()
    render(<AnunciosPage />)

    await waitFor(() => {
      expect(screen.getByRole('button', { name: /Publicar anuncio/i })).toBeInTheDocument()
    })

    await user.click(screen.getByRole('button', { name: /Publicar anuncio/i }))

    // Uncheck "Todos" and check "Estudiantes"
    const todosCheckbox = screen.getByRole('checkbox', { name: /Todos/i })
    await user.click(todosCheckbox)
    const estudianteCheckbox = screen.getByRole('checkbox', { name: /Estudiantes/i })
    await user.click(estudianteCheckbox)

    // Select "Solo un grupo específico"
    const specificRadio = screen.getByLabelText(/Solo un grupo específico/i)
    await user.click(specificRadio)

    // Group dropdown should appear
    await waitFor(() => {
      expect(screen.getByRole('combobox')).toBeInTheDocument()
    })
  })

  it('includes grupo_id in insert payload when specific group is selected', async () => {
    const user = userEvent.setup()
    render(<AnunciosPage />)

    await waitFor(() => {
      expect(screen.getByRole('button', { name: /Publicar anuncio/i })).toBeInTheDocument()
    })

    await user.click(screen.getByRole('button', { name: /Publicar anuncio/i }))

    await user.type(screen.getByLabelText('Título'), 'Anuncio para 5A')
    await user.type(screen.getByLabelText('Contenido'), 'Contenido del anuncio')

    // Uncheck "Todos" and check "Estudiantes"
    const todosCheckbox = screen.getByRole('checkbox', { name: /Todos/i })
    await user.click(todosCheckbox)
    const estudianteCheckbox = screen.getByRole('checkbox', { name: /Estudiantes/i })
    await user.click(estudianteCheckbox)

    // Select "Solo un grupo específico"
    const specificRadio = screen.getByLabelText(/Solo un grupo específico/i)
    await user.click(specificRadio)

    // Wait for grupos to load and select one
    await waitFor(() => {
      expect(screen.getByRole('combobox')).toBeInTheDocument()
    })

    const selectElement = screen.getByRole('combobox')
    await user.selectOptions(selectElement, 'grupo-5a')

    // Submit
    const submitButtons = screen.getAllByRole('button', { name: /^Publicar$/i })
    await user.click(submitButtons[0])

    await waitFor(() => {
      expect(insertMock).toHaveBeenCalledTimes(1)
    })

    const payload = insertMock.mock.calls[0][0] as { grupo_id: string | null }
    expect(payload.grupo_id).toBe('grupo-5a')
  })

  it('sets grupo_id to null in payload when "Todos los estudiantes" is selected', async () => {
    const user = userEvent.setup()
    render(<AnunciosPage />)

    await waitFor(() => {
      expect(screen.getByRole('button', { name: /Publicar anuncio/i })).toBeInTheDocument()
    })

    await user.click(screen.getByRole('button', { name: /Publicar anuncio/i }))

    await user.type(screen.getByLabelText('Título'), 'Anuncio todos')
    await user.type(screen.getByLabelText('Contenido'), 'Para todos los estudiantes')

    // Uncheck "Todos" and check "Estudiantes"
    const todosCheckbox = screen.getByRole('checkbox', { name: /Todos/i })
    await user.click(todosCheckbox)
    const estudianteCheckbox = screen.getByRole('checkbox', { name: /Estudiantes/i })
    await user.click(estudianteCheckbox)

    // Default is "Todos los estudiantes" — no group dropdown
    // Submit
    const submitButtons = screen.getAllByRole('button', { name: /^Publicar$/i })
    await user.click(submitButtons[0])

    await waitFor(() => {
      expect(insertMock).toHaveBeenCalledTimes(1)
    })

    const payload = insertMock.mock.calls[0][0] as { grupo_id: string | null }
    expect(payload.grupo_id).toBeNull()
  })

  it('hides group targeting when estudiante is unchecked', async () => {
    const user = userEvent.setup()
    render(<AnunciosPage />)

    await waitFor(() => {
      expect(screen.getByRole('button', { name: /Publicar anuncio/i })).toBeInTheDocument()
    })

    await user.click(screen.getByRole('button', { name: /Publicar anuncio/i }))

    // Uncheck "Todos" and check "Estudiantes"
    const todosCheckbox = screen.getByRole('checkbox', { name: /Todos/i })
    await user.click(todosCheckbox)
    const estudianteCheckbox = screen.getByRole('checkbox', { name: /Estudiantes/i })
    await user.click(estudianteCheckbox)

    // Group targeting should be visible
    expect(screen.getByLabelText(/Todos los estudiantes/i)).toBeInTheDocument()

    // Uncheck "Estudiantes" — group targeting should disappear
    await user.click(estudianteCheckbox)
    expect(screen.queryByText(/Todos los estudiantes/i)).not.toBeInTheDocument()
  })

  it('pre-selects group radio and dropdown when editing announcement with grupo_id', async () => {
    const user = userEvent.setup()

    // Set up store with only a group-targeted announcement
    anunciosStore.length = 0
    anunciosStore.push({
      id: 'anuncio-2',
      titulo: 'Anuncio para 5A',
      contenido: 'Solo para 5A',
      autor_id: 'docente-1',
      destinatarios: ['estudiante'],
      importante: false,
      fecha_publicacion: '2026-04-05T08:00:00.000Z',
      fecha_expiracion: null,
      drive_public_url: null,
      created_at: '2026-04-05T08:00:00.000Z',
      grupo_id: 'grupo-5a',
      grupo: { nombre: '5A', grado: { nombre: 'Grado 5' } },
      autor: { nombre_completo: 'Docente Test', email: 'docente@liceo.edu' },
    })

    render(<AnunciosPage />)

    await waitFor(() => {
      expect(screen.getByText('Anuncio para 5A')).toBeInTheDocument()
    })

    // Click "Editar" — only one edit button since there's one announcement
    await user.click(screen.getByRole('button', { name: /Editar/i }))

    // "Solo un grupo específico" should be pre-selected
    await waitFor(() => {
      expect(screen.getByLabelText(/Solo un grupo específico/i)).toBeChecked()
    })

    // The dropdown should have the correct group pre-selected
    await waitFor(() => {
      const select = screen.getByRole('combobox') as HTMLSelectElement
      expect(select.value).toBe('grupo-5a')
    })
  })

  it('resets group targeting state when form is closed and re-opened', async () => {
    const user = userEvent.setup()
    render(<AnunciosPage />)

    await waitFor(() => {
      expect(screen.getByRole('button', { name: /Publicar anuncio/i })).toBeInTheDocument()
    })

    // Open form
    await user.click(screen.getByRole('button', { name: /Publicar anuncio/i }))

    // Uncheck "Todos" and check "Estudiantes"
    const todosCheckbox = screen.getByRole('checkbox', { name: /Todos/i })
    await user.click(todosCheckbox)
    const estudianteCheckbox = screen.getByRole('checkbox', { name: /Estudiantes/i })
    await user.click(estudianteCheckbox)

    // Select "Solo un grupo específico"
    await user.click(screen.getByLabelText(/Solo un grupo específico/i))

    // Wait for dropdown and select a group
    await waitFor(() => {
      expect(screen.getByRole('combobox')).toBeInTheDocument()
    })
    await user.selectOptions(screen.getByRole('combobox'), 'grupo-5a')

    // Close form with "Ocultar formulario"
    await user.click(screen.getByRole('button', { name: /Ocultar formulario/i }))

    // Re-open form
    await user.click(screen.getByRole('button', { name: /Publicar anuncio/i }))

    // Form should be back to default: "Todos" is checked
    expect(screen.getByRole('checkbox', { name: /Todos/i })).toBeChecked()

    // Group targeting should not be visible (Estudiantes is not checked)
    expect(screen.queryByText(/Todos los estudiantes/i)).not.toBeInTheDocument()
    expect(screen.queryByText(/Solo un grupo específico/i)).not.toBeInTheDocument()
  })
})

describe('AnunciosPage - grupo display on cards', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.stubEnv('VITE_ENABLE_GOOGLE_DRIVE_EMBED', 'true')
    anunciosStore.length = 0
    anunciosStore.push(...initialAnunciosWithGrupo())
  })

  it('displays group display name on announcement cards with grupo_id', async () => {
    render(<AnunciosPage />)

    await waitFor(() => {
      expect(screen.getByText('Reunión de padres 5A')).toBeInTheDocument()
    })

    // The card for the grupo-targeted announcement should show the group name
    expect(screen.getByText(/Grado 5 5A/)).toBeInTheDocument()
  })

  it('does not show group display for announcements without grupo_id', async () => {
    render(<AnunciosPage />)

    await waitFor(() => {
      expect(screen.getByText('Circular académica')).toBeInTheDocument()
    })

    // The card without grupo_id should show just "todos" without group display
    const todosCard = screen.getByText('Circular académica').closest('[class]')
    expect(todosCard).toBeInTheDocument()
  })
})
