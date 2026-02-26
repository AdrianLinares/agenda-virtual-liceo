import { useEffect, useMemo, useState } from 'react'
import { useAuthStore } from '@/lib/auth-store'
import { supabase } from '@/lib/supabase'
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
import { AlertCircle, CheckCircle2, FileCheck, Loader2 } from 'lucide-react'
import type { Database } from '@/types/database.types'

interface Permiso {
    id: string
    estudiante_id: string
    tipo: string
    fecha_inicio: string
    fecha_fin: string
    motivo: string
    descripcion: string | null
    soporte_url: string | null
    estado: Database['public']['Enums']['permiso_estado']
    solicitado_por: string | null
    revisado_por: string | null
    fecha_revision: string | null
    observaciones_revision: string | null
    created_at: string
    estudiante?: {
        nombre_completo: string
        email: string
    }
}

interface StudentOption {
    estudiante_id: string
    nombre_completo: string
}

const ESTADOS = [
    { value: 'pendiente', label: 'Pendiente' },
    { value: 'aprobado', label: 'Aprobado' },
    { value: 'rechazado', label: 'Rechazado' },
] as const

const TIPOS = [
    'Permiso médico',
    'Excusa médica',
    'Permiso personal',
    'Excusa disciplinaria',
    'Otro',
]

