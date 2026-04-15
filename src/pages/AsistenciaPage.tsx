import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import type { SupabaseClient } from '@supabase/supabase-js'
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
import { sortByGradeAndGroupName } from '@/utils/grade-order'

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
}

interface AsignaturaOption {
    id: string
    nombre: string
    codigo: string | null
}

interface GrupoOption {
    id: string
    nombre: string
    grado_nombre: string
}

interface GrupoRecordFilterOption {
    id: string
    nombre: string
    grado: {
        nombre: string
    } | null
}

interface AsignacionAsignaturaRow {
    asignatura: {
        id: string
        nombre: string
        codigo: string | null
    } | null
}

interface AsignacionGrupoRow {
    grupo: {
        id: string
        nombre: string
        grado: {
            nombre: string
        } | null
    } | null
}

interface EstudianteGrupoRow {
    estudiante: {
        id: string
        nombre_completo: string
    } | null
}

type TableWithRelationships<T> = T & { Relationships: [] }

type WritableDatabase = {
    public: {
        Tables: {
            [K in keyof Database['public']['Tables']]: TableWithRelationships<Database['public']['Tables'][K]>
        }
        Enums: Database['public']['Enums']
    }
}

const dbClient = supabase as unknown as SupabaseClient<WritableDatabase>

export default function AsistenciaPage() {
    const { profile } = useAuthStore()
    const [selectedDate, setSelectedDate] = useState<string>(() => {
        const today = new Date()
        return today.toISOString().split('T')[0]
    })
    const [asistencias, setAsistencias] = useState<AsistenciaRecord[]>([])
    const [asignaturas, setAsignaturas] = useState<AsignaturaOption[]>([])
    const [grupos, setGrupos] = useState<GrupoOption[]>([])
    const [students, setStudents] = useState<StudentOption[]>([])
    const [selectedAsignatura, setSelectedAsignatura] = useState<string>('')
    const [selectedGrupo, setSelectedGrupo] = useState<string>('')
    // attendanceMap stores the selected estado for each estudiante_id (default: 'presente')
    const [attendanceMap, setAttendanceMap] = useState<Record<string, Estado>>({})
        // backwards-compat shim: older working-tree versions temporarily used selectedStudent state
        // ensure any stray references don't crash when the variable is missing
        // (this avoids runtime ReferenceError during transitions between versions)
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        ; (globalThis as any).setSelectedStudent = (globalThis as any).setSelectedStudent ?? undefined
    const [recordGroupFilter, setRecordGroupFilter] = useState<string>('all')
    const [recordGroupOptions, setRecordGroupOptions] = useState<GrupoOption[]>([])
    const [loading, setLoading] = useState(false)
    const [saving, setSaving] = useState(false)
    const [updatingId, setUpdatingId] = useState<string | null>(null)
    const [error, setError] = useState<string | null>(null)
    const [success, setSuccess] = useState<string | null>(null)
    const [formOpen, setFormOpen] = useState(false)
    const studentSelectTriggerRef = useRef<HTMLButtonElement | null>(null)

    const isStaff = profile?.rol === 'administrador' || profile?.rol === 'administrativo' || profile?.rol === 'docente'
    const canFilterRecordsByGrupo = profile?.rol === 'administrador' || profile?.rol === 'administrativo'

    const loadAsistencias = useCallback(async () => {
        if (!profile) return

        setLoading(true)
        setError(null)

        try {
            let query = dbClient
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
                const { data: hijos } = await dbClient
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
                const { data: asignaciones, error: asignacionesError } = await dbClient
                    .from('asignaciones_docentes')
                    .select('asignatura_id')
                    .eq('docente_id', profile.id)
                    .eq('año_academico', 2026)
                    .returns<Array<{ asignatura_id: string | null }>>()

                if (asignacionesError) throw asignacionesError

                const asignaturaIds = Array.from(
                    new Set((asignaciones || []).map((asignacion) => asignacion.asignatura_id).filter(Boolean))
                )

                if (asignaturaIds.length === 0) {
                    setAsistencias([])
                    setLoading(false)
                    return
                }

                query = query.in('asignatura_id', asignaturaIds)
            } else if (profile.rol === 'administrador' || profile.rol === 'administrativo') {
                if (recordGroupFilter !== 'all') {
                    query = query.eq('grupo_id', recordGroupFilter)
                }
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
    }, [profile, recordGroupFilter, selectedDate])

    useEffect(() => {
        if (profile) {
            void loadAsistencias()
        }
    }, [loadAsistencias, profile])

    const loadRecordGroupOptions = useCallback(async () => {
        try {
            const { data, error } = await dbClient
                .from('grupos')
                .select('id, nombre, grado:grado_id (nombre)')
                .eq('año_academico', 2026)
                .returns<GrupoRecordFilterOption[]>()

            if (error) throw error

            const gruposOrdenados = sortByGradeAndGroupName(
                (data || []).map((grupo) => ({
                    id: grupo.id,
                    nombre: grupo.nombre,
                    grado_nombre: grupo.grado?.nombre ?? 'Sin grado',
                })),
                (grupo) => grupo.grado_nombre,
                (grupo) => grupo.nombre
            )

            setRecordGroupOptions(gruposOrdenados)
        } catch (err) {
            console.error('Error loading group filter options:', err)
            setError('Error al cargar grupos para filtrar asistencias')
        }
    }, [])

    const loadAsignaturasForRegistro = useCallback(async () => {
        if (!profile) return

        try {
            setError(null)
            if (profile.rol === 'docente') {
                const { data: asignaciones, error: asignacionesError } = await dbClient
                    .from('asignaciones_docentes')
                    .select('asignatura:asignatura_id (id, nombre, codigo)')
                    .eq('docente_id', profile.id)
                    .eq('año_academico', 2026)

                if (asignacionesError) throw asignacionesError

                const map = new Map<string, AsignaturaOption>()
                    ; (asignaciones as AsignacionAsignaturaRow[] | null || []).forEach((row) => {
                        if (row.asignatura?.id) {
                            map.set(row.asignatura.id, {
                                id: row.asignatura.id,
                                nombre: row.asignatura.nombre,
                                codigo: row.asignatura.codigo ?? null,
                            })
                        }
                    })

                const listado = Array.from(map.values()).sort((a, b) => a.nombre.localeCompare(b.nombre))
                setAsignaturas(listado)
                return
            }

            const { data, error } = await dbClient
                .from('asignaturas')
                .select('id, nombre, codigo')
                .order('nombre', { ascending: true })

            if (error) throw error

            setAsignaturas((data || []) as AsignaturaOption[])
        } catch (err) {
            console.error('Error loading asignaturas:', err)
            setError('Error al cargar asignaturas')
        }
    }, [profile])

    const loadGruposForAsignatura = useCallback(async () => {
        if (!profile || !selectedAsignatura) return

        try {
            setError(null)

            let query = dbClient
                .from('asignaciones_docentes')
                .select('grupo:grupo_id (id, nombre, grado:grado_id (nombre))')
                .eq('asignatura_id', selectedAsignatura)
                .eq('año_academico', 2026)

            if (profile.rol === 'docente') {
                query = query.eq('docente_id', profile.id)
            }

            const { data, error } = await query

            if (error) throw error

            const gruposMap = new Map<string, GrupoOption>()
                ; (data as AsignacionGrupoRow[] | null || []).forEach((row) => {
                    if (row.grupo?.id) {
                        gruposMap.set(row.grupo.id, {
                            id: row.grupo.id,
                            nombre: row.grupo.nombre,
                            grado_nombre: row.grupo.grado?.nombre ?? 'Sin grado',
                        })
                    }
                })

            setGrupos(
                sortByGradeAndGroupName(
                    Array.from(gruposMap.values()),
                    (grupo) => grupo.grado_nombre,
                    (grupo) => grupo.nombre
                )
            )
        } catch (err) {
            console.error('Error loading grupos:', err)
            setError('Error al cargar grupos para la asignatura')
        }
    }, [profile, selectedAsignatura])

    const loadStudentsForGrupo = useCallback(async () => {
        if (!selectedGrupo) return

        try {
            setError(null)

            const { data, error } = await dbClient
                .from('estudiantes_grupos')
                .select('estudiante:estudiante_id (id, nombre_completo)')
                .eq('año_academico', 2026)
                .eq('grupo_id', selectedGrupo)

            if (error) throw error

            const mapped = ((data as EstudianteGrupoRow[] | null) || [])
                .map((row) => ({
                    estudiante_id: row.estudiante?.id ?? '',
                    nombre_completo: row.estudiante?.nombre_completo ?? '',
                }))
                .filter((row) => row.estudiante_id)
                .sort((a, b) => a.nombre_completo.localeCompare(b.nombre_completo))

            setStudents(mapped)
        } catch (err) {
            console.error('Error loading students:', err)
            setError('Error al cargar estudiantes')
        }
    }, [selectedGrupo])

    useEffect(() => {
        if (canFilterRecordsByGrupo) {
            void loadRecordGroupOptions()
            return
        }

        setRecordGroupFilter('all')
        setRecordGroupOptions([])
    }, [canFilterRecordsByGrupo, loadRecordGroupOptions])

    useEffect(() => {
        if (profile && isStaff) {
            void loadAsignaturasForRegistro()
        }
    }, [isStaff, loadAsignaturasForRegistro, profile])

    useEffect(() => {
        if (!isStaff) return

        setSelectedGrupo('')
        setStudents([])

        if (selectedAsignatura) {
            void loadGruposForAsignatura()
        } else {
            setGrupos([])
        }
    }, [isStaff, loadGruposForAsignatura, selectedAsignatura])

    useEffect(() => {
        if (!isStaff) return

        // reset attendance map when group changes
        setAttendanceMap({})

        if (selectedGrupo) {
            void loadStudentsForGrupo()
        } else {
            setStudents([])
        }
    }, [isStaff, loadStudentsForGrupo, selectedGrupo])

    // initialize attendanceMap to 'presente' for each loaded student
    useEffect(() => {
        if (students.length === 0) return
        setAttendanceMap((prev) => {
            const next = { ...prev }
            students.forEach((s) => {
                if (!next[s.estudiante_id]) {
                    next[s.estudiante_id] = 'presente'
                }
            })
            return next
        })
    }, [students])

    const handleCreateAsistencia = async () => {
        if (!profile) return
        if (!selectedAsignatura || !selectedGrupo) {
            setFormOpen(true)
            setError('Selecciona asignatura y grupo')
            return
        }

        if (students.length === 0) {
            setError('No hay estudiantes en el grupo seleccionado')
            return
        }

        setSaving(true)
        setError(null)
        setSuccess(null)

        try {
            const studentIds = students.map((s) => s.estudiante_id)

            // Check which students already have a record for this fecha + asignatura.
            // We keep insert-only here because upsert on this table can trip RLS on the
            // UPDATE branch depending on the existing record.
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            const { data: existing, error: existingError } = await (dbClient as any)
                .from('asistencias')
                .select('estudiante_id')
                .in('estudiante_id', studentIds)
                .eq('fecha', selectedDate)
                .eq('asignatura_id', selectedAsignatura)

            if (existingError) throw existingError

            const existingIds = new Set((existing || []).map((row: { estudiante_id: string }) => row.estudiante_id))

            const rowsToInsert = students
                .filter((s) => !existingIds.has(s.estudiante_id))
                .map((s) => ({
                    estudiante_id: s.estudiante_id,
                    grupo_id: selectedGrupo,
                    fecha: selectedDate,
                    estado: attendanceMap[s.estudiante_id] ?? 'presente',
                    observaciones: null,
                    asignatura_id: selectedAsignatura,
                    registrado_por: profile.id,
                }))

            if (rowsToInsert.length === 0) {
                setAttendanceMap({})
                setSuccess('Ya existían registros para todos los estudiantes seleccionados en esta fecha y asignatura.')
                await loadAsistencias()
                requestAnimationFrame(() => {
                    studentSelectTriggerRef.current?.focus()
                })
                return
            }

            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            const { data: insertedData, error } = await (dbClient as any)
                .from('asistencias')
                .insert(rowsToInsert as Database['public']['Tables']['asistencias']['Insert'][])

            if (error) throw error

            const insertedCount = (insertedData || rowsToInsert).length
            const skippedCount = students.length - insertedCount

            // reset attendanceMap to presentes for next registration
            setAttendanceMap({})
            setSuccess(`Asistencias registradas: ${insertedCount}. Omitidas por existir: ${skippedCount}`)
            await loadAsistencias()
            requestAnimationFrame(() => {
                studentSelectTriggerRef.current?.focus()
            })
        } catch (err) {
            console.error('Error creating asistencia:', err)
            setFormOpen(true)
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
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            const { error } = await (dbClient as any)
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
                <h1 className="text-3xl font-bold text-foreground">Registro de Asistencia</h1>
                <p className="text-muted-foreground mt-1">{headerDescription}</p>
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

                        {canFilterRecordsByGrupo && (
                            <div className="space-y-2 min-w-[240px]">
                                <Label>Grupo</Label>
                                <Select value={recordGroupFilter} onValueChange={setRecordGroupFilter}>
                                    <SelectTrigger>
                                        <SelectValue placeholder="Todos los grupos" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="all">Todos los grupos</SelectItem>
                                        {recordGroupOptions.map((grupo) => (
                                            <SelectItem key={grupo.id} value={grupo.id}>
                                                {grupo.grado_nombre} • {grupo.nombre}
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>
                        )}
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
                    <Loader2 className="h-8 w-8 animate-spin text-primary" />
                </div>
            )}

            {!loading && (
                <div className="grid gap-4 md:grid-cols-4">
                    <Card>
                        <CardHeader className="pb-2">
                            <CardTitle className="text-sm font-medium text-muted-foreground">Presentes</CardTitle>
                        </CardHeader>
                        <CardContent>
                            <div className="text-2xl font-bold text-emerald-600">{resumen.presente}</div>
                        </CardContent>
                    </Card>
                    <Card>
                        <CardHeader className="pb-2">
                            <CardTitle className="text-sm font-medium text-muted-foreground">Ausentes</CardTitle>
                        </CardHeader>
                        <CardContent>
                            <div className="text-2xl font-bold text-rose-600">{resumen.ausente}</div>
                        </CardContent>
                    </Card>
                    <Card>
                        <CardHeader className="pb-2">
                            <CardTitle className="text-sm font-medium text-muted-foreground">Tarde</CardTitle>
                        </CardHeader>
                        <CardContent>
                            <div className="text-2xl font-bold text-amber-600">{resumen.tarde}</div>
                        </CardContent>
                    </Card>
                    <Card>
                        <CardHeader className="pb-2">
                            <CardTitle className="text-sm font-medium text-muted-foreground">Excusas</CardTitle>
                        </CardHeader>
                        <CardContent>
                            <div className="text-2xl font-bold text-sky-600">{resumen.excusa}</div>
                        </CardContent>
                    </Card>
                </div>
            )}

            {isStaff && (
                <div className="space-y-4">
                    <Button
                        variant={formOpen ? 'outline' : 'default'}
                        onClick={() => setFormOpen((prev) => !prev)}
                    >
                        {formOpen ? 'Ocultar formulario' : 'Registrar asistencia'}
                    </Button>

                    {formOpen && (
                        <Card>
                            <CardHeader>
                                <CardTitle>Registrar asistencia</CardTitle>
                                <CardDescription>Selecciona asignatura, grupo, estudiante y estado</CardDescription>
                            </CardHeader>
                            <CardContent className="space-y-4">
                                <div className="grid gap-4 md:grid-cols-2">
                                    <div className="space-y-2">
                                        <Label>Asignatura</Label>
                                        <Select value={selectedAsignatura} onValueChange={setSelectedAsignatura}>
                                            <SelectTrigger>
                                                <SelectValue placeholder="Selecciona una asignatura" />
                                            </SelectTrigger>
                                            <SelectContent>
                                                {asignaturas.map((asignatura) => (
                                                    <SelectItem key={asignatura.id} value={asignatura.id}>
                                                        {asignatura.nombre}
                                                    </SelectItem>
                                                ))}
                                            </SelectContent>
                                        </Select>
                                    </div>

                                    <div className="space-y-2">
                                        <Label>Grupo</Label>
                                        <Select
                                            value={selectedGrupo}
                                            onValueChange={setSelectedGrupo}
                                            disabled={!selectedAsignatura}
                                        >
                                            <SelectTrigger>
                                                <SelectValue placeholder="Selecciona un grupo" />
                                            </SelectTrigger>
                                            <SelectContent>
                                                {grupos.map((grupo) => (
                                                    <SelectItem key={grupo.id} value={grupo.id}>
                                                        {grupo.grado_nombre} • {grupo.nombre}
                                                    </SelectItem>
                                                ))}
                                            </SelectContent>
                                        </Select>
                                    </div>
                                </div>

                                {/* Students list with radio buttons (default: Presente) */}
                                <div>
                                    <Label>Estudiantes</Label>
                                    <div className="space-y-2 mt-2">
                                        {students.length === 0 && (
                                            <p className="text-sm text-muted-foreground">Selecciona un grupo para ver sus estudiantes</p>
                                        )}

                                        {students.map((s) => {
                                            const estado = attendanceMap[s.estudiante_id] ?? 'presente'
                                            return (
                                                <div
                                                    key={s.estudiante_id}
                                                    className="flex flex-col items-start gap-2 rounded-lg border border-border p-3 md:flex-row md:items-center md:justify-between"
                                                >
                                                    <div>
                                                        <p className="text-sm font-semibold text-foreground">{s.nombre_completo}</p>
                                                    </div>

                                                    <div className="flex items-center gap-2 mt-2 md:mt-0">
                                                        {(['presente', 'ausente', 'tarde', 'excusa'] as Estado[]).map((e) => {
                                                            const initial = e.charAt(0).toUpperCase()
                                                            const isActive = estado === e
                                                            const base = "inline-flex items-center justify-center w-8 h-8 rounded-full text-xs font-medium"
                                                            const color = e === 'presente' ? (isActive ? 'bg-emerald-600 text-white' : 'bg-emerald-50 text-emerald-700')
                                                                : e === 'ausente' ? (isActive ? 'bg-rose-600 text-white' : 'bg-rose-50 text-rose-700')
                                                                    : e === 'tarde' ? (isActive ? 'bg-amber-600 text-white' : 'bg-amber-50 text-amber-700')
                                                                        : (isActive ? 'bg-sky-600 text-white' : 'bg-sky-50 text-sky-700')

                                                            return (
                                                                <button
                                                                    key={e}
                                                                    type="button"
                                                                    aria-pressed={isActive}
                                                                    aria-label={`${s.nombre_completo} - ${e}`}
                                                                    onClick={() => setAttendanceMap((prev) => ({ ...prev, [s.estudiante_id]: e }))}
                                                                    className={`${base} ${color}`}
                                                                >
                                                                    {initial}
                                                                </button>
                                                            )
                                                        })}
                                                    </div>
                                                </div>
                                            )
                                        })}
                                    </div>
                                </div>

                                <div className="flex items-center gap-3">
                                    <Button onClick={handleCreateAsistencia} disabled={saving || students.length === 0}>
                                        {saving ? (
                                            <>
                                                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                                Guardando...
                                            </>
                                        ) : (
                                            'Registrar asistencias'
                                        )}
                                    </Button>

                                    <Button variant="ghost" onClick={() => {
                                        // reset selections
                                        setSelectedAsignatura('')
                                        setSelectedGrupo('')
                                        setStudents([])
                                        setAttendanceMap({})
                                    }}>
                                        Cancelar
                                    </Button>
                                </div>
                            </CardContent>
                        </Card>
                    )}
                </div>
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
                                className="flex flex-col gap-3 rounded-lg border border-border p-4 md:flex-row md:items-center md:justify-between"
                            >
                                <div>
                                    <p className="text-sm font-semibold text-foreground">
                                        {item.estudiante.nombre_completo}
                                    </p>
                                    <p className="text-xs text-muted-foreground">
                                        {item.grupo.grado.nombre} - Grupo {item.grupo.nombre}
                                    </p>
                                    {item.asignatura?.nombre && (
                                        <p className="text-xs text-muted-foreground">Asignatura: {item.asignatura.nombre}</p>
                                    )}
                                    {item.observaciones && (
                                        <p className="text-xs text-muted-foreground mt-1">Obs: {item.observaciones}</p>
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
