import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import MensajesPage from '@/pages/MensajesPage'

type MessageQuery = {
  filters: Map<string, unknown>
  range: [number, number] | null
}

const { authState, messageFixture, messageQueries, profileFixture } = vi.hoisted(() => ({
  authState: {
    profile: { id: 'user-1', rol: 'docente', email: 'docente@example.test', nombre_completo: 'Docente Test', activo: true },
  },
  messageFixture: { totalCount: 25, failNextQuery: false },
  profileFixture: {
    items: [
      { id: 'user-1', nombre_completo: 'Docente Test', email: 'docente@example.test', rol: 'docente' },
      { id: 'peer-1', nombre_completo: 'Remitente de prueba', email: 'sender@example.test', rol: 'estudiante' },
      { id: 'peer-2', nombre_completo: 'Destinatario de prueba', email: 'recipient@example.test', rol: 'docente' },
    ],
  },
  messageQueries: [] as Array<{ filters: Map<string, unknown>; range: [number, number] | null }>,
}))

function createBuilder(table: string) {
  const query: MessageQuery = { filters: new Map(), range: null }
  const builder = {
    select: vi.fn().mockReturnThis(),
    order: vi.fn().mockReturnThis(),
    eq: vi.fn((column: string, value: unknown) => {
      query.filters.set(column, value)
      return builder
    }),
    gte: vi.fn((column: string, value: unknown) => {
      query.filters.set(`gte:${column}`, value)
      return builder
    }),
    lt: vi.fn((column: string, value: unknown) => {
      query.filters.set(`lt:${column}`, value)
      return builder
    }),
    range: vi.fn((from: number, to: number) => {
      query.range = [from, to]
      return builder
    }),
    then: (resolve: (value: unknown) => unknown, reject?: (reason: unknown) => unknown) => {
      const shouldFail = table === 'mensajes' && messageFixture.failNextQuery
      if (table === 'mensajes') {
        messageQueries.push(query)
        messageFixture.failNextQuery = false
      }
      const offset = query.range?.[0] ?? 0
      const count = table === 'mensajes' ? messageFixture.totalCount : null
      const pageEnd = query.range?.[1] ?? offset
      const data = table === 'mensajes'
        ? Array.from({ length: Math.max(0, Math.min(pageEnd + 1, count ?? 0) - offset) }, (_, index) => {
          const messageNumber = offset + index + 1
          return {
            id: `message-${messageNumber}`,
            remitente_id: 'other-user',
            destinatario_id: 'user-1',
            asunto: index === 0
              ? `Mensaje página ${Math.floor((messageNumber - 1) / 20) + 1}`
              : `Mensaje ${messageNumber}`,
            contenido: `Contenido de prueba ${messageNumber}`,
            estado: 'leido',
            leido_en: null,
            created_at: '2026-03-15T12:00:00.000Z',
            remitente: { nombre_completo: 'Remitente', email: 'sender@example.test' },
            destinatario: { nombre_completo: 'Destinatario', email: 'receiver@example.test' },
          }
        })
        : table === 'profiles'
          ? profileFixture.items
          : []

      return Promise.resolve({ data, error: shouldFail ? new Error('Query failed') : null, count }).then(resolve, reject)
    },
  }

  return builder
}

vi.mock('@/lib/supabase', () => ({
  supabase: { from: vi.fn((table: string) => createBuilder(table)) },
}))

vi.mock('@/lib/auth-store', () => ({
  useAuthStore: () => ({ profile: authState.profile }),
}))

function renderPage() {
  return render(
    <MemoryRouter>
      <MensajesPage />
    </MemoryRouter>,
  )
}

