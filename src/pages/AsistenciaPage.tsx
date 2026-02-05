import { useEffect, useMemo, useState } from 'react'
import { useAuthStore } from '@/lib/auth-store'
import { supabase } from '@/lib/supabase'
import type { Database } from '@/types/database.types'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { AlertCircle, CheckCircle2, Clock, Loader2, UserCheck } from 'lucide-react'

const ESTADOS = ['presente', 'ausente', 'tarde', 'excusa'] as const

type Estado = typeof ESTADOS[number]

interface AsistenciaRecord {
    id: string
    estudiante_id: string
    grupo_id: string
    fecha: string
    estado: Estado
    observaciones: string | null
    registrado_por: string | null
    created_at: string
    asignatura: {
        nombre: string
    } | null
    estudiante: {
        nombre_completo: string
        email: string
    }
    grupo: {
        nombre: string
        grado: {
            nombre: string
        }
    }
}

interface StudentOption {
    estudiante_id: string
    nombre_completo: string
    grupo_id: string
    grupo_nombre: string
    grado_nombre: string
}

export default function AsistenciaPage() {
    const { profile } = useAuthStore()
    const [selectedDate, setSelectedDate] = useState<string>(() => {
        const today = new Date()
        return today.toISOString().split('T')[0]
    })
    const [asistencias, setAsistencias] = useState<AsistenciaRecord[]>([])
    const [students, setStudents] = useState<StudentOption[]>([])
    const [selectedStudent, setSelectedStudent] = useState<string>('')
    const [selectedEstado, setSelectedEstado] = useState<Estado>('presente')
    const [observaciones, setObservaciones] = useState('')
    const [loading, setLoading] = useState(false)
    const [saving, setSaving] = useState(false)
    const [updatingId, setUpdatingId] = useState<string | null>(null)
    const [error, setError] = useState<string | null>(null)
    const [success, setSuccess] = useState<string | null>(null)

    const isStaff = profile?.rol === 'administrador' || profile?.rol === 'administrativo' || profile?.rol === 'docente'

    useEffect(() => {
        if (profile) {
            loadAsistencias()
        }
    }, [profile, selectedDate])

    useEffect(() => {
        if (profile && isStaff) {
            loadStudents()
        }
    }, [profile, isStaff])

    const loadAsistencias = async () => {
        if (!profile) return

        setLoading(true)
        setError(null)

        try {
            let query = supabase
                .from('asistencias')
                .select(`
          *,
          estudiante:estudiante_id (nombre_completo, email),
          grupo:grupo_id (nombre, grado:grado_id (nombre)),
          asignatura:asignatura_id (nombre)
        `)
                .eq('fecha', selectedDate)
                .order('created_at', { ascending: false })

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
                } else {
                    setAsistencias([])
                    setLoading(false)
                    return
                }
            } else if (profile.rol === 'docente') {
                query = query.eq('registrado_por', profile.id)
            }

            const { data, error } = await query

            if (error) throw error
            setAsistencias((data || []) as AsistenciaRecord[])
        } catch (err) {
            console.error('Error loading asistencias:', err)
            setError('Error al cargar el registro de asistencia')
        } finally {
            setLoading(false)
        }
    }

    const loadStudents = async () => {
        if (!profile) return

        try {
            setError(null)
            let grupoIds: string[] | null = null

            if (profile.rol === 'docente') {
                const { data: asignaciones, error: asignacionesError } = await supabase
                    .from('asignaciones_docentes')
                    .select('grupo_id')
                    .eq('docente_id', profile.id)
                    .eq('año_academico', 2026)
                    .returns<Array<{ grupo_id: string }>>()

                if (asignacionesError) throw asignacionesError
                grupoIds = asignaciones?.map((a) => a.grupo_id) || []

                if (grupoIds.length === 0) {
                    setStudents([])
                    return
                }
            }

            let estudiantesQuery = supabase
                .from('estudiantes_grupos')
                .select(`
          estudiante:estudiante_id (id, nombre_completo),
          grupo:grupo_id (id, nombre, grado:grado_id (nombre))
        `)
                .eq('año_academico', 2026)

            if (grupoIds) {
                estudiantesQuery = estudiantesQuery.in('grupo_id', grupoIds)
            }

            const { data, error } = await estudiantesQuery

            if (error) throw error

            const mapped = (data || [])
                .map((row: any) => ({
                    estudiante_id: row.estudiante?.id as string,
                    nombre_completo: row.estudiante?.nombre_completo as string,
                    grupo_id: row.grupo?.id as string,
                    grupo_nombre: row.grupo?.nombre as string,
                    grado_nombre: row.grupo?.grado?.nombre as string,
                }))
                .filter((row) => row.estudiante_id && row.grupo_id)
                .sort((a, b) => a.nombre_completo.localeCompare(b.nombre_completo))

            setStudents(mapped)
        } catch (err) {
            console.error('Error loading students:', err)
            setError('Error al cargar estudiantes')
        }
    }

    const handleCreateAsistencia = async () => {
        if (!profile) return
        if (!selectedStudent) {
            setError('Selecciona un estudiante')
            return
        }

        const student = students.find((s) => s.estudiante_id === selectedStudent)
        if (!student) {
            setError('Estudiante inválido')
            return
        }

        setSaving(true)
        setError(null)
        setSuccess(null)

        try {
            const { error } = await (supabase as any)
                .from('asistencias')
                .insert({
                    estudiante_id: student.estudiante_id,
                    grupo_id: student.grupo_id,
                    fecha: selectedDate,
                    estado: selectedEstado,
                    observaciones: observaciones.trim() ? observaciones.trim() : null,
                    asignatura_id: null,
                    registrado_por: profile.id,
                } as Database['public']['Tables']['asistencias']['Insert'])

            if (error) throw error

            setSelectedStudent('')
            setSelectedEstado('presente')
            setObservaciones('')
            setSuccess('Asistencia registrada correctamente')
            await loadAsistencias()
        } catch (err) {
            console.error('Error creating asistencia:', err)
            setError('Error al registrar la asistencia')
        } finally {
            setSaving(false)
        }
    }

    const handleUpdateEstado = async (id: string, estado: Estado) => {
        setUpdatingId(id)
        setError(null)
        setSuccess(null)

        try {
            const { error } = await (supabase as any)
                .from('asistencias')
                .update({ estado } as Database['public']['Tables']['asistencias']['Update'])
                .eq('id', id)

            if (error) throw error

            setAsistencias((prev) =>
                prev.map((item) => (item.id === id ? { ...item, estado } : item))
            )
            setSuccess('Estado actualizado')
        } catch (err) {
            console.error('Error updating asistencia:', err)
            setError('Error al actualizar el estado')
        } finally {
            setUpdatingId(null)
        }
    }

    const resumen = useMemo(() => {
        const base = { presente: 0, ausente: 0, tarde: 0, excusa: 0 }
        asistencias.forEach((item) => {
            base[item.estado] += 1
        })
        return base
    }, [asistencias])

    const headerDescription = useMemo(() => {
        if (profile?.rol === 'estudiante') return 'Consulta tu asistencia por fecha'
        if (profile?.rol === 'padre') return 'Consulta la asistencia de tus hijos'
        if (profile?.rol === 'docente') return 'Registra y revisa la asistencia de tus grupos'
        return 'Gestión y revisión de asistencia'
    }, [profile?.rol])

    return (
        <div className="space-y-6">
            <div>
                <h1 className="text-3xl font-bold text-gray-900">Registro de Asistencia</h1>
                <p className="text-gray-600 mt-1">{headerDescription}</p>
            </div>

            <Card>
                <CardContent className="pt-6">
                    <div className="flex flex-wrap items-end gap-4">
                        <div className="space-y-2">
                            <Label htmlFor="fecha">Fecha</Label>
                            <Input
                                id="fecha"
                                type="date"
                                value={selectedDate}
                                onChange={(event) => setSelectedDate(event.target.value)}
                                className="w-48"
                            />
                        </div>
                    </div>
                </CardContent>
            </Card>

            {error && (
                <Alert variant="destructive">
                    <AlertCircle className="h-4 w-4" />
                    <AlertDescription>{error}</AlertDescription>
                </Alert>
            )}

            {success && (
                <Alert>
                    <CheckCircle2 className="h-4 w-4" />
                    <AlertDescription>{success}</AlertDescription>
                </Alert>
            )}

            {loading && (
                <div className="flex items-center justify-center py-12">
                    <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
                </div>
            )}

            {!loading && (
                <div className="grid gap-4 md:grid-cols-4">
                    <Card>
                        <CardHeader className="pb-2">
                            <CardTitle className="text-sm font-medium text-gray-600">Presentes</CardTitle>
                        </CardHeader>
                        <CardContent>
                            <div className="text-2xl font-bold text-emerald-600">{resumen.presente}</div>
                        </CardContent>
                    </Card>
                    <Card>
                        <CardHeader className="pb-2">
                            <CardTitle className="text-sm font-medium text-gray-600">Ausentes</CardTitle>
                        </CardHeader>
                        <CardContent>
                            <div className="text-2xl font-bold text-rose-600">{resumen.ausente}</div>
                        </CardContent>
                    </Card>
                    <Card>
                        <CardHeader className="pb-2">
                            <CardTitle className="text-sm font-medium text-gray-600">Tarde</CardTitle>
                        </CardHeader>
                        <CardContent>
                            <div className="text-2xl font-bold text-amber-600">{resumen.tarde}</div>
                        </CardContent>
                    </Card>
                    <Card>
                        <CardHeader className="pb-2">
                            <CardTitle className="text-sm font-medium text-gray-600">Excusas</CardTitle>
                        </CardHeader>
                        <CardContent>
                            <div className="text-2xl font-bold text-sky-600">{resumen.excusa}</div>
                        </CardContent>
                    </Card>
                </div>
            )}

            {isStaff && (
                <Card>
                    <CardHeader>
                        <CardTitle>Registrar asistencia</CardTitle>
                        <CardDescription>
                            Selecciona el estudiante y su estado de asistencia
                        </CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <div className="grid gap-4 md:grid-cols-3">
                            <div className="space-y-2">
                                <Label>Estudiante</Label>
                                <Select value={selectedStudent} onValueChange={setSelectedStudent}>
                                    <SelectTrigger>
                                        <SelectValue placeholder="Selecciona un estudiante" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {students.map((student) => (
                                            <SelectItem key={student.estudiante_id} value={student.estudiante_id}>
                                                {student.nombre_completo} • {student.grado_nombre} {student.grupo_nombre}
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>

                            <div className="space-y-2">
                                <Label>Estado</Label>
                                <Select value={selectedEstado} onValueChange={(value) => setSelectedEstado(value as Estado)}>
                                    <SelectTrigger>
                                        <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {ESTADOS.map((estado) => (
                                            <SelectItem key={estado} value={estado}>
                                                {estado.charAt(0).toUpperCase() + estado.slice(1)}
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>

                            <div className="space-y-2">
                                <Label>Observaciones</Label>
                                <Input
                                    value={observaciones}
                                    onChange={(event) => setObservaciones(event.target.value)}
                                    placeholder="Opcional"
                                />
                            </div>
                        </div>

                        <div>
                            <Button onClick={handleCreateAsistencia} disabled={saving}>
                                {saving ? (
                                    <>
                                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                        Guardando...
                                    </>
                                ) : (
                                    'Registrar'
                                )}
                            </Button>
                        </div>
                    </CardContent>
                </Card>
            )}

            {!loading && asistencias.length === 0 && (
                <Alert>
                    <UserCheck className="h-4 w-4" />
                    <AlertDescription>
                        No hay registros de asistencia para la fecha seleccionada.
                    </AlertDescription>
                </Alert>
            )}

            {!loading && asistencias.length > 0 && (
                <Card>
                    <CardHeader>
                        <CardTitle>Detalle de asistencia</CardTitle>
                        <CardDescription>
                            Listado de estudiantes con su estado registrado
                        </CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-3">
                        {asistencias.map((item) => (
                            <div
                                key={item.id}
                                className="flex flex-col gap-3 rounded-lg border border-gray-200 p-4 md:flex-row md:items-center md:justify-between"
                            >
                                <div>
                                    <p className="text-sm font-semibold text-gray-900">
                                        {item.estudiante.nombre_completo}
                                    </p>
                                    <p className="text-xs text-gray-500">
                                        {item.grupo.grado.nombre} - Grupo {item.grupo.nombre}
                                    </p>
                                    {item.asignatura?.nombre && (
                                        <p className="text-xs text-gray-500">Asignatura: {item.asignatura.nombre}</p>
                                    )}
                                    {item.observaciones && (
                                        <p className="text-xs text-gray-600 mt-1">Obs: {item.observaciones}</p>
                                    )}
                                </div>

                                <div className="flex items-center gap-3">
                                    <span
                                        className={`inline-flex items-center gap-1 rounded-full px-3 py-1 text-xs font-medium ${item.estado === 'presente'
                                            ? 'bg-emerald-50 text-emerald-700'
                                            : item.estado === 'ausente'
                                                ? 'bg-rose-50 text-rose-700'
                                                : item.estado === 'tarde'
                                                    ? 'bg-amber-50 text-amber-700'
                                                    : 'bg-sky-50 text-sky-700'
                                            }`}
                                    >
                                        {item.estado === 'tarde' && <Clock className="h-3 w-3" />}
                                        {item.estado === 'presente' && <CheckCircle2 className="h-3 w-3" />}
                                        {item.estado.charAt(0).toUpperCase() + item.estado.slice(1)}
                                    </span>

                                    {isStaff && (
                                        <Select
                                            value={item.estado}
                                            onValueChange={(value) => handleUpdateEstado(item.id, value as Estado)}
                                            disabled={updatingId === item.id}
                                        >
                                            <SelectTrigger className="w-32">
                                                <SelectValue />
                                            </SelectTrigger>
                                            <SelectContent>
                                                {ESTADOS.map((estado) => (
                                                    <SelectItem key={estado} value={estado}>
                                                        {estado.charAt(0).toUpperCase() + estado.slice(1)}
                                                    </SelectItem>
                                                ))}
                                            </SelectContent>
                                        </Select>
                                    )}
                                </div>
                            </div>
                        ))}
                    </CardContent>
                </Card>
            )}
        </div>
    )
}
