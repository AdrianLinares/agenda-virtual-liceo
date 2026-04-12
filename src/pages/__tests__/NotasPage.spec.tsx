import { act, render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { forwardRef, useEffect, useImperativeHandle, type ReactNode } from 'react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import NotasPage, { didObservacionesChange } from '@/pages/NotasPage'

type MockSelectProps = {
  value?: string
  onValueChange?: (value: string) => void
  children: ReactNode
}

type MockSelectTriggerProps = {
  children: ReactNode
  className?: string
}

type MockSelectContentProps = {
  children: ReactNode
}

type MockSelectItemProps = {
  value: string
  children: ReactNode
}

type MockSelectValueProps = {
  placeholder?: string
}

const insertMock = vi.fn()
const updateMock = vi.fn()
const mockNotasStore: Array<{
  id: string
  estudiante_id: string
  asignatura_id: string
  periodo_id: string
  grupo_id: string
  docente_id: string | null
  nota: number
  observaciones: string | null
  created_at: string
}> = []
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
  let selectClause = '*'
  const eqFilters = new Map<string, unknown>()
  const neqFilters = new Map<string, unknown>()

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
      if (op === 'select') {
        if (selectClause.includes('asignatura:asignatura_id')) {
          const data = mockNotasStore.map((nota) => ({
            ...nota,
            asignatura: { nombre: 'Matemáticas', codigo: 'MAT' },
            estudiante: { nombre_completo: 'Estudiante Uno', email: 'est1@liceo.edu' },
            periodo: { nombre: 'Periodo 1', numero: 1 },
            grupo: { nombre: 'A', grado: { nombre: '6A' } },
          }))
          return { data, error: null }
        }

        if (selectClause.includes('nota') && selectClause.includes('observaciones') && eqFilters.has('id')) {
          const id = String(eqFilters.get('id'))
          const nota = mockNotasStore.find((item) => item.id === id) ?? null

          if (!nota) {
            return { data: null, error: null }
          }

          return {
            data: single
              ? { nota: nota.nota, observaciones: nota.observaciones }
              : [{ nota: nota.nota, observaciones: nota.observaciones }],
            error: null,
          }
        }

        if (selectClause === 'id') {
          const matches = mockNotasStore
            .filter((nota) => {
              const estudianteOk = !eqFilters.has('estudiante_id') || nota.estudiante_id === eqFilters.get('estudiante_id')
              const asignaturaOk = !eqFilters.has('asignatura_id') || nota.asignatura_id === eqFilters.get('asignatura_id')
              const periodoOk = !eqFilters.has('periodo_id') || nota.periodo_id === eqFilters.get('periodo_id')
              const neqIdOk = !neqFilters.has('id') || nota.id !== neqFilters.get('id')

              return estudianteOk && asignaturaOk && periodoOk && neqIdOk
            })
            .map((nota) => ({ id: nota.id }))

          return {
            data: single ? matches[0] ?? null : matches,
            error: null,
          }
        }

        return { data: [], error: null }
      }

      if (op === 'insert') {
        const inserted = payload as Record<string, unknown>
        const record = {
          id: `nota-${mockNotasStore.length + 1}`,
          estudiante_id: String(inserted.estudiante_id),
          asignatura_id: String(inserted.asignatura_id),
          periodo_id: String(inserted.periodo_id),
          grupo_id: String(inserted.grupo_id),
          docente_id: String(inserted.docente_id),
          nota: Number(inserted.nota),
          observaciones: String(inserted.observaciones),
          created_at: '2026-01-10T00:00:00.000Z',
        }
        mockNotasStore.push(record)

        return {
          data: single ? record : [record],
          error: null,
        }
      }

      if (op === 'update') {
        const updated = payload as Record<string, unknown>
        const id = String(eqFilters.get('id') ?? '')
        const current = mockNotasStore.find((nota) => nota.id === id)

        if (current) {
          current.estudiante_id = String(updated.estudiante_id ?? current.estudiante_id)
          current.asignatura_id = String(updated.asignatura_id ?? current.asignatura_id)
          current.periodo_id = String(updated.periodo_id ?? current.periodo_id)
          current.grupo_id = String(updated.grupo_id ?? current.grupo_id)
          current.docente_id = String(updated.docente_id ?? current.docente_id)
          current.nota = Number(updated.nota ?? current.nota)
          current.observaciones = String(updated.observaciones ?? current.observaciones)
        }

        const responseData = current
          ? {
            id: current.id,
            estudiante_id: current.estudiante_id,
            asignatura_id: current.asignatura_id,
            periodo_id: current.periodo_id,
            grupo_id: current.grupo_id,
            docente_id: current.docente_id,
            nota: current.nota,
            observaciones: current.observaciones,
          }
          : null

        return {
          data: single ? responseData : responseData ? [responseData] : [],
          error: null,
        }
      }

      return { data: [], error: null }
    }

    return { data: [], error: null }
  }

  const builder = {
    select: vi.fn().mockImplementation((value?: string) => {
      if (typeof value === 'string') {
        selectClause = value
      }
      return builder
    }),
    eq: vi.fn().mockImplementation((column: string, value: unknown) => {
      eqFilters.set(column, value)
      return builder
    }),
    in: vi.fn().mockReturnThis(),
    neq: vi.fn().mockImplementation((column: string, value: unknown) => {
      neqFilters.set(column, value)
      return builder
    }),
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
    Select: ({ value, onValueChange, children }: MockSelectProps) => (
      <SelectContext.Provider value={{ value, onValueChange }}>{children}</SelectContext.Provider>
    ),
    SelectTrigger: ({ children, className }: MockSelectTriggerProps) => {
      return <div className={className}>{children}</div>
    },
    SelectContent: ({ children }: MockSelectContentProps) => <div>{children}</div>,
    SelectItem: ({ value, children }: MockSelectItemProps) => {
      const ctx = React.useContext(SelectContext)
      return (
        <button
          type="button"
          data-testid={`mock-select-item-${value}`}
          onClick={() => ctx.onValueChange?.(value)}
        >
          {children}
        </button>
      )
    },
    SelectValue: ({ placeholder }: MockSelectValueProps) => <span>{placeholder ?? 'Selecciona'}</span>,
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
    mockNotasStore.length = 0
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

  it('actualiza nota editada usando los valores más recientes de la calculadora inline', async () => {
    const user = userEvent.setup()

    const observacionesOriginales = JSON.stringify({
      actitudinal: { promedio: 30, ponderacion: 3, porcentaje: 10, notas: [30], rubrica: ['Original A'] },
      procedimental: { promedio: 30, ponderacion: 12, porcentaje: 40, notas: [30], rubrica: ['Original P'] },
      cognitiva: { promedio: 30, ponderacion: 15, porcentaje: 50, notas: [30], rubrica: ['Original C'] },
    })

    mockNotasStore.push({
      id: 'nota-1',
      estudiante_id: 'est-1',
      asignatura_id: 'asig-1',
      periodo_id: 'periodo-1',
      grupo_id: 'grupo-1',
      docente_id: 'docente-1',
      nota: 30,
      observaciones: observacionesOriginales,
      created_at: '2026-01-10T00:00:00.000Z',
    })

    render(<NotasPage />)

    await waitFor(() => {
      expect(screen.getByRole('button', { name: /Editar/i })).toBeInTheDocument()
    })

    await user.click(screen.getByRole('button', { name: /Editar/i }))

    await waitFor(() => {
      expect(screen.getByRole('button', { name: /Actualizar Nota/i })).toBeInTheDocument()
    })

    await act(async () => {
      latestCalculatorData.results = {
        averages: { A: 38, P: 38, C: 38 },
        weighted: { A: 3.8, P: 15.2, C: 19 },
        final: 38,
        total: 38,
      }
      latestCalculatorData.grades = { A: [38], P: [38], C: [38] }
      latestCalculatorData.rubrics = {
        A: ['Actitud editada'],
        P: ['Proceso editado'],
        C: ['Concepto editado'],
      }
    })

    await user.click(screen.getByRole('button', { name: /Actualizar Nota/i }))

    await waitFor(() => {
      expect(updateMock).toHaveBeenCalledTimes(1)
    })

    const payload = updateMock.mock.calls[0][0] as { nota: number; observaciones: string }
    const observaciones = JSON.parse(payload.observaciones)

    expect(payload.nota).toBe(38)
    expect(observaciones.actitudinal.rubrica[0]).toBe('Actitud editada')
    expect(observaciones.procedimental.rubrica[0]).toBe('Proceso editado')
    expect(observaciones.cognitiva.rubrica[0]).toBe('Concepto editado')
  })
})

