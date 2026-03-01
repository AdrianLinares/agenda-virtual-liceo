import { useEffect, useMemo, useState } from 'react'
import { useAuthStore } from '@/lib/auth-store'
import { supabase } from '@/lib/supabase'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Button } from '@/components/ui/button'
import { AlertCircle, BookOpen, Loader2, TrendingUp, Plus, Pencil, Trash2 } from 'lucide-react'
import { GradeCalculator } from '@/components/calculator/GradeCalculator'
import type { CategoryWeights, GradeResults, GradesData } from '@/types/grades'
import { categoryLabels, type GradeCategory } from '@/types/grades'

const DEFAULT_WEIGHTS: CategoryWeights = {
    A: 10,
    P: 40,
    C: 50,
}

interface Periodo {
    id: string
    nombre: string
    numero: number
    año_academico: number
    fecha_inicio: string
    fecha_fin: string
}

interface Nota {
    id: string
    estudiante_id: string
    asignatura_id: string
    periodo_id: string
    grupo_id: string
    docente_id: string | null
    nota: number
    observaciones: string | null
    created_at: string
    asignatura: {
        nombre: string
        codigo: string | null
    }
    estudiante?: {
        nombre_completo: string
        email: string
    }
    periodo: {
        nombre: string
        numero: number
    }
    grupo: {
        nombre: string
        grado: {
            nombre: string
        }
    }
}

interface ResumenAsignatura {
    nombre: string
    codigo: string | null
    promedio: number
    cantidad: number
}

interface Estudiante {
    id: string
    nombre_completo: string
    email: string
}

interface Grupo {
    id: string
    nombre: string
    grado_id: string
    grado: {
        nombre: string
    }
}

interface Asignatura {
    id: string
    nombre: string
    codigo: string | null
}

interface AsignacionDocente {
    grupo_id: string
    asignatura_id: string
}

