import { act, render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { forwardRef, useEffect, useImperativeHandle } from 'react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import NotasPage from '@/pages/NotasPage'

const insertMock = vi.fn()
const updateMock = vi.fn()
const profileMock = {
  id: 'docente-1',
  rol: 'docente',
  email: 'docente@liceo.edu',
  nombre_completo: 'Docente Test',
  activo: true,
}

const latestCalculatorData = {
  results: {
    averages: { A: 75, P: 80, C: 90 },
    weighted: { A: 7.5, P: 32, C: 45 },
    final: 84.5,
    total: 84.5,
  },
  grades: {
    A: [75],
    P: [80],
    C: [90],
  },
  rubrics: {
    A: ['Actitud'],
    P: ['Proceso'],
    C: ['Concepto'],
  },
  weights: { A: 10, P: 40, C: 50 },
}

function createBuilder(table: string) {
  let op: 'select' | 'insert' | 'update' | 'delete' = 'select'
  let payload: unknown = null

  const buildResult = (single = false) => {
    if (table === 'periodos') {
      return {
        data: [
          {
            id: 'periodo-1',
            nombre: 'Periodo 1',
            numero: 1,
            año_academico: 2026,
            fecha_inicio: '2026-01-01',
            fecha_fin: '2026-03-31',
          },
        ],
        error: null,
      }
    }

    if (table === 'asignaciones_docentes') {
      return {
        data: [
          {
            grupo_id: 'grupo-1',
            asignatura_id: 'asig-1',
            grupo: {
              id: 'grupo-1',
              nombre: 'A',
              grado_id: 'grado-1',
              grado: { nombre: '6A' },
            },
            asignatura: {
              id: 'asig-1',
              nombre: 'Matemáticas',
              codigo: 'MAT',
            },
          },
        ],
        error: null,
      }
    }

    if (table === 'estudiantes_grupos') {
      return {
        data: [
          {
            grupo_id: 'grupo-1',
            estudiante: {
              id: 'est-1',
              nombre_completo: 'Estudiante Uno',
              email: 'est1@liceo.edu',
            },
          },
        ],
        error: null,
      }
    }

    if (table === 'notas') {
      if (op === 'insert') {
        const inserted = payload as Record<string, unknown>
        return {
          data: single ? { id: 'nota-1', ...inserted } : [{ id: 'nota-1', ...inserted }],
          error: null,
        }
      }

      if (op === 'update') {
        const updated = payload as Record<string, unknown>
        return {
          data: single ? { id: 'nota-1', ...updated } : [{ id: 'nota-1', ...updated }],
          error: null,
        }
      }

      return { data: [], error: null }
    }

    return { data: [], error: null }
  }

  const builder = {
    select: vi.fn().mockReturnThis(),
    eq: vi.fn().mockReturnThis(),
    in: vi.fn().mockReturnThis(),
    neq: vi.fn().mockReturnThis(),
    limit: vi.fn().mockReturnThis(),
    order: vi.fn().mockReturnThis(),
    returns: vi.fn().mockReturnThis(),
    single: vi.fn().mockImplementation(async () => buildResult(true)),
    insert: vi.fn().mockImplementation((data: unknown) => {
      op = 'insert'
      payload = data
      insertMock(data)
      return builder
    }),
    update: vi.fn().mockImplementation((data: unknown) => {
      op = 'update'
      payload = data
      updateMock(data)
      return builder
    }),
    delete: vi.fn().mockImplementation(() => {
      op = 'delete'
      return builder
    }),
    then: (resolve: (value: unknown) => unknown, reject?: (reason: unknown) => unknown) =>
      Promise.resolve(buildResult(false)).then(resolve, reject),
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

vi.mock('@/components/ui/select', async () => {
  const React = await import('react')

  type SelectContextValue = {
    value?: string
    onValueChange?: (value: string) => void
  }

  const SelectContext = React.createContext<SelectContextValue>({})

  return {
    Select: ({ value, onValueChange, children }: { value?: string; onValueChange?: (value: string) => void; children: unknown }) => (
      <SelectContext.Provider value={{ value, onValueChange }}>{children as any}</SelectContext.Provider>
    ),
    SelectTrigger: ({ children, className }: { children: unknown; className?: string }) => {
      return <div className={className}>{children as any}</div>
    },
    SelectContent: ({ children }: { children: unknown }) => <div>{children as any}</div>,
    SelectItem: ({ value, children }: { value: string; children: unknown }) => {
      const ctx = React.useContext(SelectContext)
      return (
        <button
          type="button"
          data-testid={`mock-select-item-${value}`}
          onClick={() => ctx.onValueChange?.(value)}
        >
          {children as any}
        </button>
      )
    },
    SelectValue: ({ placeholder }: { placeholder?: string }) => <span>{placeholder ?? 'Selecciona'}</span>,
  }
})

vi.mock('@/components/calculator/GradeCalculator', () => {
  const MockGradeCalculator = forwardRef<
    { getLatestData: () => typeof latestCalculatorData },
    { onResultsChange?: (results: typeof latestCalculatorData.results) => void }
  >(({ onResultsChange }, ref) => {
    useImperativeHandle(ref, () => ({
      getLatestData: () => latestCalculatorData,
    }))

    useEffect(() => {
      onResultsChange?.(latestCalculatorData.results)
    }, [onResultsChange])

    return (
      <button
        type="button"
        data-testid="mock-recalculate"
        onClick={() => {
          latestCalculatorData.results = {
            averages: { A: 90, P: 95, C: 100 },
            weighted: { A: 9, P: 38, C: 50 },
            final: 97,
            total: 97,
          }
          latestCalculatorData.grades = { A: [90], P: [95], C: [100] }
          latestCalculatorData.rubrics = {
            A: ['Actitud actualizada'],
            P: ['Proceso actualizado'],
            C: ['Concepto actualizado'],
          }
        }}
      >
        Recalcular
      </button>
    )
  })

  MockGradeCalculator.displayName = 'MockGradeCalculator'

  return {
    GradeCalculator: MockGradeCalculator,
  }
})

describe('NotasPage - guardado inmediato tras edición', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    latestCalculatorData.results = {
      averages: { A: 75, P: 80, C: 90 },
      weighted: { A: 7.5, P: 32, C: 45 },
      final: 84.5,
      total: 84.5,
    }
    latestCalculatorData.grades = { A: [75], P: [80], C: [90] }
    latestCalculatorData.rubrics = {
      A: ['Actitud'],
      P: ['Proceso'],
      C: ['Concepto'],
    }
    vi.stubGlobal('alert', vi.fn())
    vi.stubGlobal('confirm', vi.fn(() => true))
  })

  it('usa getLatestData al guardar y persiste observaciones con datos actualizados', async () => {
    const user = userEvent.setup()

    render(<NotasPage />)

    await waitFor(() => {
      expect(screen.getByRole('button', { name: /Registrar Nota/i })).toBeInTheDocument()
    })

    await user.click(screen.getByRole('button', { name: /Registrar Nota/i }))

    const grupoButtons = await screen.findAllByTestId('mock-select-item-grupo-1')
    await user.click(grupoButtons[0])

    await waitFor(() => {
      expect(screen.getAllByTestId('mock-select-item-asig-1').length).toBeGreaterThan(0)
    })
    const asignaturaButtons = screen.getAllByTestId('mock-select-item-asig-1')
    await user.click(asignaturaButtons[0])

    const estudianteButtons = await screen.findAllByTestId('mock-select-item-est-1')
    await user.click(estudianteButtons[0])

    await waitFor(() => {
      expect(screen.getByTestId('mock-recalculate')).toBeInTheDocument()
    })

    await act(async () => {
      latestCalculatorData.results = {
        averages: { A: 80, P: 85, C: 90 },
        weighted: { A: 8, P: 34, C: 45 },
        final: 87,
        total: 87,
      }
      latestCalculatorData.grades = { A: [80], P: [85], C: [90] }
      latestCalculatorData.rubrics = {
        A: ['Actitud 80'],
        P: ['Proceso 85'],
        C: ['Concepto 90'],
      }
    })

    await user.click(screen.getByRole('button', { name: /Guardar Nota/i }))

    await waitFor(() => {
      expect(insertMock).toHaveBeenCalledTimes(1)
    })

    const payload = insertMock.mock.calls[0][0] as { nota: number; observaciones: string }
    const observaciones = JSON.parse(payload.observaciones)

    expect(payload.nota).toBe(87)
    expect(observaciones.actitudinal.ponderacion).toBe(8)
    expect(observaciones.procedimental.ponderacion).toBe(34)
    expect(observaciones.cognitiva.ponderacion).toBe(45)
    expect(observaciones.cognitiva.rubrica[0]).toBe('Concepto 90')
    expect(updateMock).not.toHaveBeenCalled()
  })
})
