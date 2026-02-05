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
import { AlertCircle, CheckCircle2, ClipboardList, Loader2 } from 'lucide-react'
import type { Database } from '@/types/database.types'

interface Seguimiento {
    id: string
    estudiante_id: string
    tipo: string
    titulo: string
    descripcion: string
    fecha_registro: string
    registrado_por: string | null
    acciones_tomadas: string | null
    requiere_seguimiento: boolean
    fecha_seguimiento: string | null
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

const TIPOS = ['Académico', 'Disciplinario', 'Convivencia', 'Otro']

export default function SeguimientoPage() {
    const { profile } = useAuthStore()
    const [seguimientos, setSeguimientos] = useState<Seguimiento[]>([])
    const [loading, setLoading] = useState(false)
    const [saving, setSaving] = useState(false)
    const [error, setError] = useState<string | null>(null)
    const [success, setSuccess] = useState<string | null>(null)

    const [students, setStudents] = useState<StudentOption[]>([])
    const [selectedStudent, setSelectedStudent] = useState('')
    const [tipo, setTipo] = useState(TIPOS[0])
    const [titulo, setTitulo] = useState('')
    const [descripcion, setDescripcion] = useState('')
    const [acciones, setAcciones] = useState('')
    const [requiereSeguimiento, setRequiereSeguimiento] = useState(false)
    const [fechaSeguimiento, setFechaSeguimiento] = useState('')

    const canRegister = profile?.rol === 'administrador' || profile?.rol === 'administrativo' || profile?.rol === 'docente'

    useEffect(() => {
        if (profile) {
            loadSeguimientos()
            loadStudents()
        }
    }, [profile])

    const loadSeguimientos = async () => {
        if (!profile) return

        setLoading(true)
        setError(null)

        try {
            let query = supabase
                .from('seguimientos')
                .select(`
          *,
          estudiante:estudiante_id (nombre_completo, email)
        `)
                .order('fecha_registro', { ascending: false })

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
                    setSeguimientos([])
                    setLoading(false)
                    return
                }
            }

            const { data, error } = await query
            if (error) throw error

            setSeguimientos((data || []) as Seguimiento[])
        } catch (err) {
            console.error('Error loading seguimientos:', err)
            setError('Error al cargar el seguimiento')
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

    const handleCreateSeguimiento = async () => {
        if (!profile) return

        if (!selectedStudent || !titulo.trim() || !descripcion.trim()) {
            setError('Completa estudiante, título y descripción')
            return
        }

        setSaving(true)
        setError(null)
        setSuccess(null)

        try {
            const payload = {
                estudiante_id: selectedStudent,
                tipo,
                titulo: titulo.trim(),
                descripcion: descripcion.trim(),
                fecha_registro: new Date().toISOString(),
                registrado_por: profile.id,
                acciones_tomadas: acciones.trim() ? acciones.trim() : null,
                requiere_seguimiento: requiereSeguimiento,
                fecha_seguimiento: fechaSeguimiento ? new Date(fechaSeguimiento).toISOString() : null,
            } satisfies Database['public']['Tables']['seguimientos']['Insert']

            const { error } = await (supabase as any)
                .from('seguimientos')
                .insert(payload)

            if (error) throw error

            setTipo(TIPOS[0])
            setTitulo('')
            setDescripcion('')
            setAcciones('')
            setRequiereSeguimiento(false)
            setFechaSeguimiento('')
            setSuccess('Registro creado')
            await loadSeguimientos()
        } catch (err) {
            console.error('Error creating seguimiento:', err)
            setError('Error al registrar el seguimiento')
        } finally {
            setSaving(false)
        }
    }

    const headerDescription = useMemo(() => {
        if (profile?.rol === 'estudiante') return 'Consulta tu historial académico y disciplinario'
        if (profile?.rol === 'padre') return 'Revisa el seguimiento académico de tus hijos'
        if (profile?.rol === 'docente') return 'Registra y consulta seguimientos de estudiantes'
        return 'Gestión de seguimiento estudiantil'
    }, [profile?.rol])

    return (
        <div className="space-y-6">
            <div>
                <h1 className="text-3xl font-bold text-gray-900">Seguimiento</h1>
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

            {canRegister && (
                <Card>
                    <CardHeader>
                        <CardTitle>Registrar seguimiento</CardTitle>
                        <CardDescription>
                            Crea un nuevo registro de seguimiento académico o disciplinario
                        </CardDescription>
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

                        <div className="space-y-2">
                            <Label>Título</Label>
                            <Input value={titulo} onChange={(e) => setTitulo(e.target.value)} />
                        </div>

                        <div className="space-y-2">
                            <Label>Descripción</Label>
                            <Input value={descripcion} onChange={(e) => setDescripcion(e.target.value)} />
                        </div>

                        <div className="space-y-2">
                            <Label>Acciones tomadas</Label>
                            <Input value={acciones} onChange={(e) => setAcciones(e.target.value)} />
                        </div>

                        <div className="grid gap-4 md:grid-cols-2">
                            <div className="flex items-center gap-2 pt-7">
                                <input
                                    id="requiere-seguimiento"
                                    type="checkbox"
                                    className="h-4 w-4 rounded border-gray-300"
                                    checked={requiereSeguimiento}
                                    onChange={(e) => setRequiereSeguimiento(e.target.checked)}
                                />
                                <Label htmlFor="requiere-seguimiento">Requiere seguimiento</Label>
                            </div>
                            <div className="space-y-2">
                                <Label>Fecha de seguimiento</Label>
                                <Input
                                    type="date"
                                    value={fechaSeguimiento}
                                    onChange={(e) => setFechaSeguimiento(e.target.value)}
                                />
                            </div>
                        </div>

                        <Button onClick={handleCreateSeguimiento} disabled={saving}>
                            {saving ? (
                                <>
                                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                    Guardando...
                                </>
                            ) : (
                                'Registrar'
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

            {!loading && seguimientos.length === 0 && (
                <Alert>
                    <ClipboardList className="h-4 w-4" />
                    <AlertDescription>No hay registros de seguimiento.</AlertDescription>
                </Alert>
            )}

            {!loading && seguimientos.length > 0 && (
                <Card>
                    <CardHeader>
                        <CardTitle>Historial de seguimiento</CardTitle>
                        <CardDescription>Registros más recientes</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        {seguimientos.map((item) => (
                            <div key={item.id} className="rounded-lg border border-gray-200 p-4 space-y-2">
                                <div className="flex flex-wrap items-center justify-between gap-2">
                                    <div>
                                        <p className="text-sm font-semibold text-gray-900">
                                            {item.estudiante?.nombre_completo || 'Estudiante'}
                                        </p>
                                        <p className="text-xs text-gray-500">{item.tipo}</p>
                                    </div>
                                    <span className="text-xs text-gray-500">
                                        {new Date(item.fecha_registro).toLocaleDateString()}
                                    </span>
                                </div>

                                <p className="text-sm font-medium text-gray-900">{item.titulo}</p>
                                <p className="text-sm text-gray-700">{item.descripcion}</p>

                                {item.acciones_tomadas && (
                                    <p className="text-xs text-gray-600">Acciones: {item.acciones_tomadas}</p>
                                )}

                                {item.requiere_seguimiento && (
                                    <p className="text-xs text-amber-600">
                                        Requiere seguimiento{item.fecha_seguimiento ? ` • ${new Date(item.fecha_seguimiento).toLocaleDateString()}` : ''}
                                    </p>
                                )}
                            </div>
                        ))}
                    </CardContent>
                </Card>
            )}
        </div>
    )
}