export default function NotasPage() {
    const { profile } = useAuthStore()
    const canViewAllNotas = profile?.rol === 'administrador' || profile?.rol === 'administrativo'
    const [periodos, setPeriodos] = useState<Periodo[]>([])
    const [selectedPeriodo, setSelectedPeriodo] = useState<string>('')
    const [notas, setNotas] = useState<Nota[]>([])
    const [loading, setLoading] = useState(false)
    const [error, setError] = useState<string | null>(null)

    // Estados para registro de notas (solo docentes)
    const [showCalculator, setShowCalculator] = useState(false)
    const [grupos, setGrupos] = useState<Grupo[]>([])
    const [asignaturas, setAsignaturas] = useState<Asignatura[]>([])
    const [asignacionesDocente, setAsignacionesDocente] = useState<AsignacionDocente[]>([])
    const [estudiantes, setEstudiantes] = useState<Estudiante[]>([])

    // Filtros de visualización (administrador y administrativo)
    const [viewGrupo, setViewGrupo] = useState<string>('all')
    const [viewAsignatura, setViewAsignatura] = useState<string>('all')
    const [viewEstudiante, setViewEstudiante] = useState<string>('all')

    const [selectedGrupo, setSelectedGrupo] = useState<string>('')
    const [selectedAsignatura, setSelectedAsignatura] = useState<string>('')
    const [selectedEstudiante, setSelectedEstudiante] = useState<string>('')
    const [calculatedResults, setCalculatedResults] = useState<GradeResults | null>(null)
    const [calculatedGrades, setCalculatedGrades] = useState<GradesData | null>(null)
    const [calculatorInitialGrades, setCalculatorInitialGrades] = useState<GradesData | undefined>(undefined)
    const [calculatorInitialWeights, setCalculatorInitialWeights] = useState<CategoryWeights | undefined>(undefined)
    const [calculatorRenderKey, setCalculatorRenderKey] = useState(0)
    const [editingNotaId, setEditingNotaId] = useState<string | null>(null)
    const [saving, setSaving] = useState(false)
    const [deletingNotaId, setDeletingNotaId] = useState<string | null>(null)

    useEffect(() => {
        loadPeriodos()
    }, [])

    useEffect(() => {
        if (selectedPeriodo && profile) {
            loadNotas()
        }
    }, [selectedPeriodo, profile, viewGrupo, viewAsignatura, viewEstudiante])

    // Cargar grupos y asignaturas asignadas al docente
    useEffect(() => {
        if (profile?.rol === 'docente' && showCalculator) {
            loadDocenteAsignaciones()
        }
    }, [profile, showCalculator])

    useEffect(() => {
        if (canViewAllNotas) {
            loadAdminViewOptions()
        }
    }, [canViewAllNotas])

    // Cargar estudiantes del grupo seleccionado
    useEffect(() => {
        if (selectedGrupo) {
            loadEstudiantes()
        }
    }, [selectedGrupo])

    const loadPeriodos = async () => {
        try {
            const { data, error } = await supabase
                .from('periodos')
                .select('*')
                .eq('año_academico', 2026)
                .order('numero', { ascending: true })
                .returns<Periodo[]>()

            if (error) throw error
            setPeriodos(data || [])

            if (data && data.length > 0) {
                setSelectedPeriodo(data[0].id)
            }
        } catch (err) {
            console.error('Error loading periodos:', err)
            setError('Error al cargar los periodos')
        }
    }

    const loadNotas = async () => {
        if (!selectedPeriodo || !profile) return

        setLoading(true)
        setError(null)

        try {
            let query = supabase
                .from('notas')
                .select(`
          *,
          asignatura:asignatura_id (nombre, codigo),
          estudiante:estudiante_id (nombre_completo, email),
          periodo:periodo_id (nombre, numero),
          grupo:grupo_id (nombre, grado:grado_id (nombre))
        `)
                .eq('periodo_id', selectedPeriodo)

            if (profile.rol === 'estudiante') {
                query = query.eq('estudiante_id', profile.id)
            } else if (profile.rol === 'padre') {
                const { data: hijos } = await supabase
                    .from('padres_estudiantes')
                    .select('estudiante_id')
                    .eq('padre_id', profile.id)
                    .returns<Array<{ estudiante_id: string }>>()

                const hijosIds = hijos?.map((h) => h.estudiante_id) || []
                if (hijosIds.length > 0) {
                    query = query.in('estudiante_id', hijosIds)
                }
            } else if (profile.rol === 'docente') {
                const { data: asignaciones, error: asignacionesError } = await supabase
                    .from('asignaciones_docentes')
                    .select('grupo_id, asignatura_id')
                    .eq('docente_id', profile.id)
                    .returns<Array<{ grupo_id: string; asignatura_id: string }>>()

                if (asignacionesError) throw asignacionesError

                const gruposAsignados = Array.from(
                    new Set((asignaciones || []).map((item) => item.grupo_id))
                )
                const asignaturasAsignadas = Array.from(
                    new Set((asignaciones || []).map((item) => item.asignatura_id))
                )

                if (gruposAsignados.length === 0 || asignaturasAsignadas.length === 0) {
                    setNotas([])
                    setLoading(false)
                    return
                }

                query = query.in('grupo_id', gruposAsignados).in('asignatura_id', asignaturasAsignadas)
            }

            if (canViewAllNotas) {
                if (viewGrupo !== 'all') {
                    query = query.eq('grupo_id', viewGrupo)
                }
                if (viewAsignatura !== 'all') {
                    query = query.eq('asignatura_id', viewAsignatura)
                }
                if (viewEstudiante !== 'all') {
                    query = query.eq('estudiante_id', viewEstudiante)
                }
            }

            const { data, error } = await query

            if (error) throw error
            setNotas((data || []) as Nota[])
        } catch (err) {
            console.error('Error loading notas:', err)
            setError('Error al cargar las notas')
        } finally {
            setLoading(false)
        }
    }

    const loadAdminViewOptions = async () => {
        try {
            const [{ data: gruposData, error: gruposError }, { data: asignaturasData, error: asignaturasError }, { data: estudiantesData, error: estudiantesError }] = await Promise.all([
                supabase
                    .from('grupos')
                    .select('id, nombre, grado_id, grado:grado_id (nombre)')
                    .order('nombre', { ascending: true }),
                supabase
                    .from('asignaturas')
                    .select('id, nombre, codigo')
                    .order('nombre', { ascending: true }),
                supabase
                    .from('profiles')
                    .select('id, nombre_completo, email')
                    .eq('rol', 'estudiante')
                    .eq('activo', true)
                    .order('nombre_completo', { ascending: true }),
            ])

            if (gruposError) throw gruposError
            if (asignaturasError) throw asignaturasError
            if (estudiantesError) throw estudiantesError

            setGrupos((gruposData || []) as Grupo[])
            setAsignaturas((asignaturasData || []) as Asignatura[])
            setEstudiantes((estudiantesData || []) as Estudiante[])
        } catch (err) {
            console.error('Error loading admin view options:', err)
            setError('Error al cargar filtros de notas')
        }
    }

    const resumenAsignaturas = useMemo<ResumenAsignatura[]>(() => {
        const map = new Map<string, ResumenAsignatura>()

        notas.forEach((nota) => {
            const key = nota.asignatura?.nombre || 'Sin asignatura'
            const current = map.get(key)
            if (!current) {
                map.set(key, {
                    nombre: nota.asignatura?.nombre || 'Sin asignatura',
                    codigo: nota.asignatura?.codigo || null,
                    promedio: nota.nota,
                    cantidad: 1,
                })
                return
            }
            const total = current.promedio * current.cantidad + nota.nota
            const cantidad = current.cantidad + 1
            map.set(key, {
                ...current,
                cantidad,
                promedio: total / cantidad,
            })
        })

        return Array.from(map.values()).sort((a, b) => a.nombre.localeCompare(b.nombre))
    }, [notas])

    const promedioGeneral = useMemo(() => {
        if (notas.length === 0) return null
        const total = notas.reduce((acc, nota) => acc + nota.nota, 0)
        return total / notas.length
    }, [notas])

    const headerDescription = useMemo(() => {
        if (profile?.rol === 'estudiante') return 'Consulta tus notas parciales por periodo'
        if (profile?.rol === 'padre') return 'Consulta las notas parciales de tus hijos'
        if (profile?.rol === 'docente') return 'Visualiza y registra las notas de tus estudiantes'
        return 'Gestiona y consulta las notas parciales'
    }, [profile?.rol])

    const asignaturasDisponibles = useMemo(() => {
        if (profile?.rol !== 'docente' || !showCalculator) {
            return asignaturas
        }

        if (!selectedGrupo) {
            return []
        }

        const permitidas = new Set(
            asignacionesDocente
                .filter((asignacion) => asignacion.grupo_id === selectedGrupo)
                .map((asignacion) => asignacion.asignatura_id)
        )

        return asignaturas.filter((asignatura) => permitidas.has(asignatura.id))
    }, [asignacionesDocente, asignaturas, profile?.rol, selectedGrupo, showCalculator])

    useEffect(() => {
        if (profile?.rol !== 'docente' || !showCalculator) return

        if (selectedAsignatura && !asignaturasDisponibles.some((asignatura) => asignatura.id === selectedAsignatura)) {
            setSelectedAsignatura('')
        }
    }, [asignaturasDisponibles, profile?.rol, selectedAsignatura, showCalculator])

    const loadDocenteAsignaciones = async () => {
        if (!profile) return

        try {
            const { data: asignaciones, error } = await supabase
                .from('asignaciones_docentes')
                .select(`
                    grupo_id,
                    asignatura_id,
                    grupo:grupo_id (id, nombre, grado_id, grado:grado_id (nombre)),
                    asignatura:asignatura_id (id, nombre, codigo)
                `)
                .eq('docente_id', profile.id)

            if (error) throw error

            // Extraer grupos únicos
            const gruposMap = new Map<string, Grupo>()
            const asignaturasMap = new Map<string, Asignatura>()
            const asignacionesPermitidas: AsignacionDocente[] = []

            asignaciones?.forEach((asig: any) => {
                if (asig.grupo) {
                    gruposMap.set(asig.grupo.id, {
                        id: asig.grupo.id,
                        nombre: asig.grupo.nombre,
                        grado_id: asig.grupo.grado_id,
                        grado: asig.grupo.grado
                    })
                }
                if (asig.asignatura) {
                    asignaturasMap.set(asig.asignatura.id, {
                        id: asig.asignatura.id,
                        nombre: asig.asignatura.nombre,
                        codigo: asig.asignatura.codigo
                    })
                }
                if (asig.grupo_id && asig.asignatura_id) {
                    asignacionesPermitidas.push({
                        grupo_id: asig.grupo_id,
                        asignatura_id: asig.asignatura_id,
                    })
                }
            })

            setAsignacionesDocente(asignacionesPermitidas)
            setGrupos(Array.from(gruposMap.values()))
            setAsignaturas(Array.from(asignaturasMap.values()))
        } catch (err) {
            console.error('Error loading asignaciones:', err)
            setError('Error al cargar las asignaciones del docente')
        }
    }

    const loadEstudiantes = async () => {
        if (!selectedGrupo) return

        try {
            const { data, error } = await supabase
                .from('estudiantes_grupos')
                .select(`
                    estudiante:estudiante_id (
                        id,
                        nombre_completo,
                        email
                    )
                `)
                .eq('grupo_id', selectedGrupo)
                .returns<Array<{ estudiante: Estudiante }>>()

            if (error) throw error

            setEstudiantes((data || []).map(item => item.estudiante).filter(Boolean))
        } catch (err) {
            console.error('Error loading estudiantes:', err)
            setError('Error al cargar los estudiantes del grupo')
        }
    }

    const handleSaveNota = async () => {
        if (!selectedPeriodo || !selectedGrupo || !selectedAsignatura || !selectedEstudiante || !calculatedResults || !profile) {
            setError('Debes completar todos los campos y calcular la nota')
            return
        }

        setSaving(true)
        setError(null)

        try {
            let duplicateQuery = supabase
                .from('notas')
                .select('id')
                .eq('estudiante_id', selectedEstudiante)
                .eq('asignatura_id', selectedAsignatura)
                .eq('periodo_id', selectedPeriodo)
                .limit(1)

            if (editingNotaId) {
                duplicateQuery = duplicateQuery.neq('id', editingNotaId)
            }

            const { data: duplicateNotas, error: duplicateError } = await duplicateQuery
            if (duplicateError) throw duplicateError

            if (duplicateNotas && duplicateNotas.length > 0) {
                setError('Ya existe una nota registrada para este estudiante, asignatura y periodo')
                return
            }

            // Guardar la nota con los detalles de la calculadora en observaciones
            const observaciones = JSON.stringify({
                actitudinal: {
                    promedio: calculatedResults.averages.A,
                    ponderacion: calculatedResults.weighted.A,
                    notas: calculatedGrades?.A || []
                },
                procedimental: {
                    promedio: calculatedResults.averages.P,
                    ponderacion: calculatedResults.weighted.P,
                    notas: calculatedGrades?.P || []
                },
                cognitiva: {
                    promedio: calculatedResults.averages.C,
                    ponderacion: calculatedResults.weighted.C,
                    notas: calculatedGrades?.C || []
                }
            })

            const notaData = {
                estudiante_id: selectedEstudiante,
                asignatura_id: selectedAsignatura,
                periodo_id: selectedPeriodo,
                grupo_id: selectedGrupo,
                docente_id: profile.id,
                nota: calculatedResults.final,
                observaciones
            }

            const { error } = editingNotaId
                ? await (supabase as any)
                    .from('notas')
                    .update(notaData)
                    .eq('id', editingNotaId)
                    .eq('docente_id', profile.id)
                : await supabase
                    .from('notas')
                    .insert(notaData as any)

            if (error) throw error

            // Recargar notas y cerrar modal
            await loadNotas()
            setShowCalculator(false)
            resetCalculatorForm()

            alert(editingNotaId ? 'Nota actualizada exitosamente' : 'Nota guardada exitosamente')
        } catch (err) {
            console.error('Error saving nota:', err)
            const errorObj = err as { code?: string; message?: string; details?: string; constraint?: string }
            const errorCode = errorObj?.code
            const errorText = `${errorObj?.message || ''} ${errorObj?.details || ''} ${errorObj?.constraint || ''}`.toLowerCase()
            if (errorCode === '42501') {
                setError('No tienes permisos para registrar esa combinación de grupo y asignatura')
            } else if (errorCode === '23505') {
                if (errorText.includes('estudiante_id') && errorText.includes('periodo_id') && !errorText.includes('asignatura_id')) {
                    setError('Existe una restricción antigua por estudiante y periodo. Aplica la migración correctiva de unicidad para notas.')
                } else {
                    setError('Ya existe una nota registrada para este estudiante, asignatura y periodo')
                }
            } else {
                setError(editingNotaId ? 'Error al actualizar la nota' : 'Error al guardar la nota')
            }
        } finally {
            setSaving(false)
        }
    }

    const handleDeleteNota = async (notaId: string) => {
        if (!profile || profile.rol !== 'docente') {
            setError('No tienes permisos para eliminar notas')
            return
        }

        if (!window.confirm('¿Eliminar esta nota registrada?')) return

        setDeletingNotaId(notaId)
        setError(null)

        try {
            const { error } = await (supabase as any)
                .from('notas')
                .delete()
                .eq('id', notaId)
                .eq('docente_id', profile.id)

            if (error) throw error

            if (editingNotaId === notaId) {
                setShowCalculator(false)
                resetCalculatorForm()
            }

            await loadNotas()
            alert('Nota eliminada exitosamente')
        } catch (err) {
            console.error('Error deleting nota:', err)
            setError('Error al eliminar la nota')
        } finally {
            setDeletingNotaId(null)
        }
    }

    const resetCalculatorForm = () => {
        setSelectedGrupo('')
        setSelectedAsignatura('')
        setSelectedEstudiante('')
        setCalculatedResults(null)
        setCalculatedGrades(null)
        setCalculatorInitialGrades(undefined)
        setCalculatorInitialWeights(undefined)
        setEditingNotaId(null)
        setEstudiantes([])
        setCalculatorRenderKey((prev) => prev + 1)
    }

    const handleResultsChange = (results: GradeResults, grades: GradesData) => {
        setCalculatedResults(results)
        setCalculatedGrades(grades)
    }

    const openNewNotaCalculator = () => {
        resetCalculatorForm()
        setShowCalculator(true)
    }

    const parseStoredCalculatorData = (observaciones: string | null): { grades: GradesData; weights: CategoryWeights } => {
        const emptyGrades: GradesData = { A: [], P: [], C: [] }

        if (!observaciones) {
            return { grades: emptyGrades, weights: DEFAULT_WEIGHTS }
        }

        try {
            const data = JSON.parse(observaciones)
            const grades: GradesData = {
                A: Array.isArray(data?.actitudinal?.notas) ? data.actitudinal.notas.filter((n: unknown) => Number.isFinite(Number(n))).map((n: unknown) => Number(n)) : [],
                P: Array.isArray(data?.procedimental?.notas) ? data.procedimental.notas.filter((n: unknown) => Number.isFinite(Number(n))).map((n: unknown) => Number(n)) : [],
                C: Array.isArray(data?.cognitiva?.notas) ? data.cognitiva.notas.filter((n: unknown) => Number.isFinite(Number(n))).map((n: unknown) => Number(n)) : [],
            }

            const inferWeight = (promedio: unknown, ponderacion: unknown, fallback: number) => {
                const avg = Number(promedio)
                const weighted = Number(ponderacion)
                if (!Number.isFinite(avg) || !Number.isFinite(weighted) || avg <= 0) return fallback
                return Math.max(0, Math.min(100, Number(((weighted / avg) * 100).toFixed(2))))
            }

            const roundTwoDecimals = (value: number) => Number(value.toFixed(2))
            const snapNearInteger = (value: number) => {
                const nearestInteger = Math.round(value)
                if (Math.abs(value - nearestInteger) <= 0.05) {
                    return nearestInteger
                }
                return roundTwoDecimals(value)
            }

            const parsedWeights: CategoryWeights = {
                A: inferWeight(data?.actitudinal?.promedio, data?.actitudinal?.ponderacion, DEFAULT_WEIGHTS.A),
                P: inferWeight(data?.procedimental?.promedio, data?.procedimental?.ponderacion, DEFAULT_WEIGHTS.P),
                C: inferWeight(data?.cognitiva?.promedio, data?.cognitiva?.ponderacion, DEFAULT_WEIGHTS.C),
            }

            const totalWeight = parsedWeights.A + parsedWeights.P + parsedWeights.C

            let weights = DEFAULT_WEIGHTS
            if (Math.abs(totalWeight - 100) <= 0.5) {
                const normalizedA = snapNearInteger(parsedWeights.A)
                const normalizedP = snapNearInteger(parsedWeights.P)
                const calculatedC = roundTwoDecimals(100 - normalizedA - normalizedP)

                if (calculatedC >= 0 && calculatedC <= 100) {
                    weights = {
                        A: normalizedA,
                        P: normalizedP,
                        C: snapNearInteger(calculatedC),
                    }
                }
            }

            return { grades, weights }
        } catch {
            return { grades: emptyGrades, weights: DEFAULT_WEIGHTS }
        }
    }

    const openEditNotaCalculator = (nota: Nota) => {
        const parsedData = parseStoredCalculatorData(nota.observaciones)

        setEditingNotaId(nota.id)
        setSelectedGrupo(nota.grupo_id)
        setSelectedAsignatura(nota.asignatura_id)
        setSelectedEstudiante(nota.estudiante_id)
        setCalculatedResults(null)
        setCalculatedGrades(parsedData.grades)
        setCalculatorInitialGrades(parsedData.grades)
        setCalculatorInitialWeights(parsedData.weights)
        setCalculatorRenderKey((prev) => prev + 1)
        setShowCalculator(true)
    }

    const renderObservaciones = (observaciones: string | null) => {
        if (!observaciones) return null

        try {
            const data = JSON.parse(observaciones)

            // Verificar si tiene el formato de la calculadora
            if (data.actitudinal && data.procedimental && data.cognitiva) {
                const categories: Array<{ key: GradeCategory; data: any }> = [
                    { key: 'A', data: data.actitudinal },
                    { key: 'P', data: data.procedimental },
                    { key: 'C', data: data.cognitiva }
                ]

                return (
                    <div className="bg-gradient-to-br from-background to-muted border border-primary/30 rounded-lg p-4 mt-3">
                        <p className="text-xs font-semibold text-primary mb-3 uppercase tracking-wide">
                            Desglose de Evaluación
                        </p>
                        <div className="overflow-x-auto">
                            <table className="w-full text-sm">
                                <thead>
                                    <tr className="border-b border-primary/30">
                                        <th className="text-left py-2 px-3 font-semibold text-primary">Categoría</th>
                                        <th className="text-center py-2 px-3 font-semibold text-primary">Notas</th>
                                        <th className="text-center py-2 px-3 font-semibold text-primary">Promedio</th>
                                        <th className="text-center py-2 px-3 font-semibold text-primary">Ponderación</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {categories.map(({ key, data }) => (
                                        <tr key={key} className="border-b border-primary/20 hover:bg-white/50 transition-colors">
                                            <td className="py-2 px-3 font-medium text-foreground">
                                                {categoryLabels[key]}
                                            </td>
                                            <td className="py-2 px-3 text-center">
                                                <div className="flex flex-wrap gap-1 justify-center">
                                                    {data.notas && data.notas.map((nota: number, idx: number) => (
                                                        <span
                                                            key={idx}
                                                            className="inline-block px-2 py-0.5 bg-secondary text-primary rounded text-xs font-medium"
                                                        >
                                                            {nota.toFixed(1)}
                                                        </span>
                                                    ))}
                                                </div>
                                            </td>
                                            <td className="py-2 px-3 text-center font-semibold text-foreground">
                                                {data.promedio?.toFixed(2) || '0.00'}
                                            </td>
                                            <td className="py-2 px-3 text-center font-bold text-primary">
                                                {data.ponderacion?.toFixed(2) || '0.00'}
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </div>
                )
            }
        } catch (e) {
            // Si no es JSON válido, mostrar como texto
        }

        // Mostrar como texto plano
        return (
            <div className="bg-secondary border border-primary/20 rounded-md p-3 mt-3">
                <p className="text-xs font-medium text-primary">Observaciones</p>
                <p className="text-sm text-primary mt-1">{observaciones}</p>
            </div>
        )
    }

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-3xl font-bold text-foreground">Notas Parciales</h1>
                    <p className="text-muted-foreground mt-1">{headerDescription}</p>
                </div>
                {profile?.rol === 'docente' && !showCalculator && (
                    <Button onClick={openNewNotaCalculator}>
                        <Plus className="h-4 w-4 mr-2" />
                        Registrar Nota
                    </Button>
                )}
            </div>

            {showCalculator && profile?.rol === 'docente' && (
                <Card className="border-2 border-primary">
                    <CardHeader>
                        <CardTitle>{editingNotaId ? 'Editar nota' : 'Registrar nueva nota'}</CardTitle>
                        <CardDescription>
                            {editingNotaId
                                ? 'Actualiza la nota usando la calculadora con los datos precargados'
                                : 'Selecciona el estudiante y usa la calculadora para registrar la nota'}
                        </CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-6">
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                            <div>
                                <label className="text-sm font-medium mb-2 block">Grupo</label>
                                <Select value={selectedGrupo} onValueChange={setSelectedGrupo}>
                                    <SelectTrigger>
                                        <SelectValue placeholder="Selecciona grupo" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {grupos.map((grupo) => (
                                            <SelectItem key={grupo.id} value={grupo.id}>
                                                {grupo.grado.nombre} - {grupo.nombre}
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>

                            <div>
                                <label className="text-sm font-medium mb-2 block">Asignatura</label>
                                <Select value={selectedAsignatura} onValueChange={setSelectedAsignatura}>
                                    <SelectTrigger>
                                        <SelectValue placeholder="Selecciona asignatura" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {asignaturasDisponibles.map((asignatura) => (
                                            <SelectItem key={asignatura.id} value={asignatura.id}>
                                                {asignatura.nombre}
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>

                            <div>
                                <label className="text-sm font-medium mb-2 block">Estudiante</label>
                                <Select
                                    value={selectedEstudiante}
                                    onValueChange={setSelectedEstudiante}
                                    disabled={!selectedGrupo}
                                >
                                    <SelectTrigger>
                                        <SelectValue placeholder="Selecciona estudiante" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {estudiantes.map((estudiante) => (
                                            <SelectItem key={estudiante.id} value={estudiante.id}>
                                                {estudiante.nombre_completo}
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>
                        </div>

                        {selectedGrupo && selectedAsignatura && selectedEstudiante && (
                            <div className="border-t pt-6">
                                <GradeCalculator
                                    key={calculatorRenderKey}
                                    initialGrades={calculatorInitialGrades}
                                    initialWeights={calculatorInitialWeights}
                                    onResultsChange={handleResultsChange}
                                />
                            </div>
                        )}

                        <div className="flex justify-end gap-3 pt-4 border-t">
                            <Button
                                variant="outline"
                                onClick={() => {
                                    setShowCalculator(false)
                                    resetCalculatorForm()
                                }}
                            >
                                Cancelar
                            </Button>
                            <Button
                                onClick={handleSaveNota}
                                disabled={!calculatedResults || saving}
                            >
                                {saving ? (
                                    <>
                                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                                        Guardando...
                                    </>
                                ) : editingNotaId ? 'Actualizar Nota' : 'Guardar Nota'}
                            </Button>
                        </div>
                    </CardContent>
                </Card>
            )}

            <Card>
                <CardContent className="pt-6">
                    <div className="flex items-center gap-4">
                        <label className="text-sm font-medium whitespace-nowrap">
                            Seleccionar Periodo:
                        </label>
                        <Select value={selectedPeriodo} onValueChange={setSelectedPeriodo}>
                            <SelectTrigger className="w-full max-w-xs">
                                <SelectValue placeholder="Selecciona un periodo" />
                            </SelectTrigger>
                            <SelectContent>
                                {periodos.map((periodo) => (
                                    <SelectItem key={periodo.id} value={periodo.id}>
                                        {periodo.nombre} - {periodo.año_academico}
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    </div>

                    {canViewAllNotas && (
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-4">
                            <div>
                                <label className="text-sm font-medium mb-2 block">Grupo</label>
                                <Select value={viewGrupo} onValueChange={setViewGrupo}>
                                    <SelectTrigger>
                                        <SelectValue placeholder="Todos los grupos" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="all">Todos los grupos</SelectItem>
                                        {grupos.map((grupo) => (
                                            <SelectItem key={grupo.id} value={grupo.id}>
                                                {grupo.grado.nombre} - {grupo.nombre}
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>

                            <div>
                                <label className="text-sm font-medium mb-2 block">Asignatura</label>
                                <Select value={viewAsignatura} onValueChange={setViewAsignatura}>
                                    <SelectTrigger>
                                        <SelectValue placeholder="Todas las asignaturas" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="all">Todas las asignaturas</SelectItem>
                                        {asignaturas.map((asignatura) => (
                                            <SelectItem key={asignatura.id} value={asignatura.id}>
                                                {asignatura.nombre}
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>

                            <div>
                                <label className="text-sm font-medium mb-2 block">Estudiante</label>
                                <Select value={viewEstudiante} onValueChange={setViewEstudiante}>
                                    <SelectTrigger>
                                        <SelectValue placeholder="Todos los estudiantes" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="all">Todos los estudiantes</SelectItem>
                                        {estudiantes.map((estudiante) => (
                                            <SelectItem key={estudiante.id} value={estudiante.id}>
                                                {estudiante.nombre_completo}
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>
                        </div>
                    )}
                </CardContent>
            </Card>

            {error && (
                <Alert variant="destructive">
                    <AlertCircle className="h-4 w-4" />
                    <AlertDescription>{error}</AlertDescription>
                </Alert>
            )}

            {loading && (
                <div className="flex items-center justify-center py-12">
                    <Loader2 className="h-8 w-8 animate-spin text-primary" />
                </div>
            )}

            {!loading && notas.length === 0 && (
                <Alert>
                    <BookOpen className="h-4 w-4" />
                    <AlertDescription>
                        No hay notas registradas para este periodo.
                    </AlertDescription>
                </Alert>
            )}

            {!loading && notas.length > 0 && (
                <div className="grid gap-6 lg:grid-cols-3">
                    <Card className="lg:col-span-1">
                        <CardHeader>
                            <CardTitle className="flex items-center gap-2">
                                <TrendingUp className="h-5 w-5 text-primary" />
                                Promedios por asignatura
                            </CardTitle>
                            <CardDescription>
                                Resumen de rendimiento académico
                            </CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            {resumenAsignaturas.map((asignatura) => (
                                <div key={asignatura.nombre} className="flex items-center justify-between">
                                    <div>
                                        <p className="text-sm font-medium text-foreground">
                                            {asignatura.nombre}
                                        </p>
                                        <p className="text-xs text-muted-foreground">
                                            {asignatura.codigo || 'Sin código'} • {asignatura.cantidad} nota(s)
                                        </p>
                                    </div>
                                    <span className="text-sm font-semibold text-primary">
                                        {asignatura.promedio.toFixed(1)}
                                    </span>
                                </div>
                            ))}

                            {promedioGeneral !== null && (
                                <div className="pt-3 border-t border-border flex items-center justify-between">
                                    <span className="text-sm font-semibold text-foreground">Promedio general</span>
                                    <span className="text-lg font-bold text-primary">
                                        {promedioGeneral.toFixed(1)}
                                    </span>
                                </div>
                            )}
                        </CardContent>
                    </Card>

                    <Card className="lg:col-span-2">
                        <CardHeader>
                            <CardTitle>Detalle de notas</CardTitle>
                            <CardDescription>
                                Observa las calificaciones registradas por asignatura
                            </CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-3">
                            {notas.map((nota) => (
                                <div
                                    key={nota.id}
                                    className="flex flex-col gap-2 rounded-lg border border-border p-4"
                                >
                                    <div className="flex items-start justify-between">
                                        <div>
                                            <p className="text-sm font-semibold text-foreground">
                                                {nota.asignatura?.nombre}
                                            </p>
                                            <p className="text-xs text-muted-foreground">
                                                {nota.grupo.grado.nombre} - Grupo {nota.grupo.nombre}
                                            </p>
                                        </div>
                                        <div className="text-right">
                                            <p className="text-lg font-bold text-primary">
                                                {nota.nota.toFixed(1)}
                                            </p>
                                            <p className="text-xs text-muted-foreground">
                                                {new Date(nota.created_at).toLocaleDateString()}
                                            </p>
                                            {profile?.rol === 'docente' && (
                                                <div className="mt-2 flex justify-end gap-2">
                                                    <Button
                                                        variant="outline"
                                                        size="sm"
                                                        onClick={() => openEditNotaCalculator(nota)}
                                                        disabled={deletingNotaId === nota.id}
                                                    >
                                                        <Pencil className="h-3.5 w-3.5 mr-1" />
                                                        Editar
                                                    </Button>
                                                    <Button
                                                        variant="destructive"
                                                        size="sm"
                                                        onClick={() => handleDeleteNota(nota.id)}
                                                        disabled={deletingNotaId === nota.id}
                                                    >
                                                        {deletingNotaId === nota.id ? (
                                                            <>
                                                                <Loader2 className="h-3.5 w-3.5 mr-1 animate-spin" />
                                                                Eliminando...
                                                            </>
                                                        ) : (
                                                            <>
                                                                <Trash2 className="h-3.5 w-3.5 mr-1" />
                                                                Eliminar
                                                            </>
                                                        )}
                                                    </Button>
                                                </div>
                                            )}
                                        </div>
                                    </div>

                                    {nota.estudiante && (profile?.rol === 'administrador' || profile?.rol === 'administrativo' || profile?.rol === 'docente') && (
                                        <p className="text-xs text-muted-foreground">
                                            Estudiante: {nota.estudiante.nombre_completo}
                                        </p>
                                    )}

                                    {renderObservaciones(nota.observaciones)}
                                </div>
                            ))}
                        </CardContent>
                    </Card>
                </div>
            )}
        </div>
    )
}
