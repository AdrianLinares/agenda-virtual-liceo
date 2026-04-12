import { useEffect, useMemo, useState, useRef } from 'react'
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

import { GradeCalculator, type GradeCalculatorRef } from '@/components/calculator/GradeCalculator'
import type { CategoryWeights, GradeResults, GradesData, RubricsData } from '@/types/grades'
import { categoryLabels, type GradeCategory } from '@/types/grades'
import { sortByGradeAndGroupName } from '@/utils/grade-order'

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

type JsonComparable = null | boolean | number | string | JsonComparable[] | { [key: string]: JsonComparable }

type NotaMutationPayload = {
    estudiante_id: string
    asignatura_id: string
    periodo_id: string
    grupo_id: string
    docente_id: string
    nota: number
    observaciones: string
}

const canonicalizeJsonValue = (value: unknown): JsonComparable => {
    if (value === null || typeof value === 'boolean' || typeof value === 'number' || typeof value === 'string') {
        return value
    }

    if (Array.isArray(value)) {
        return value.map((item) => canonicalizeJsonValue(item))
    }

    if (typeof value === 'object' && value !== null) {
        const entries = Object.entries(value as Record<string, unknown>)
            .filter(([, entryValue]) => entryValue !== undefined)
            .sort(([leftKey], [rightKey]) => leftKey.localeCompare(rightKey))

        return entries.reduce<Record<string, JsonComparable>>((acc, [key, entryValue]) => {
            acc[key] = canonicalizeJsonValue(entryValue)
            return acc
        }, {})
    }

    return String(value)
}

