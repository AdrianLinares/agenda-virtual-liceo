import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import MensajesPage from '@/pages/MensajesPage'

type MessageQuery = {
  filters: Map<string, unknown>
  range: [number, number] | null
}

const { authState, messageQueries } = vi.hoisted(() => ({
  authState: {
    profile: { id: 'user-1', rol: 'docente', email: 'docente@example.test', nombre_completo: 'Docente Test', activo: true },
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
      if (table === 'mensajes') messageQueries.push(query)
      const offset = query.range?.[0] ?? 0
      const data = table === 'mensajes'
        ? [{
            id: `message-${offset}`,
            remitente_id: 'other-user',
            destinatario_id: 'user-1',
            asunto: `Mensaje página ${Math.floor(offset / 20) + 1}`,
            contenido: 'Contenido de prueba',
            estado: 'enviado',
            leido_en: null,
            created_at: '2026-03-15T12:00:00.000Z',
            remitente: { nombre_completo: 'Remitente', email: 'sender@example.test' },
            destinatario: { nombre_completo: 'Destinatario', email: 'receiver@example.test' },
          }]
        : []

      return Promise.resolve({ data, error: null, count: table === 'mensajes' ? 25 : null }).then(resolve, reject)
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
    authState.profile = {
      id: 'user-1',
      rol: 'docente',
      email: 'docente@example.test',
      nombre_completo: 'Docente Test',
      activo: true,
    }
    messageQueries.length = 0
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
    expect(screen.getByText('Página 2 de 2')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Anterior' })).toBeEnabled()
    expect(screen.getByRole('button', { name: 'Siguiente' })).toBeDisabled()
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
