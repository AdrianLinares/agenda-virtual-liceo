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
import { AlertCircle, CheckCircle2, Loader2, UserCheck } from 'lucide-react'
import type { Database } from '@/types/database.types'

interface Citacion {
    id: string
    estudiante_id: string
    citado: string
    motivo: string
    descripcion: string | null
    fecha_citacion: string
    lugar: string | null
    creado_por: string | null
    asistio: boolean | null
    observaciones: string | null
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

const CITADOS = ['Estudiante', 'Padre/Madre', 'Acudiente']

export default function CitacionesPage() {
    const { profile } = useAuthStore()
    const [citaciones, setCitaciones] = useState<Citacion[]>([])
    const [loading, setLoading] = useState(false)
    const [saving, setSaving] = useState(false)
    const [updatingId, setUpdatingId] = useState<string | null>(null)
    const [error, setError] = useState<string | null>(null)
    const [success, setSuccess] = useState<string | null>(null)

    const [students, setStudents] = useState<StudentOption[]>([])
    const [selectedStudent, setSelectedStudent] = useState('')
    const [citado, setCitado] = useState(CITADOS[0])
    const [motivo, setMotivo] = useState('')
    const [descripcion, setDescripcion] = useState('')
    const [fechaCitacion, setFechaCitacion] = useState('')
    const [lugar, setLugar] = useState('')

    const isStaff = profile?.rol === 'administrador' || profile?.rol === 'administrativo' || profile?.rol === 'docente'

    useEffect(() => {
        if (profile) {
            loadCitaciones()
            loadStudents()
        }
    }, [profile])

    const loadCitaciones = async () => {
        if (!profile) return

        setLoading(true)
        setError(null)

        try {
            let query = supabase
                .from('citaciones')
                .select(`
          *,
          estudiante:estudiante_id (nombre_completo, email)
        `)
                .order('fecha_citacion', { ascending: false })

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
                    setCitaciones([])
                    setLoading(false)
                    return
                }
            }

            const { data, error } = await query
            if (error) throw error

            setCitaciones((data || []) as Citacion[])
        } catch (err) {
            console.error('Error loading citaciones:', err)
            setError('Error al cargar las citaciones')
        } finally {
            setLoading(false)
        }
    }

    const loadStudents = async () => {
        if (!profile) return

        try {
            if (profile.rol === 'estudiante') {
                setStudents([
                    { estudiante_id: profile.id, nombre_completo: profile.nombre_completo },
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

    const handleCreateCitacion = async () => {
        if (!profile) return

        if (!selectedStudent || !motivo.trim() || !fechaCitacion) {
            setError('Completa estudiante, motivo y fecha de citación')
            return
        }

        setSaving(true)
        setError(null)
        setSuccess(null)

        try {
            const payload = {
                estudiante_id: selectedStudent,
                citado,
                motivo: motivo.trim(),
                descripcion: descripcion.trim() ? descripcion.trim() : null,
                fecha_citacion: new Date(fechaCitacion).toISOString(),
                lugar: lugar.trim() ? lugar.trim() : null,
                creado_por: profile.id,
                asistio: null,
                observaciones: null,
            } satisfies Database['public']['Tables']['citaciones']['Insert']

            const { error } = await (supabase as any)
                .from('citaciones')
                .insert(payload)

            if (error) throw error

            setCitado(CITADOS[0])
            setMotivo('')
            setDescripcion('')
            setFechaCitacion('')
            setLugar('')
            setSuccess('Citación registrada')
            await loadCitaciones()
        } catch (err) {
            console.error('Error creating citacion:', err)
            setError('Error al registrar la citación')
        } finally {
            setSaving(false)
        }
    }

    const handleUpdateAsistencia = async (citacion: Citacion, asistio: boolean) => {
        if (!profile) return

        setUpdatingId(citacion.id)
        setError(null)
        setSuccess(null)

        try {
            const { error } = await (supabase as any)
                .from('citaciones')
                .update({ asistio } satisfies Database['public']['Tables']['citaciones']['Update'])
                .eq('id', citacion.id)

            if (error) throw error

            setCitaciones((prev) =>
                prev.map((item) =>
                    item.id === citacion.id ? { ...item, asistio } : item
                )
            )
            setSuccess('Asistencia actualizada')
        } catch (err) {
            console.error('Error updating citacion:', err)
            setError('Error al actualizar la asistencia')
        } finally {
            setUpdatingId(null)
        }
    }

    const headerDescription = useMemo(() => {
        if (profile?.rol === 'estudiante') return 'Consulta tus citaciones programadas'
        if (profile?.rol === 'padre') return 'Revisa las citaciones de tus hijos'
        if (profile?.rol === 'docente') return 'Gestiona citaciones con estudiantes y acudientes'
        return 'Gestión de citaciones institucionales'
    }, [profile?.rol])

    return (
        <div className="space-y-6">
            <div>
                <h1 className="text-3xl font-bold text-gray-900">Citaciones</h1>
                <p className="text-gray-600 mt-1">{headerDescription}</p>
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

            {isStaff && (
                <Card>
                    <CardHeader>
                        <CardTitle>Programar citación</CardTitle>
                        <CardDescription>Registra una nueva citación</CardDescription>
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
                                <Label>Citado</Label>
                                <Select value={citado} onValueChange={setCitado}>
                                    <SelectTrigger>
                                        <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {CITADOS.map((option) => (
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
                                <Label>Fecha de citación</Label>
                                <Input
                                    type="datetime-local"
                                    value={fechaCitacion}
                                    onChange={(e) => setFechaCitacion(e.target.value)}
                                />
                            </div>
                            <div className="space-y-2">
                                <Label>Lugar</Label>
                                <Input value={lugar} onChange={(e) => setLugar(e.target.value)} />
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

                        <Button onClick={handleCreateCitacion} disabled={saving}>
                            {saving ? (
                                <>
                                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                    Guardando...
                                </>
                            ) : (
                                'Programar citación'
                            )}
                        </Button>
                    </CardContent>
                </Card>
            )}

            {loading && (
                <div className="flex items-center justify-center py-12">
                    <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
                </div>
            )}

            {!loading && citaciones.length === 0 && (
                <Alert>
                    <UserCheck className="h-4 w-4" />
                    <AlertDescription>No hay citaciones registradas.</AlertDescription>
                </Alert>
            )}

            {!loading && citaciones.length > 0 && (
                <Card>
                    <CardHeader>
                        <CardTitle>Citaciones programadas</CardTitle>
                        <CardDescription>Registro de citaciones recientes</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        {citaciones.map((item) => (
                            <div key={item.id} className="rounded-lg border border-gray-200 p-4 space-y-2">
                                <div className="flex flex-wrap items-center justify-between gap-2">
                                    <div>
                                        <p className="text-sm font-semibold text-gray-900">
                                            {item.estudiante?.nombre_completo || 'Estudiante'}
                                        </p>
                                        <p className="text-xs text-gray-500">Citado: {item.citado}</p>
                                    </div>
                                    {item.asistio !== null && (
                                        <span
                                            className={`rounded-full px-2 py-1 text-xs font-medium ${item.asistio
                                                    ? 'bg-emerald-50 text-emerald-700'
                                                    : 'bg-rose-50 text-rose-700'
                                                }`}
                                        >
                                            {item.asistio ? 'Asistió' : 'No asistió'}
                                        </span>
                                    )}
                                </div>

                                <p className="text-sm font-medium text-gray-900">{item.motivo}</p>
                                {item.descripcion && (
                                    <p className="text-sm text-gray-700">{item.descripcion}</p>
                                )}

                                <p className="text-xs text-gray-500">
                                    {new Date(item.fecha_citacion).toLocaleString()}
                                    {item.lugar && ` • ${item.lugar}`}
                                </p>

                                {item.observaciones && (
                                    <p className="text-xs text-gray-600">Observaciones: {item.observaciones}</p>
                                )}

                                {isStaff && item.asistio === null && (
                                    <div className="flex flex-wrap gap-2 pt-2">
                                        <Button
                                            size="sm"
                                            variant="outline"
                                            onClick={() => handleUpdateAsistencia(item, true)}
                                            disabled={updatingId === item.id}
                                        >
                                            {updatingId === item.id ? (
                                                <Loader2 className="h-4 w-4 animate-spin" />
                                            ) : (
                                                'Asistió'
                                            )}
                                        </Button>
                                        <Button
                                            size="sm"
                                            variant="outline"
                                            onClick={() => handleUpdateAsistencia(item, false)}
                                            disabled={updatingId === item.id}
                                        >
                                            {updatingId === item.id ? (
                                                <Loader2 className="h-4 w-4 animate-spin" />
                                            ) : (
                                                'No asistió'
                                            )}
                                        </Button>
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
