import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import MensajesPage from '@/pages/MensajesPage'

const { authState, insertedMessages, profileFixture } = vi.hoisted(() => ({
  authState: {
    profile: {
      id: 'user-1',
      rol: 'docente',
      email: 'docente@example.test',
      nombre_completo: 'Docente Test',
      titulo_profesional: null as string | null,
      activo: true,
    },
  },
  insertedMessages: [] as Array<Record<string, unknown>>,
  profileFixture: {
    items: [
      {
        id: 'user-1',
        nombre_completo: 'Docente Test',
        email: 'docente@example.test',
        rol: 'docente',
      },
      {
        id: 'peer-1',
        nombre_completo: 'Remitente de prueba',
        email: 'sender@example.test',
        rol: 'estudiante',
      },
      {
        id: 'peer-2',
        nombre_completo: 'Colega Docente',
        email: 'colleague@example.test',
        rol: 'docente',
      },
    ],
  },
}))

function createBuilder(table: string) {
  const builder = {
    select: vi.fn().mockReturnThis(),
    order: vi.fn().mockReturnThis(),
    eq: vi.fn().mockReturnThis(),
    gte: vi.fn().mockReturnThis(),
    lt: vi.fn().mockReturnThis(),
    range: vi.fn().mockReturnThis(),
    in: vi.fn().mockReturnThis(),
    insert: vi.fn((payload: Record<string, unknown> | Record<string, unknown>[]) => {
      if (table === 'mensajes') {
        insertedMessages.push(...(Array.isArray(payload) ? payload : [payload]))
      }
      return Promise.resolve({ data: null, error: null })
    }),
    update: vi.fn().mockReturnThis(),
    then: (resolve: (value: unknown) => unknown, reject?: (reason: unknown) => unknown) => {
      const data =
        table === 'mensajes'
          ? []
          : table === 'profiles'
            ? profileFixture.items
            : []
      return Promise.resolve({ data, error: null, count: null }).then(resolve, reject)
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

async function composeAndSend(recipientName = 'Remitente de prueba') {
  const user = userEvent.setup({ pointerEventsCheck: 0 })

  const recipientTrigger = screen
    .getByText('Selecciona un destinatario')
    .closest('button') as HTMLButtonElement
  await user.click(recipientTrigger)

  const recipientOption = await screen.findByText(recipientName)
  await user.click(recipientOption)

  fireEvent.change(screen.getByPlaceholderText('Escribe tu mensaje aquí...'), {
    target: { value: 'Contenido del mensaje' },
  })

  const [asuntoInput] = screen.getAllByRole('textbox')
  fireEvent.change(asuntoInput, { target: { value: 'Asunto de prueba' } })

  await user.click(screen.getByRole('button', { name: 'Enviar' }))
}

describe('MensajesPage firma institucional', () => {
  beforeEach(() => {
    insertedMessages.length = 0
    authState.profile.rol = 'docente'
    authState.profile.nombre_completo = 'Docente Test'
    authState.profile.titulo_profesional = null
    Object.defineProperty(HTMLElement.prototype, 'scrollIntoView', {
      configurable: true,
      value: vi.fn(),
    })
    Object.defineProperty(HTMLElement.prototype, 'hasPointerCapture', {
      configurable: true,
      value: vi.fn(),
    })
    Object.defineProperty(HTMLElement.prototype, 'releasePointerCapture', {
      configurable: true,
      value: vi.fn(),
    })
    Object.defineProperty(HTMLElement.prototype, 'setPointerCapture', {
      configurable: true,
      value: vi.fn(),
    })
  })

    it('envia la firma con nombre y titulo cuando el remitente es docente', async () => {
        authState.profile.nombre_completo = 'Ximena Patricia Ávila Díaz'
        authState.profile.titulo_profesional = 'Lic. Ciencias Naturales y Educación Ambiental'
        renderPage()

        await composeAndSend()

        await waitFor(() => expect(insertedMessages.length).toBeGreaterThan(0))
        expect(insertedMessages[0]).toMatchObject({
            remitente_id: 'user-1',
            contenido: 'Contenido del mensaje',
            firma:
                'Ximena Patricia Ávila Díaz\nLic. Ciencias Naturales y Educación Ambiental',
        })
    })

    it('envia solo el nombre cuando el docente no tiene titulo profesional', async () => {
        authState.profile.nombre_completo = 'Docente Test'
        renderPage()

        await composeAndSend()

        await waitFor(() => expect(insertedMessages.length).toBeGreaterThan(0))
        expect(insertedMessages[0]).toMatchObject({ firma: 'Docente Test' })
    })

    it('no envia firma cuando el remitente es estudiante', async () => {
        authState.profile.rol = 'estudiante'
        authState.profile.nombre_completo = 'Remitente de prueba'
        authState.profile.titulo_profesional = 'Titulo que no debe usarse'
        renderPage()

        await composeAndSend('Colega Docente')

        await waitFor(() => expect(insertedMessages.length).toBeGreaterThan(0))
        expect(insertedMessages[0]).toMatchObject({ firma: null })
    })

    it('mantiene el contenido del mensaje separado de la firma', async () => {
        authState.profile.titulo_profesional = 'Lic. Ciencias Naturales'
        renderPage()

        await composeAndSend()

        await waitFor(() => expect(insertedMessages.length).toBeGreaterThan(0))
        expect(insertedMessages[0].contenido).toBe('Contenido del mensaje')
        expect(String(insertedMessages[0].firma)).toContain('Lic. Ciencias Naturales')
        expect(String(insertedMessages[0].contenido)).not.toContain('Lic. Ciencias Naturales')
    })
})
