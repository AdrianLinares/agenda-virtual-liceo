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
import { AlertCircle, BookOpen, Loader2, TrendingUp } from 'lucide-react'

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

export default function NotasPage() {
    const { profile } = useAuthStore()
    const [periodos, setPeriodos] = useState<Periodo[]>([])
    const [selectedPeriodo, setSelectedPeriodo] = useState<string>('')
    const [notas, setNotas] = useState<Nota[]>([])
    const [loading, setLoading] = useState(false)
    const [error, setError] = useState<string | null>(null)

    useEffect(() => {
        loadPeriodos()
    }, [])

    useEffect(() => {
        if (selectedPeriodo && profile) {
            loadNotas()
        }
    }, [selectedPeriodo, profile])

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
                query = query.eq('docente_id', profile.id)
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
        if (profile?.rol === 'docente') return 'Visualiza las notas registradas en tus asignaturas'
        return 'Gestiona y consulta las notas parciales'
    }, [profile?.rol])

    return (
        <div className="space-y-6">
            <div>
                <h1 className="text-3xl font-bold text-gray-900">Notas Parciales</h1>
                <p className="text-gray-600 mt-1">{headerDescription}</p>
            </div>

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
                    <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
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
                                <TrendingUp className="h-5 w-5 text-blue-600" />
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
                                        <p className="text-sm font-medium text-gray-900">
                                            {asignatura.nombre}
                                        </p>
                                        <p className="text-xs text-gray-500">
                                            {asignatura.codigo || 'Sin código'} • {asignatura.cantidad} nota(s)
                                        </p>
                                    </div>
                                    <span className="text-sm font-semibold text-blue-700">
                                        {asignatura.promedio.toFixed(1)}
                                    </span>
                                </div>
                            ))}

                            {promedioGeneral !== null && (
                                <div className="pt-3 border-t border-gray-200 flex items-center justify-between">
                                    <span className="text-sm font-semibold text-gray-700">Promedio general</span>
                                    <span className="text-lg font-bold text-blue-700">
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
                                    className="flex flex-col gap-2 rounded-lg border border-gray-200 p-4"
                                >
                                    <div className="flex items-start justify-between">
                                        <div>
                                            <p className="text-sm font-semibold text-gray-900">
                                                {nota.asignatura?.nombre}
                                            </p>
                                            <p className="text-xs text-gray-500">
                                                {nota.grupo.grado.nombre} - Grupo {nota.grupo.nombre}
                                            </p>
                                        </div>
                                        <div className="text-right">
                                            <p className="text-lg font-bold text-blue-700">
                                                {nota.nota.toFixed(1)}
                                            </p>
                                            <p className="text-xs text-gray-500">
                                                {new Date(nota.created_at).toLocaleDateString()}
                                            </p>
                                        </div>
                                    </div>

                                    {nota.estudiante && (profile?.rol === 'administrador' || profile?.rol === 'administrativo' || profile?.rol === 'docente') && (
                                        <p className="text-xs text-gray-600">
                                            Estudiante: {nota.estudiante.nombre_completo}
                                        </p>
                                    )}

                                    {nota.observaciones && (
                                        <div className="bg-blue-50 border border-blue-100 rounded-md p-3">
                                            <p className="text-xs font-medium text-blue-800">Observaciones</p>
                                            <p className="text-sm text-blue-900 mt-1">{nota.observaciones}</p>
                                        </div>
                                    )}
                                </div>
                            ))}
                        </CardContent>
                    </Card>
                </div>
            )}
        </div>
    )
}