// eslint-disable-next-line react-refresh/only-export-components
export const parseObservacionesPayload = (observaciones: string) => {
    const tryParse = (value: string) => {
        try {
            return JSON.parse(value)
        } catch {
            return null
        }
    }

    const parseToObject = (raw: string) => {
        const firstPass = tryParse(raw)
        if (firstPass && typeof firstPass === 'object') {
            return firstPass
        }

        if (typeof firstPass === 'string') {
            const secondPass = tryParse(firstPass)
            if (secondPass && typeof secondPass === 'object') {
                return secondPass
            }
        }

        return null
    }

    const direct = parseToObject(observaciones)
    if (direct) return direct

    // Normaliza errores comunes en datos historicos: comillas faltantes en claves y comas colgantes.
    const normalized = observaciones
        .replace(/[\u201C\u201D]/g, '"')
        .replace(/[\u2018\u2019]/g, "'")
        .replace(/([{,]\s*)([a-zA-Z_][\w]*)":/g, '$1"$2":')
        .replace(/([{,]\s*)([a-zA-Z_][\w]*)\s*:/g, '$1"$2":')
        .replace(/,\s*([}\]])/g, '$1')

    return parseToObject(normalized)
}

// eslint-disable-next-line react-refresh/only-export-components
export const didObservacionesChange = (
    originalObservaciones: string | null | undefined,
    updatedObservaciones: string | null | undefined
) => {
    if (originalObservaciones == null || updatedObservaciones == null) {
        return originalObservaciones !== updatedObservaciones
    }

    const parsedOriginal = parseObservacionesPayload(originalObservaciones)
    const parsedUpdated = parseObservacionesPayload(updatedObservaciones)

    if (parsedOriginal !== null && parsedUpdated !== null) {
        const canonicalOriginal = canonicalizeJsonValue(parsedOriginal)
        const canonicalUpdated = canonicalizeJsonValue(parsedUpdated)
        return JSON.stringify(canonicalOriginal) !== JSON.stringify(canonicalUpdated)
    }

    return originalObservaciones !== updatedObservaciones
}

export default function NotasPage() {
    const { profile } = useAuthStore()
    const canViewAllNotas = profile?.rol === 'administrador' || profile?.rol === 'administrativo'
    const canUseViewFilters = canViewAllNotas || profile?.rol === 'docente'
    const [periodos, setPeriodos] = useState<Periodo[]>([])
    const [selectedPeriodo, setSelectedPeriodo] = useState<string>('')
    const [notas, setNotas] = useState<Nota[]>([])
    const [loading, setLoading] = useState(false)
    const [error, setError] = useState<string | null>(null)

    // Estados para registro de notas (solo docentes)
    const [showCalculator, setShowCalculator] = useState<false | true | string>(false)
    const [grupos, setGrupos] = useState<Grupo[]>([])
    const [asignaturas, setAsignaturas] = useState<Asignatura[]>([])
    const [asignacionesDocente, setAsignacionesDocente] = useState<AsignacionDocente[]>([])
    const [estudiantes, setEstudiantes] = useState<Estudiante[]>([])

    // Filtros de visualización (administrador, administrativo y docente)
    const [viewGrupo, setViewGrupo] = useState<string>('all')
    const [viewAsignatura, setViewAsignatura] = useState<string>('all')
    const [viewEstudiante, setViewEstudiante] = useState<string>('all')
    const [adminAsignaturasPorGrupo, setAdminAsignaturasPorGrupo] = useState<Record<string, string[]>>({})
    const [adminEstudiantesPorGrupo, setAdminEstudiantesPorGrupo] = useState<Record<string, string[]>>({})

    const [selectedGrupo, setSelectedGrupo] = useState<string>('')
    const [selectedAsignatura, setSelectedAsignatura] = useState<string>('')
    const [selectedEstudiante, setSelectedEstudiante] = useState<string>('')
    const [calculatedResults, setCalculatedResults] = useState<GradeResults | null>(null)
    const [calculatorInitialGrades, setCalculatorInitialGrades] = useState<GradesData | undefined>(undefined)
    const [calculatorInitialWeights, setCalculatorInitialWeights] = useState<CategoryWeights | undefined>(undefined)
    const [calculatorInitialRubrics, setCalculatorInitialRubrics] = useState<RubricsData | undefined>(undefined)
    const [calculatorRenderKey, setCalculatorRenderKey] = useState(0)
    const [editingNotaId, setEditingNotaId] = useState<string | null>(null)
    const [saving, setSaving] = useState(false)
    const [deletingNotaId, setDeletingNotaId] = useState<string | null>(null)
    const calculatorRefNew = useRef<GradeCalculatorRef | null>(null)
    const calculatorRefEdit = useRef<GradeCalculatorRef | null>(null)
    const lastResultsRefNew = useRef<GradeResults | null>(null)
    const lastResultsRefEdit = useRef<GradeResults | null>(null)

    useEffect(() => {
        loadPeriodos()
    }, [])

    useEffect(() => {
        if (selectedPeriodo && profile) {
            loadNotas()
        }
        // Motivo: loadNotas depende de selectedPeriodo y filtros; omitimos otras dependencias intencionalmente
        // para controlar cuándo se ejecuta. Revisar si se necesita incluir más dependencias antes de eliminar esta línea.
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [selectedPeriodo, profile, viewGrupo, viewAsignatura, viewEstudiante])

    // Cargar opciones de filtros y calculadora para docente
    useEffect(() => {
        if (profile?.rol === 'docente') {
            loadDocenteAsignaciones()
        }
        // Motivo: efecto ejecutado cuando cambie el perfil docente. Dependencias omitidas intencionalmente.
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [profile])

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
        // Motivo: cargar estudiantes cuando cambia el grupo seleccionado. Dependencias intencionales.
        // eslint-disable-next-line react-hooks/exhaustive-deps
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

    const loadNotas = async (showLoader = true) => {
        if (!selectedPeriodo || !profile) return

        if (showLoader) setLoading(true)
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

            if (canUseViewFilters) {
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
            const [
                { data: gruposData, error: gruposError },
                { data: asignaturasData, error: asignaturasError },
                { data: estudiantesData, error: estudiantesError },
                { data: estudiantesGrupoData, error: estudiantesGrupoError },
                { data: asignacionesData, error: asignacionesError },
            ] = await Promise.all([
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
                supabase
                    .from('estudiantes_grupos')
                    .select('grupo_id, estudiante_id')
                    .returns<Array<{ grupo_id: string; estudiante_id: string }>>(),
                supabase
                    .from('asignaciones_docentes')
                    .select('grupo_id, asignatura_id')
                    .returns<Array<{ grupo_id: string; asignatura_id: string }>>(),
            ])

            if (gruposError) throw gruposError
            if (asignaturasError) throw asignaturasError
            if (estudiantesError) throw estudiantesError
            if (estudiantesGrupoError) throw estudiantesGrupoError
            if (asignacionesError) throw asignacionesError

            const gruposOrdenados = sortByGradeAndGroupName(
                (gruposData || []) as Grupo[],
                (grupo) => grupo.grado?.nombre,
                (grupo) => grupo.nombre
            )

            setGrupos(gruposOrdenados)
            setAsignaturas((asignaturasData || []) as Asignatura[])
            setEstudiantes((estudiantesData || []) as Estudiante[])

            const estudiantesActivos = new Set(((estudiantesData || []) as Estudiante[]).map((estudiante) => estudiante.id))

            const estudiantesPorGrupo = (estudiantesGrupoData || []).reduce<Record<string, string[]>>((acc, item) => {
                if (!estudiantesActivos.has(item.estudiante_id)) {
                    return acc
                }

                if (!acc[item.grupo_id]) {
                    acc[item.grupo_id] = []
                }

                if (!acc[item.grupo_id].includes(item.estudiante_id)) {
                    acc[item.grupo_id].push(item.estudiante_id)
                }

                return acc
            }, {})

            const asignaturasPorGrupo = (asignacionesData || []).reduce<Record<string, string[]>>((acc, item) => {
                if (!acc[item.grupo_id]) {
                    acc[item.grupo_id] = []
                }

                if (!acc[item.grupo_id].includes(item.asignatura_id)) {
                    acc[item.grupo_id].push(item.asignatura_id)
                }

                return acc
            }, {})

            setAdminEstudiantesPorGrupo(estudiantesPorGrupo)
            setAdminAsignaturasPorGrupo(asignaturasPorGrupo)
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

    const viewAsignaturasDisponibles = useMemo(() => {
        if (!canUseViewFilters || viewGrupo === 'all') {
            return asignaturas
        }

        const permitidas = new Set(adminAsignaturasPorGrupo[viewGrupo] || [])
        return asignaturas.filter((asignatura) => permitidas.has(asignatura.id))
    }, [adminAsignaturasPorGrupo, asignaturas, canUseViewFilters, viewGrupo])

    const viewEstudiantesDisponibles = useMemo(() => {
        if (!canUseViewFilters || viewGrupo === 'all') {
            return estudiantes
        }

        const permitidos = new Set(adminEstudiantesPorGrupo[viewGrupo] || [])
        return estudiantes.filter((estudiante) => permitidos.has(estudiante.id))
    }, [adminEstudiantesPorGrupo, canUseViewFilters, estudiantes, viewGrupo])

    const headerDescription = useMemo(() => {
        if (profile?.rol === 'estudiante') return 'Consulta tus notas parciales por periodo'
        if (profile?.rol === 'padre') return 'Consulta las notas parciales de tus hijos'
        if (profile?.rol === 'docente') return 'Visualiza y registra las notas de tus estudiantes'
        return 'Gestiona y consulta las notas parciales'
    }, [profile?.rol])

    useEffect(() => {
        if (!canUseViewFilters) return

        if (viewGrupo === 'all') {
            if (viewAsignatura !== 'all') {
                setViewAsignatura('all')
            }
            if (viewEstudiante !== 'all') {
                setViewEstudiante('all')
            }
            return
        }

        if (viewAsignatura !== 'all' && !viewAsignaturasDisponibles.some((asignatura) => asignatura.id === viewAsignatura)) {
            setViewAsignatura('all')
        }

        if (viewEstudiante !== 'all' && !viewEstudiantesDisponibles.some((estudiante) => estudiante.id === viewEstudiante)) {
            setViewEstudiante('all')
        }
    }, [canUseViewFilters, viewAsignatura, viewAsignaturasDisponibles, viewEstudiante, viewEstudiantesDisponibles, viewGrupo])

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

            // Motivo: respuesta de Supabase tiene tipo dinámico; convertir después a los tipos esperados.
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
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

            const asignaturasPorGrupo = asignacionesPermitidas.reduce<Record<string, string[]>>((acc, item) => {
                if (!acc[item.grupo_id]) {
                    acc[item.grupo_id] = []
                }

                if (!acc[item.grupo_id].includes(item.asignatura_id)) {
                    acc[item.grupo_id].push(item.asignatura_id)
                }

                return acc
            }, {})

            const gruposAsignados = Array.from(new Set(asignacionesPermitidas.map((item) => item.grupo_id)))
            const { data: estudiantesGrupoData, error: estudiantesGrupoError } = gruposAsignados.length > 0
                ? await supabase
                    .from('estudiantes_grupos')
                    .select(`
                        grupo_id,
                        estudiante:estudiante_id (
                            id,
                            nombre_completo,
                            email
                        )
                    `)
                    .in('grupo_id', gruposAsignados)
                    .eq('estado', 'activo')
                    .returns<Array<{ grupo_id: string; estudiante: Estudiante | null }>>()
                : { data: [], error: null }

            if (estudiantesGrupoError) throw estudiantesGrupoError

            const estudiantesPorGrupo = (estudiantesGrupoData || []).reduce<Record<string, string[]>>((acc, item) => {
                const estudianteId = item.estudiante?.id
                if (!estudianteId) {
                    return acc
                }

                if (!acc[item.grupo_id]) {
                    acc[item.grupo_id] = []
                }

                if (!acc[item.grupo_id].includes(estudianteId)) {
                    acc[item.grupo_id].push(estudianteId)
                }

                return acc
            }, {})

            const estudiantesMap = new Map<string, Estudiante>()
                ; (estudiantesGrupoData || []).forEach((item) => {
                    if (item.estudiante) {
                        estudiantesMap.set(item.estudiante.id, item.estudiante)
                    }
                })

            setAsignacionesDocente(asignacionesPermitidas)
            setGrupos(
                sortByGradeAndGroupName(
                    Array.from(gruposMap.values()),
                    (grupo) => grupo.grado?.nombre,
                    (grupo) => grupo.nombre
                )
            )
            setAsignaturas(Array.from(asignaturasMap.values()))
            setEstudiantes(
                Array.from(estudiantesMap.values())
                    .sort((a, b) => a.nombre_completo.localeCompare(b.nombre_completo, 'es', { sensitivity: 'base' }))
            )
            setAdminAsignaturasPorGrupo(asignaturasPorGrupo)
            setAdminEstudiantesPorGrupo(estudiantesPorGrupo)
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
                .eq('estado', 'activo')
                .returns<Array<{ estudiante: Estudiante }>>()

            if (error) throw error

            const estudiantesOrdenados = (data || [])
                .map((item) => item.estudiante)
                .filter(Boolean)
                .sort((a, b) => a.nombre_completo.localeCompare(b.nombre_completo, 'es', { sensitivity: 'base' }))

            setEstudiantes(estudiantesOrdenados)
        } catch (err) {
            console.error('Error loading estudiantes:', err)
            setError('Error al cargar los estudiantes del grupo')
        }
    }


    const handleSaveNota = async () => {
        const isEditingFlow = Boolean(editingNotaId)
        const activeCalculatorRef = isEditingFlow ? calculatorRefEdit : calculatorRefNew
        const activeLastResultsRef = isEditingFlow ? lastResultsRefEdit : lastResultsRefNew

        if (!activeCalculatorRef.current && !activeLastResultsRef.current && !calculatedResults) {
            setError('La calculadora no está lista. Intenta de nuevo.');
            return;
        }

        // Obtener datos más recientes de la calculadora.
        let latestResults: GradeResults | null = null
        let latestGrades: GradesData | undefined = undefined
        let latestRubrics: RubricsData | undefined = undefined
        let latestWeights: CategoryWeights | undefined = undefined

        // Dar oportunidad a React de procesar cualquier setState pendiente en la calculadora
        // cuando el usuario edita y hace click rápidamente. Esto evita leer un estado stale
        // desde el ref inmediatamente después de un evento de input.
        // Si la calculadora ya está estable, la espera será mínima.
        await new Promise((resolve) => setTimeout(resolve, 0))

        if (activeCalculatorRef.current) {
            try {
                const latest = activeCalculatorRef.current.getLatestData()
                latestResults = latest?.results ?? null
                latestGrades = latest?.grades
                latestRubrics = latest?.rubrics
                latestWeights = latest?.weights
            } catch (e) {
                // Ignorar: si falla el ref, fallback a calculatedResults
                latestResults = null
            }
        }

        // Priorizar el snapshot del ref activo (getLatestData). Si no está disponible,
        // usar referencias locales de onResultsChange y finalmente el estado renderizado.
        const effectiveResults = latestResults ?? activeLastResultsRef.current ?? calculatedResults

        if (!selectedPeriodo || !selectedGrupo || !selectedAsignatura || !selectedEstudiante || !effectiveResults || !profile) {
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
            const weights = latestWeights ?? DEFAULT_WEIGHTS

            const observaciones = JSON.stringify({
                actitudinal: {
                    promedio: effectiveResults.averages.A,
                    ponderacion: effectiveResults.weighted.A,
                    porcentaje: weights.A,
                    notas: latestGrades?.A || [],
                    rubrica: latestRubrics?.A || []
                },
                procedimental: {
                    promedio: effectiveResults.averages.P,
                    ponderacion: effectiveResults.weighted.P,
                    porcentaje: weights.P,
                    notas: latestGrades?.P || [],
                    rubrica: latestRubrics?.P || []
                },
                cognitiva: {
                    promedio: effectiveResults.averages.C,
                    ponderacion: effectiveResults.weighted.C,
                    porcentaje: weights.C,
                    notas: latestGrades?.C || [],
                    rubrica: latestRubrics?.C || []
                }
            })

            const notaData: NotaMutationPayload = {
                estudiante_id: selectedEstudiante,
                asignatura_id: selectedAsignatura,
                periodo_id: selectedPeriodo,
                grupo_id: selectedGrupo,
                docente_id: profile.id,
                nota: effectiveResults.final,
                observaciones
            }

            let result: { error: unknown; data: { nota: number; observaciones: string | null } | null }
            let cambioNotaFinal = false

            if (editingNotaId) {
                // OBTENER la nota ORIGINAL antes del update
                const { data: originalNotaBeforeUpdate } = await supabase
                    .from('notas')
                    .select('nota, observaciones')
                    .eq('id', editingNotaId)
                    .single()

                const originalNotaData = originalNotaBeforeUpdate as { nota: number; observaciones: string | null } | null
                const notaOriginalNum = Number(originalNotaData?.nota)

                // HACER el UPDATE
                // Motivo: datos de la consulta contienen campos anidados con tipos dinámicos.
                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                result = await (supabase as any)
                    .from('notas')
                    .update(notaData)
                    .eq('id', editingNotaId)
                    .select()
                    .single()

                if (!result.error && originalNotaData) {
                    const notaNuevaNum = Number(notaData.nota)

                    // Siempre verificar con query directa a la BD despues del update
                    const { data: verifyData } = await supabase
                        .from('notas')
                        .select('nota, observaciones')
                        .eq('id', editingNotaId)
                        .single()

                    const verifyNota = verifyData as { nota: number; observaciones: string | null } | null
                    const dbNotaNum = Number(verifyNota?.nota)
                    const observacionesActualizadas = verifyNota?.observaciones ?? result.data?.observaciones
                    const observacionesChanged = didObservacionesChange(originalNotaData.observaciones, observacionesActualizadas)

                    // Verificar contra la BD - comparar con el valor ORIGINAL (antes del update)
                    if (dbNotaNum !== notaOriginalNum) {
                        cambioNotaFinal = true
                    } else if (notaNuevaNum !== notaOriginalNum) {
                        cambioNotaFinal = true
                    } else if (observacionesChanged) {
                        cambioNotaFinal = true
                    }
                }
            } else {
                result = await supabase
                    .from('notas')
                    .insert(notaData)
                    .select()
                    .single()
            }

            const { error } = result

            if (error) throw error

            // Recargar notas y cerrar modal
            await loadNotas(false)
            setShowCalculator(false)
            resetCalculatorForm()

            // Solo mostrar éxito si hubo cambio real en la nota
            if (editingNotaId) {
                if (cambioNotaFinal) {
                    alert('Nota actualizada exitosamente')
                } else {
                    alert('Los valores de la nota no cambiaron. Los porcentajes se han actualizado en las notas.')
                }
            } else {
                alert('Nota guardada exitosamente')
            }
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
            // Motivo: iteración sobre resultados con estructura no estricta proveniente de la BD.
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            const { error } = await (supabase as any)
                .from('notas')
                .delete()
                .eq('id', notaId)

            if (error) throw error

            if (editingNotaId === notaId) {
                setShowCalculator(false)
                resetCalculatorForm()
            }

            await loadNotas(false)
            alert('Nota eliminada exitosamente')
        } catch (err) {
            console.error('Error deleting nota:', err)
            setError('Error al eliminar la nota')
        } finally {
            setDeletingNotaId(null)
        }
    }

    const resetCalculatorForm = () => {
        setSelectedEstudiante('')
        setCalculatedResults(null)
        lastResultsRefNew.current = null
        lastResultsRefEdit.current = null
        setCalculatorInitialGrades(undefined)
        setCalculatorInitialWeights(undefined)
        setEditingNotaId(null)
        setCalculatorRenderKey((prev) => prev + 1)
    }

    const handleResultsChange = (
        source: 'new' | 'edit',
        results: GradeResults,
        _grades: GradesData,
        _rubrics: RubricsData,
        _weights: CategoryWeights
    ) => {
        // _grades/_rubrics/_weights are intentionally unused here; kept for future use
        void _grades
        void _rubrics
        void _weights
        setCalculatedResults(results)

        if (source === 'edit') {
            lastResultsRefEdit.current = results
            return
        }

        lastResultsRefNew.current = results
    }

    const openNewNotaCalculator = () => {
        resetCalculatorForm()
        setShowCalculator(true) // Mostrar calculadora arriba para nuevo registro
    }

    const parseStoredCalculatorData = (observaciones: string | null): { grades: GradesData; weights: CategoryWeights; rubrics: RubricsData } => {
        const emptyGrades: GradesData = { A: [], P: [], C: [] }
        const emptyRubrics: RubricsData = { A: [], P: [], C: [] }

        if (!observaciones) {
            return { grades: emptyGrades, weights: DEFAULT_WEIGHTS, rubrics: emptyRubrics }
        }

        try {
            const data = parseObservacionesPayload(observaciones)
            if (!data) {
                return { grades: emptyGrades, weights: DEFAULT_WEIGHTS, rubrics: emptyRubrics }
            }

            const grades: GradesData = {
                A: Array.isArray(data?.actitudinal?.notas) ? data.actitudinal.notas.filter((n: unknown) => Number.isFinite(Number(n))).map((n: unknown) => Number(n)) : [],
                P: Array.isArray(data?.procedimental?.notas) ? data.procedimental.notas.filter((n: unknown) => Number.isFinite(Number(n))).map((n: unknown) => Number(n)) : [],
                C: Array.isArray(data?.cognitiva?.notas) ? data.cognitiva.notas.filter((n: unknown) => Number.isFinite(Number(n))).map((n: unknown) => Number(n)) : [],
            }

            const rubrics: RubricsData = {
                A: Array.isArray(data?.actitudinal?.rubrica) ? data.actitudinal.rubrica.map((r: unknown) => String(r ?? '')) : [],
                P: Array.isArray(data?.procedimental?.rubrica) ? data.procedimental.rubrica.map((r: unknown) => String(r ?? '')) : [],
                C: Array.isArray(data?.cognitiva?.rubrica) ? data.cognitiva.rubrica.map((r: unknown) => String(r ?? '')) : [],
            }

            const parsedWeights: CategoryWeights = {
                A: Number.isFinite(Number(data?.actitudinal?.porcentaje)) ? Number(data.actitudinal.porcentaje) : DEFAULT_WEIGHTS.A,
                P: Number.isFinite(Number(data?.procedimental?.porcentaje)) ? Number(data.procedimental.porcentaje) : DEFAULT_WEIGHTS.P,
                C: Number.isFinite(Number(data?.cognitiva?.porcentaje)) ? Number(data.cognitiva.porcentaje) : DEFAULT_WEIGHTS.C,
            }

            return { grades, weights: parsedWeights, rubrics }
        } catch {
            return { grades: emptyGrades, weights: DEFAULT_WEIGHTS, rubrics: emptyRubrics }
        }
    }

    const openEditNotaCalculator = (nota: Nota) => {
        const parsedData = parseStoredCalculatorData(nota.observaciones)

        setEditingNotaId(nota.id)
        setSelectedGrupo(nota.grupo_id)
        setSelectedAsignatura(nota.asignatura_id)
        setSelectedEstudiante(nota.estudiante_id)
        setCalculatedResults(null)
        setCalculatorInitialGrades(parsedData.grades)
        setCalculatorInitialWeights(parsedData.weights)
        setCalculatorInitialRubrics(parsedData.rubrics)
        setCalculatorRenderKey((prev) => prev + 1)
        setShowCalculator(nota.id)
    }

    const renderObservaciones = (observaciones: string | null) => {
        if (!observaciones) return null

        try {
            const data = parseObservacionesPayload(observaciones)
            if (!data) {
                throw new Error('Invalid observaciones payload')
            }

            const { weights, rubrics } = parseStoredCalculatorData(observaciones)

            // Verificar si tiene el formato de la calculadora
            if (data.actitudinal && data.procedimental && data.cognitiva) {
                const formatPercent = (value: number) => `${value.toFixed(2).replace(/\.00$/, '').replace(/(\.\d)0$/, '$1')}%`
                // Motivo: supabase retorna any para insert/delete en este proyecto; casteamos a tipos conocidos.
                // eslint-disable-next-line @typescript-eslint/no-explicit-any
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
                        <p className="mb-2 text-[11px] text-muted-foreground md:hidden">
                            Desliza horizontalmente para ver todas las columnas.
                        </p>
                        <div className="w-full min-w-0 overflow-x-auto">
                            <table className="w-full min-w-[620px] text-sm">
                                <thead>
                                    <tr className="border-b border-primary/30">
                                        <th className="text-left py-2 px-3 font-semibold text-primary whitespace-nowrap">Categoría</th>
                                        <th className="text-center py-2 px-3 font-semibold text-primary whitespace-nowrap">Notas</th>
                                        <th className="text-center py-2 px-3 font-semibold text-primary whitespace-nowrap">Promedio</th>
                                        <th className="text-center py-2 px-3 font-semibold text-primary whitespace-nowrap">Ponderación</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {categories.map(({ key, data }) => (
                                        <tr key={key} className="border-b border-primary/20 hover:bg-white/50 transition-colors">
                                            <td className="py-2 px-3 font-medium text-foreground whitespace-nowrap">
                                                {categoryLabels[key]}: {formatPercent(Number.isFinite(Number(data?.porcentaje)) ? Number(data.porcentaje) : weights[key])}
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
                                    <tr>
                                        <td colSpan={4} className="py-3 px-3">
                                            <details className="rounded-md border border-primary/20 bg-background">
                                                <summary className="cursor-pointer select-none px-3 py-2 text-sm font-semibold text-primary">
                                                    Rúbrica
                                                </summary>
                                                <div className="space-y-3 border-t border-primary/20 px-3 py-3">
                                                    {categories.map(({ key, data }) => (
                                                        <div key={`rubrica-${key}`} className="rounded-sm bg-muted/50 p-2">
                                                            <p className="text-sm font-semibold text-foreground mb-1">
                                                                {categoryLabels[key]}
                                                            </p>
                                                            <div className="space-y-1">
                                                                {Array.from({ length: data?.notas?.length || 0 }, (_, idx) => {
                                                                    const descripcion = String(
                                                                        (Array.isArray(data?.rubrica) ? data.rubrica[idx] : undefined) ??
                                                                        rubrics[key][idx] ??
                                                                        ''
                                                                    ).trim()

                                                                    return (
                                                                        <p key={`rubrica-item-${key}-${idx}`} className="text-xs text-foreground">
                                                                            <span className="font-semibold mr-1">N{idx + 1}</span>
                                                                            Descripción: {descripcion || 'Sin descripción'}
                                                                        </p>
                                                                    )
                                                                })}
                                                            </div>
                                                        </div>
                                                    ))}
                                                </div>
                                            </details>
                                        </td>
                                    </tr>
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

            {showCalculator === true && profile?.rol === 'docente' && (
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
                                    <SelectTrigger className="w-full md:min-w-[18rem]">
                                        <SelectValue placeholder="Selecciona estudiante" />
                                    </SelectTrigger>
                                    <SelectContent className="md:min-w-[22rem]">
                                        {estudiantes.map((estudiante) => (
                                            <SelectItem
                                                key={estudiante.id}
                                                value={estudiante.id}
                                                className="whitespace-normal py-2 leading-tight"
                                                title={estudiante.nombre_completo}
                                            >
                                                {estudiante.nombre_completo}
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                                {selectedGrupo && estudiantes.length > 8 && (
                                    <p className="mt-2 text-xs text-muted-foreground">
                                        Desplaza la lista para ver todos los estudiantes ({estudiantes.length} en total).
                                    </p>
                                )}
                            </div>
                        </div>

                        {selectedGrupo && selectedAsignatura && selectedEstudiante && (
                            <div className="border-t pt-6">
                                <GradeCalculator
                                    key={calculatorRenderKey}
                                    ref={calculatorRefNew}
                                    initialGrades={calculatorInitialGrades}
                                    initialWeights={calculatorInitialWeights}
                                    initialRubrics={calculatorInitialRubrics}
                                    onResultsChange={(results, grades, rubrics, weights) =>
                                        handleResultsChange('new', results, grades, rubrics, weights)
                                    }
                                />
                            </div>
                        )}

                        <div className="flex justify-end gap-3 pt-4 border-t">
                            <Button
                                variant="outline"
                                onClick={() => {
                                    setShowCalculator(false) // Resetear el estado de la calculadora
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

                    {canUseViewFilters && (
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
                                        {viewAsignaturasDisponibles.map((asignatura) => (
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
                                    <SelectTrigger className="w-full md:min-w-[18rem]">
                                        <SelectValue placeholder="Todos los estudiantes" />
                                    </SelectTrigger>
                                    <SelectContent className="md:min-w-[22rem]">
                                        <SelectItem value="all">Todos los estudiantes</SelectItem>
                                        {viewEstudiantesDisponibles.map((estudiante) => (
                                            <SelectItem
                                                key={estudiante.id}
                                                value={estudiante.id}
                                                className="whitespace-normal py-2 leading-tight"
                                                title={estudiante.nombre_completo}
                                            >
                                                {estudiante.nombre_completo}
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                                {viewEstudiantesDisponibles.length > 8 && (
                                    <p className="mt-2 text-xs text-muted-foreground">
                                        Desplaza la lista para ver todos los estudiantes ({viewEstudiantesDisponibles.length} en total).
                                    </p>
                                )}
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

                    <Card className="lg:col-span-2 min-w-0">
                        <CardHeader>
                            <CardTitle>Detalle de notas</CardTitle>
                            <CardDescription>
                                Observa las calificaciones registradas por asignatura
                            </CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-3">
                            {notas.map((nota) => {
                                const isEditing = showCalculator === nota.id && editingNotaId === nota.id;
                                return (
                                    <div
                                        key={nota.id}
                                        className="flex min-w-0 flex-col gap-2 rounded-lg border border-border p-4"
                                    >
                                        {/* Si está en modo edición inline para esta nota, mostrar el formulario aquí */}
                                        {isEditing ? (
                                            <Card className="border-2 border-primary bg-muted/60">
                                                <CardHeader>
                                                    <CardTitle>Editar nota</CardTitle>
                                                    <CardDescription>
                                                        Actualiza la nota usando la calculadora con los datos precargados
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
                                                                <SelectTrigger className="w-full md:min-w-[18rem]">
                                                                    <SelectValue placeholder="Selecciona estudiante" />
                                                                </SelectTrigger>
                                                                <SelectContent className="md:min-w-[22rem]">
                                                                    {estudiantes.map((estudiante) => (
                                                                        <SelectItem
                                                                            key={estudiante.id}
                                                                            value={estudiante.id}
                                                                            className="whitespace-normal py-2 leading-tight"
                                                                            title={estudiante.nombre_completo}
                                                                        >
                                                                            {estudiante.nombre_completo}
                                                                        </SelectItem>
                                                                    ))}
                                                                </SelectContent>
                                                            </Select>
                                                            {selectedGrupo && estudiantes.length > 8 && (
                                                                <p className="mt-2 text-xs text-muted-foreground">
                                                                    Desplaza la lista para ver todos los estudiantes ({estudiantes.length} en total).
                                                                </p>
                                                            )}
                                                        </div>
                                                    </div>
                                                    {selectedGrupo && selectedAsignatura && selectedEstudiante && (
                                                        <div className="border-t pt-6">
                                                            <GradeCalculator
                                                                key={calculatorRenderKey}
                                                                ref={calculatorRefEdit}
                                                                initialGrades={calculatorInitialGrades}
                                                                initialWeights={calculatorInitialWeights}
                                                                initialRubrics={calculatorInitialRubrics}
                                                                onResultsChange={(results, grades, rubrics, weights) =>
                                                                    handleResultsChange('edit', results, grades, rubrics, weights)
                                                                }
                                                            />
                                                        </div>
                                                    )}
                                                    <div className="flex justify-end gap-3 pt-4 border-t">
                                                        <Button
                                                            variant="outline"
                                                            onClick={resetCalculatorForm}
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
                                                            ) : 'Actualizar Nota'}
                                                        </Button>
                                                    </div>
                                                </CardContent>
                                            </Card>
                                        ) : (
                                            <>
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
                                            </>
                                        )}
                                    </div>
                                );
                            })}
                        </CardContent>
                    </Card>
                </div>
            )}
        </div>
    )
}