export default function PermisosPage() {
    const { profile } = useAuthStore()
    const [permisos, setPermisos] = useState<Permiso[]>([])
    const [loading, setLoading] = useState(false)
    const [saving, setSaving] = useState(false)
    const [updatingId, setUpdatingId] = useState<string | null>(null)
    const [error, setError] = useState<string | null>(null)
    const [success, setSuccess] = useState<string | null>(null)

    const [students, setStudents] = useState<StudentOption[]>([])
    const [selectedStudent, setSelectedStudent] = useState('')
    const [tipo, setTipo] = useState(TIPOS[0])
    const [motivo, setMotivo] = useState('')
    const [descripcion, setDescripcion] = useState('')
    const [fechaInicio, setFechaInicio] = useState('')
    const [fechaFin, setFechaFin] = useState('')
    const [soporteUrl, setSoporteUrl] = useState('')
    const [estadoFilter, setEstadoFilter] = useState<'todos' | Permiso['estado']>('todos')

    const isReviewer = profile?.rol === 'administrador' || profile?.rol === 'administrativo'

    useEffect(() => {
        if (profile) {
            loadPermisos()
            loadStudents()
        }
    }, [profile])

    const loadPermisos = async () => {
        if (!profile) return

        setLoading(true)
        setError(null)

        try {
            let query = supabase
                .from('permisos')
                .select(`
          *,
          estudiante:estudiante_id (nombre_completo, email)
        `)
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
                    setPermisos([])
                    setLoading(false)
                    return
                }
            }

            const { data, error } = await query
            if (error) throw error

            setPermisos((data || []) as Permiso[])
        } catch (err) {
            console.error('Error loading permisos:', err)
            setError('Error al cargar permisos y excusas')
        } finally {
            setLoading(false)
        }
    }

    const loadStudents = async () => {
        if (!profile) return

        try {
            if (profile.rol === 'estudiante') {
                setStudents([
                    {
                        estudiante_id: profile.id,
                        nombre_completo: profile.nombre_completo,
                    },
                ])
                setSelectedStudent(profile.id)
                return
            }

            if (profile.rol === 'padre') {
                const { data, error } = await supabase
                    .from('padres_estudiantes')
                    .select('estudiante:estudiante_id (id, nombre_completo)')
                    .eq('padre_id', profile.id)

                if (error) throw error

                const items = (data || []) as Array<{ estudiante?: { id: string; nombre_completo: string } }>
                const mapped = items
                    .filter((row) => row.estudiante?.id)
                    .map((row) => ({
                        estudiante_id: row.estudiante?.id as string,
                        nombre_completo: row.estudiante?.nombre_completo as string,
                    }))

                setStudents(mapped)
                if (mapped.length > 0) {
                    setSelectedStudent(mapped[0].estudiante_id)
                }
                return
            }

            const { data, error } = await supabase
                .from('profiles')
                .select('id, nombre_completo')
                .eq('rol', 'estudiante')
                .eq('activo', true)
                .order('nombre_completo', { ascending: true })

            if (error) throw error

            const items = (data || []) as Array<{ id: string; nombre_completo: string }>
            const mapped = items.map((item) => ({
                estudiante_id: item.id,
                nombre_completo: item.nombre_completo,
            }))

            setStudents(mapped)
        } catch (err) {
            console.error('Error loading students:', err)
        }
    }

    const handleCreatePermiso = async () => {
        if (!profile) return

        if (!selectedStudent || !motivo.trim() || !fechaInicio || !fechaFin) {
            setError('Completa estudiante, motivo y fechas')
            return
        }

        setSaving(true)
        setError(null)
        setSuccess(null)

        try {
            const payload = {
                estudiante_id: selectedStudent,
                tipo,
                fecha_inicio: new Date(fechaInicio).toISOString(),
                fecha_fin: new Date(fechaFin).toISOString(),
                motivo: motivo.trim(),
                descripcion: descripcion.trim() ? descripcion.trim() : null,
                soporte_url: soporteUrl.trim() ? soporteUrl.trim() : null,
                estado: 'pendiente',
                solicitado_por: profile.id,
            } satisfies Database['public']['Tables']['permisos']['Insert']

            const { error } = await (supabase as any)
                .from('permisos')
                .insert(payload)

            if (error) throw error

            setMotivo('')
            setDescripcion('')
            setFechaInicio('')
            setFechaFin('')
            setSoporteUrl('')
            setTipo(TIPOS[0])
            setSuccess('Solicitud enviada')
            await loadPermisos()
        } catch (err) {
            console.error('Error creating permiso:', err)
            setError('Error al registrar el permiso')
        } finally {
            setSaving(false)
        }
    }

    const handleUpdateEstado = async (permiso: Permiso, estado: Permiso['estado']) => {
        if (!profile) return

        setUpdatingId(permiso.id)
        setError(null)
        setSuccess(null)

        try {
            const { error } = await (supabase as any)
                .from('permisos')
                .update({
                    estado,
                    revisado_por: profile.id,
                    fecha_revision: new Date().toISOString(),
                } satisfies Database['public']['Tables']['permisos']['Update'])
                .eq('id', permiso.id)

            if (error) throw error

            setPermisos((prev) =>
                prev.map((item) =>
                    item.id === permiso.id
                        ? {
                            ...item,
                            estado,
                            revisado_por: profile.id,
                            fecha_revision: new Date().toISOString(),
                        }
                        : item
                )
            )
            setSuccess('Estado actualizado')
        } catch (err) {
            console.error('Error updating permiso:', err)
            setError('Error al actualizar el estado')
        } finally {
            setUpdatingId(null)
        }
    }

    const headerDescription = useMemo(() => {
        if (profile?.rol === 'estudiante') return 'Solicita permisos o excusas académicas'
        if (profile?.rol === 'padre') return 'Envía solicitudes de permiso para tus hijos'
        if (profile?.rol === 'docente') return 'Consulta solicitudes de permisos'
        return 'Gestiona permisos y excusas estudiantiles'
    }, [profile?.rol])

    const estadoBadge = (estado: Permiso['estado']) => {
        if (estado === 'aprobado') return 'bg-emerald-50 text-emerald-700'
        if (estado === 'rechazado') return 'bg-rose-50 text-rose-700'
        return 'bg-amber-50 text-amber-700'
    }

    const filteredPermisos = useMemo(() => {
        if (estadoFilter === 'todos') return permisos
        return permisos.filter((permiso) => permiso.estado === estadoFilter)
    }, [permisos, estadoFilter])

    return (
        <div className="space-y-6">
            <div>
                <h1 className="text-3xl font-bold text-foreground">Permisos y Excusas</h1>
                <p className="text-muted-foreground mt-1">{headerDescription}</p>
            </div>

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

            <Card>
                <CardHeader>
                    <CardTitle>Solicitar permiso</CardTitle>
                    <CardDescription>Registra una nueva solicitud</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                    <div className="grid gap-4 md:grid-cols-2">
                        <div className="space-y-2">
                            <Label>Estudiante</Label>
                            <Select value={selectedStudent} onValueChange={setSelectedStudent}>
                                <SelectTrigger>
                                    <SelectValue placeholder="Selecciona un estudiante" />
                                </SelectTrigger>
                                <SelectContent>
                                    {students.map((student) => (
                                        <SelectItem key={student.estudiante_id} value={student.estudiante_id}>
                                            {student.nombre_completo}
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>
                        <div className="space-y-2">
                            <Label>Tipo</Label>
                            <Select value={tipo} onValueChange={setTipo}>
                                <SelectTrigger>
                                    <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                    {TIPOS.map((option) => (
                                        <SelectItem key={option} value={option}>
                                            {option}
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>
                    </div>

                    <div className="grid gap-4 md:grid-cols-2">
                        <div className="space-y-2">
                            <Label>Fecha inicio</Label>
                            <Input type="date" value={fechaInicio} onChange={(e) => setFechaInicio(e.target.value)} />
                        </div>
                        <div className="space-y-2">
                            <Label>Fecha fin</Label>
                            <Input type="date" value={fechaFin} onChange={(e) => setFechaFin(e.target.value)} />
                        </div>
                    </div>

                    <div className="space-y-2">
                        <Label>Motivo</Label>
                        <Input value={motivo} onChange={(e) => setMotivo(e.target.value)} />
                    </div>

                    <div className="space-y-2">
                        <Label>Descripción</Label>
                        <Input value={descripcion} onChange={(e) => setDescripcion(e.target.value)} />
                    </div>

                    <div className="space-y-2">
                        <Label>Soporte (URL)</Label>
                        <Input value={soporteUrl} onChange={(e) => setSoporteUrl(e.target.value)} />
                    </div>

                    <Button onClick={handleCreatePermiso} disabled={saving}>
                        {saving ? (
                            <>
                                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                Enviando...
                            </>
                        ) : (
                            'Enviar solicitud'
                        )}
                    </Button>
                </CardContent>
            </Card>

            {loading && (
                <div className="flex items-center justify-center py-12">
                    <Loader2 className="h-8 w-8 animate-spin text-primary" />
                </div>
            )}

            {!loading && filteredPermisos.length === 0 && (
                <Alert>
                    <FileCheck className="h-4 w-4" />
                    <AlertDescription>
                        {estadoFilter === 'todos'
                            ? 'No hay solicitudes registradas.'
                            : `No hay solicitudes en estado ${estadoFilter}.`}
                    </AlertDescription>
                </Alert>
            )}

            {!loading && filteredPermisos.length > 0 && (
                <Card>
                    <CardHeader>
                        <CardTitle>Solicitudes recientes</CardTitle>
                        <CardDescription>Estado de permisos y excusas</CardDescription>
                        {isReviewer && (
                            <div className="max-w-xs pt-2">
                                <Label>Filtrar por estado</Label>
                                <Select value={estadoFilter} onValueChange={(value) => setEstadoFilter(value as 'todos' | Permiso['estado'])}>
                                    <SelectTrigger>
                                        <SelectValue placeholder="Selecciona estado" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="todos">Todos</SelectItem>
                                        {ESTADOS.map((estadoOption) => (
                                            <SelectItem key={estadoOption.value} value={estadoOption.value}>
                                                {estadoOption.label}
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>
                        )}
                    </CardHeader>
                    <CardContent className="space-y-4">
                        {filteredPermisos.map((permiso) => (
                            <div
                                key={permiso.id}
                                className="rounded-lg border border-border p-4 space-y-2"
                            >
                                <div className="flex flex-wrap items-center justify-between gap-2">
                                    <div>
                                        <p className="text-sm font-semibold text-foreground">
                                            {permiso.estudiante?.nombre_completo || 'Estudiante'}
                                        </p>
                                        <p className="text-xs text-muted-foreground">{permiso.tipo}</p>
                                    </div>
                                    <span className={`rounded-full px-2 py-1 text-xs font-medium ${estadoBadge(permiso.estado)}`}>
                                        {permiso.estado}
                                    </span>
                                </div>

                                <p className="text-sm text-foreground">Motivo: {permiso.motivo}</p>
                                {permiso.descripcion && (
                                    <p className="text-xs text-muted-foreground">{permiso.descripcion}</p>
                                )}

                                <p className="text-xs text-muted-foreground">
                                    {new Date(permiso.fecha_inicio).toLocaleDateString()} - {new Date(permiso.fecha_fin).toLocaleDateString()}
                                </p>

                                {permiso.soporte_url && (
                                    <a
                                        href={permiso.soporte_url}
                                        className="text-xs text-primary hover:underline"
                                        target="_blank"
                                        rel="noreferrer"
                                    >
                                        Ver soporte
                                    </a>
                                )}

                                {isReviewer && (
                                    <div className="flex flex-wrap gap-2">
                                        {ESTADOS.map((estadoOption) => (
                                            <Button
                                                key={estadoOption.value}
                                                size="sm"
                                                variant={estadoOption.value === permiso.estado ? 'default' : 'outline'}
                                                onClick={() => handleUpdateEstado(permiso, estadoOption.value)}
                                                disabled={updatingId === permiso.id}
                                            >
                                                {updatingId === permiso.id ? (
                                                    <Loader2 className="h-4 w-4 animate-spin" />
                                                ) : (
                                                    estadoOption.label
                                                )}
                                            </Button>
                                        ))}
                                    </div>
                                )}
                            </div>
                        ))}
                    </CardContent>
                </Card>
            )}
        </div>
    )
}