describe('didObservacionesChange', () => {
  it('detecta cambios reales en observaciones aunque el orden de claves sea diferente', () => {
    const original = JSON.stringify({
      actitudinal: { notas: [4], porcentaje: 10, rubrica: ['A'] },
      procedimental: { notas: [3], porcentaje: 40, rubrica: ['P'] },
      cognitiva: { notas: [5], porcentaje: 50, rubrica: ['C'] },
    })

    const mismoContenidoDistintoOrden = JSON.stringify({
      cognitiva: { rubrica: ['C'], porcentaje: 50, notas: [5] },
      actitudinal: { rubrica: ['A'], notas: [4], porcentaje: 10 },
      procedimental: { porcentaje: 40, rubrica: ['P'], notas: [3] },
    })

    expect(didObservacionesChange(original, mismoContenidoDistintoOrden)).toBe(false)
  })

  it('detecta cambios cuando cambian notas o rubricas en observaciones', () => {
    const original = JSON.stringify({
      actitudinal: { notas: [4], porcentaje: 10, rubrica: ['A'] },
      procedimental: { notas: [3], porcentaje: 40, rubrica: ['P'] },
      cognitiva: { notas: [5], porcentaje: 50, rubrica: ['C'] },
    })

    const actualizado = JSON.stringify({
      actitudinal: { notas: [4], porcentaje: 10, rubrica: ['A actualizado'] },
      procedimental: { notas: [3], porcentaje: 40, rubrica: ['P'] },
      cognitiva: { notas: [5], porcentaje: 50, rubrica: ['C'] },
    })

    expect(didObservacionesChange(original, actualizado)).toBe(true)
  })
})