describe('MensajesPage list controls', () => {
  beforeEach(() => {
    Object.defineProperty(HTMLElement.prototype, 'scrollIntoView', {
      configurable: true,
      value: vi.fn(),
    })
    Object.defineProperty(HTMLElement.prototype, 'hasPointerCapture', {
      configurable: true,
      value: () => false,
    })
    Object.defineProperty(HTMLElement.prototype, 'setPointerCapture', {
      configurable: true,
      value: vi.fn(),
    })
    Object.defineProperty(HTMLElement.prototype, 'releasePointerCapture', {
      configurable: true,
      value: vi.fn(),
    })
    authState.profile = {
      id: 'user-1',
      rol: 'docente',
      email: 'docente@example.test',
      nombre_completo: 'Docente Test',
      activo: true,
    }
    messageQueries.length = 0
    messageFixture.totalCount = 25
    messageFixture.failNextQuery = false
    profileFixture.items = [
      { id: 'user-1', nombre_completo: 'Docente Test', email: 'docente@example.test', rol: 'docente' },
      { id: 'peer-1', nombre_completo: 'Remitente de prueba', email: 'sender@example.test', rol: 'estudiante' },
      { id: 'peer-2', nombre_completo: 'Destinatario de prueba', email: 'recipient@example.test', rol: 'docente' },
    ]
  })

  it('filters received and sent messages by the current user and inclusive dates', async () => {
    const user = userEvent.setup()
    renderPage()

    await waitFor(() => expect(messageQueries.length).toBeGreaterThan(0))
    expect(messageQueries.at(-1)?.filters.get('destinatario_id')).toBe('user-1')

    fireEvent.change(screen.getByLabelText('Desde'), { target: { value: '2026-03-15' } })
    fireEvent.change(screen.getByLabelText('Hasta'), { target: { value: '2026-03-20' } })

    await waitFor(() => {
      const filteredQuery = messageQueries.at(-1)
      expect(filteredQuery?.filters.get('gte:created_at')).toBe(new Date(2026, 2, 15).toISOString())
      expect(filteredQuery?.filters.get('lt:created_at')).toBe(new Date(2026, 2, 21).toISOString())
    })

    await user.click(screen.getByRole('button', { name: /enviados/i }))
    await waitFor(() => expect(messageQueries.at(-1)?.filters.get('remitente_id')).toBe('user-1'))
    expect(messageQueries.at(-1)?.filters.get('gte:created_at')).toBe(new Date(2026, 2, 15).toISOString())
    expect(messageQueries.at(-1)?.filters.get('lt:created_at')).toBe(new Date(2026, 2, 21).toISOString())
  })

  it('uses server-side page ranges and disables navigation at both boundaries', async () => {
    const user = userEvent.setup()
    renderPage()

    await screen.findByText('Mensaje página 1')
    expect(screen.getByRole('button', { name: 'Anterior' })).toBeDisabled()
    expect(screen.getByRole('button', { name: 'Siguiente' })).toBeEnabled()
    expect(screen.getByText('Página 1 de 2')).toBeInTheDocument()
    expect(messageQueries.at(-1)?.range).toEqual([0, 19])

    await user.click(screen.getByRole('button', { name: 'Siguiente' }))
    await screen.findByText('Mensaje página 2')
    expect(messageQueries.at(-1)?.range).toEqual([20, 39])
    expect(screen.getAllByRole('button', { name: /Mensaje/ })).toHaveLength(5)
    expect(screen.getByText('Página 2 de 2')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Anterior' })).toBeEnabled()
    expect(screen.getByRole('button', { name: 'Siguiente' })).toBeDisabled()
  })

  it('clamps to a valid page after the matching result count shrinks while refreshing a later page', async () => {
    const user = userEvent.setup()
    renderPage()

    await screen.findByText('Mensaje página 1')
    await user.click(screen.getByRole('button', { name: 'Siguiente' }))
    await screen.findByText('Mensaje página 2')

    messageFixture.totalCount = 5
    await user.click(screen.getByRole('button', { name: 'Actualizar' }))

    expect(await screen.findByText('Página 1 de 1')).toBeInTheDocument()
    expect(await screen.findByText('Mensaje página 1')).toBeInTheDocument()
    expect(messageQueries.at(-1)?.range).toEqual([0, 19])
  })

  it('clears the selected detail when a result-count shrink clamps a later page', async () => {
    const user = userEvent.setup()
    renderPage()

    await screen.findByText('Mensaje página 1')
    await user.click(screen.getByRole('button', { name: 'Siguiente' }))
    await screen.findByText('Mensaje página 2')
    await user.click(screen.getAllByRole('button', { name: /Mensaje página 2/ })[0])
    expect(await screen.findByText('Contenido de prueba 21')).toBeVisible()

    messageFixture.totalCount = 5
    await user.click(screen.getByRole('button', { name: 'Actualizar' }))

    expect(await screen.findByText('Página 1 de 1')).toBeInTheDocument()
    expect(await screen.findByText('Mensaje página 1')).toBeInTheDocument()
    expect(screen.queryByText('Vista previa del mensaje seleccionado')).not.toBeInTheDocument()
    expect(screen.queryByText('Contenido de prueba 21')).not.toBeInTheDocument()
    expect(messageQueries.at(-1)?.range).toEqual([0, 19])
  })

  it('filters each tab by its counterpart, combines inclusive dates, resets pages, and clears the filter', async () => {
    const user = userEvent.setup()
    renderPage()
    await screen.findByText('Mensaje página 1')

    fireEvent.change(screen.getByLabelText('Desde'), { target: { value: '2026-03-15' } })
    fireEvent.change(screen.getByLabelText('Hasta'), { target: { value: '2026-03-20' } })
    await waitFor(() => expect(messageQueries.at(-1)?.filters.get('lt:created_at')).toBe(new Date(2026, 2, 21).toISOString()))
    await user.click(screen.getByRole('button', { name: 'Siguiente' }))
    await screen.findByText('Mensaje página 2')
    await user.click(screen.getAllByRole('button', { name: /Mensaje página 2/ })[0])
    expect(await screen.findByText('Vista previa del mensaje seleccionado')).toBeVisible()

    await user.click(screen.getByRole('combobox', { name: 'Remitente' }))
    await user.click(await screen.findByRole('option', { name: 'Remitente de prueba' }))
    await waitFor(() => {
      const query = messageQueries.at(-1)
      expect(query?.filters.get('destinatario_id')).toBe('user-1')
      expect(query?.filters.get('remitente_id')).toBe('peer-1')
      expect(query?.filters.get('gte:created_at')).toBe(new Date(2026, 2, 15).toISOString())
      expect(query?.filters.get('lt:created_at')).toBe(new Date(2026, 2, 21).toISOString())
      expect(query?.range).toEqual([0, 19])
    })
    expect(screen.getByText('Página 1 de 2')).toBeInTheDocument()
    expect(screen.queryByText('Vista previa del mensaje seleccionado')).not.toBeInTheDocument()

    await user.click(screen.getByRole('combobox', { name: 'Remitente' }))
    await user.click(await screen.findByRole('option', { name: 'Todos' }))
    await waitFor(() => {
      const query = messageQueries.at(-1)
      expect(query?.filters.has('remitente_id')).toBe(false)
      expect(query?.range).toEqual([0, 19])
    })

    await user.click(screen.getByRole('button', { name: /enviados/i }))
    expect(await screen.findByRole('combobox', { name: 'Destinatario' })).toBeInTheDocument()
    await user.click(screen.getByRole('combobox', { name: 'Destinatario' }))
    await user.click(await screen.findByRole('option', { name: 'Destinatario de prueba' }))
    await waitFor(() => {
      const query = messageQueries.at(-1)
      expect(query?.filters.get('remitente_id')).toBe('user-1')
      expect(query?.filters.get('destinatario_id')).toBe('peer-2')
      expect(query?.filters.get('gte:created_at')).toBe(new Date(2026, 2, 15).toISOString())
      expect(query?.filters.get('lt:created_at')).toBe(new Date(2026, 2, 21).toISOString())
      expect(query?.range).toEqual([0, 19])
    })

    await user.click(screen.getByRole('combobox', { name: 'Destinatario' }))
    await user.click(await screen.findByRole('option', { name: 'Todos' }))
    await waitFor(() => {
      const query = messageQueries.at(-1)
      expect(query?.filters.has('destinatario_id')).toBe(false)
      expect(query?.filters.get('remitente_id')).toBe('user-1')
      expect(query?.range).toEqual([0, 19])
    })
  })

  it('shows the empty state and a single-page boundary when there are no matching messages', async () => {
    messageFixture.totalCount = 0
    renderPage()

    expect(await screen.findByText('No hay mensajes en esta bandeja.')).toBeVisible()
    expect(screen.getByText('Página 1 de 1')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Anterior' })).toBeDisabled()
    expect(screen.getByRole('button', { name: 'Siguiente' })).toBeDisabled()
    expect(messageQueries.at(-1)?.range).toEqual([0, 19])
  })

  it('preserves selecting a message into its detail view', async () => {
    const user = userEvent.setup()
    renderPage()

    await screen.findByText('Mensaje página 1')
    await user.click(screen.getAllByRole('button', { name: /Mensaje página 1/ })[0])

    expect(await screen.findByText('Vista previa del mensaje seleccionado')).toBeVisible()
    expect(screen.getByText('Contenido de prueba 1')).toBeVisible()
  })

  it('clears old rows, count, and selected detail when a changed-filter query fails', async () => {
    const user = userEvent.setup()
    renderPage()

    await screen.findByText('Mensaje página 1')
    await user.click(screen.getAllByRole('button', { name: /Mensaje página 1/ })[0])
    expect(await screen.findByText('Contenido de prueba 1')).toBeVisible()
    expect(screen.getByText('Página 1 de 2')).toBeInTheDocument()

    messageFixture.failNextQuery = true
    fireEvent.change(screen.getByLabelText('Desde'), { target: { value: '2026-03-16' } })

    expect(await screen.findByText('Error al cargar los mensajes')).toBeVisible()
    expect(messageQueries.at(-1)?.filters.get('gte:created_at')).toBe(new Date(2026, 2, 16).toISOString())
    expect(screen.queryByText('Mensaje página 1')).not.toBeInTheDocument()
    expect(screen.queryByText('Contenido de prueba 1')).not.toBeInTheDocument()
    expect(screen.queryByText('Vista previa del mensaje seleccionado')).not.toBeInTheDocument()
    expect(screen.getByText('Página 1 de 1')).toBeInTheDocument()
  })

  it('preserves the current rows, count, and selected detail when a same-filter refresh fails', async () => {
    const user = userEvent.setup()
    renderPage()

    await screen.findByText('Mensaje página 1')
    await user.click(screen.getAllByRole('button', { name: /Mensaje página 1/ })[0])
    expect(await screen.findByText('Contenido de prueba 1')).toBeVisible()

    messageFixture.failNextQuery = true
    await user.click(screen.getByRole('button', { name: 'Actualizar' }))

    expect(await screen.findByText('Error al cargar los mensajes')).toBeVisible()
    expect(screen.getAllByText('Mensaje página 1')).toHaveLength(2)
    expect(screen.getByText('Contenido de prueba 1')).toBeInTheDocument()
    expect(screen.getByText('Vista previa del mensaje seleccionado')).toBeInTheDocument()
    expect(screen.getByText('Página 1 de 2')).toBeInTheDocument()
  })

  it('resets pagination when date, tab, or profile changes', async () => {
    const user = userEvent.setup()
    const view = renderPage()
    await screen.findByText('Mensaje página 1')
    await user.click(screen.getByRole('button', { name: 'Siguiente' }))
    await screen.findByText('Mensaje página 2')

    fireEvent.change(screen.getByLabelText('Desde'), { target: { value: '2026-03-01' } })
    await waitFor(() => expect(messageQueries.at(-1)?.range).toEqual([0, 19]))
    await user.click(screen.getByRole('button', { name: 'Siguiente' }))
    await screen.findByText('Mensaje página 2')

    await user.click(screen.getByRole('button', { name: /enviados/i }))
    await waitFor(() => expect(messageQueries.at(-1)?.range).toEqual([0, 19]))
    await user.click(screen.getByRole('button', { name: 'Siguiente' }))
    await screen.findByText('Mensaje página 2')

    authState.profile = { ...authState.profile, id: 'user-2' }
    view.rerender(
      <MemoryRouter>
        <MensajesPage />
      </MemoryRouter>,
    )
    await waitFor(() => {
      expect(messageQueries.at(-1)?.range).toEqual([0, 19])
      expect(messageQueries.at(-1)?.filters.get('remitente_id')).toBe('user-2')
    })
  })

  it('shows a validation message and does not query for a reversed date range', async () => {
    renderPage()
    await waitFor(() => expect(messageQueries.length).toBeGreaterThan(0))
    const queryCount = messageQueries.length

    fireEvent.change(screen.getByLabelText('Desde'), { target: { value: '2026-03-20' } })
    fireEvent.change(screen.getByLabelText('Hasta'), { target: { value: '2026-03-10' } })

    expect(await screen.findByText('La fecha Desde no puede ser posterior a Hasta.')).toBeVisible()
    expect(messageQueries).toHaveLength(queryCount + 1)
  })
})
