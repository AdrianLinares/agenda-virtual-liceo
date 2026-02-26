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
import { AlertCircle, CalendarDays, CheckCircle2, Loader2, MapPin } from 'lucide-react'
import type { Database } from '@/types/database.types'

interface Evento {
    id: string
    titulo: string
    descripcion: string | null
    tipo: string
    fecha_inicio: string
    fecha_fin: string | null
    todo_el_dia: boolean
    lugar: string | null
    destinatarios: string[]
    creado_por: string | null
    created_at: string
}

const DESTINATARIOS = [
    { value: 'todos', label: 'Todos' },
    { value: 'estudiante', label: 'Estudiantes' },
    { value: 'padre', label: 'Padres' },
    { value: 'docente', label: 'Docentes' },
    { value: 'administrativo', label: 'Administrativos' },
    { value: 'administrador', label: 'Administradores' },
]

export default function CalendarioPage() {
    const { profile } = useAuthStore()
    const [eventos, setEventos] = useState<Evento[]>([])
    const [loading, setLoading] = useState(false)
    const [saving, setSaving] = useState(false)
    const [error, setError] = useState<string | null>(null)
    const [success, setSuccess] = useState<string | null>(null)

    const today = new Date()
    const [startDate, setStartDate] = useState<string>(() => today.toISOString().split('T')[0])
    const [endDate, setEndDate] = useState<string>(() => {
        const next = new Date()
        next.setDate(today.getDate() + 7)
        return next.toISOString().split('T')[0]
    })

    const [titulo, setTitulo] = useState('')
    const [tipo, setTipo] = useState('General')
    const [fechaInicio, setFechaInicio] = useState('')
    const [fechaFin, setFechaFin] = useState('')
    const [todoElDia, setTodoElDia] = useState(false)
    const [lugar, setLugar] = useState('')
    const [descripcion, setDescripcion] = useState('')
    const [destinatario, setDestinatario] = useState('todos')

    const isStaff = profile?.rol === 'administrador' || profile?.rol === 'administrativo' || profile?.rol === 'docente'
    const canViewAll = profile?.rol === 'administrador' || profile?.rol === 'administrativo'

    useEffect(() => {
        if (profile) {
            loadEventos()
        }
    }, [profile, startDate, endDate])

    const loadEventos = async () => {
        if (!profile) return

        setLoading(true)
        setError(null)

        try {
            let query = supabase
                .from('eventos')
                .select('*')
                .order('fecha_inicio', { ascending: true })

            if (startDate) {
                const startIso = new Date(`${startDate}T00:00:00`).toISOString()
                query = query.gte('fecha_inicio', startIso)
            }
            if (endDate) {
                const endIso = new Date(`${endDate}T23:59:59`).toISOString()
                query = query.lte('fecha_inicio', endIso)
            }

            if (profile.rol && !canViewAll) {
                query = query.or(`destinatarios.cs.{${profile.rol}},destinatarios.cs.{todos}`)
            }

            const { data, error } = await query
            if (error) throw error

            setEventos((data || []) as Evento[])
        } catch (err) {
            console.error('Error loading eventos:', err)
            setError('Error al cargar el calendario')
        } finally {
            setLoading(false)
        }
    }

    const handleCreateEvento = async () => {
        if (!profile) return
        if (!titulo.trim() || !fechaInicio) {
            setError('Completa el título y la fecha de inicio')
            return
        }

        setSaving(true)
        setError(null)
        setSuccess(null)

        try {
            const payload = {
                titulo: titulo.trim(),
                descripcion: descripcion.trim() ? descripcion.trim() : null,
                tipo: tipo.trim() || 'General',
                fecha_inicio: new Date(fechaInicio).toISOString(),
                fecha_fin: fechaFin ? new Date(fechaFin).toISOString() : null,
                todo_el_dia: todoElDia,
                lugar: lugar.trim() ? lugar.trim() : null,
                destinatarios: [destinatario],
                creado_por: profile.id,
            } satisfies Database['public']['Tables']['eventos']['Insert']

            const { error } = await (supabase as any)
                .from('eventos')
                .insert(payload)

            if (error) throw error

            setTitulo('')
            setTipo('General')
            setFechaInicio('')
            setFechaFin('')
            setTodoElDia(false)
            setLugar('')
            setDescripcion('')
            setDestinatario('todos')
            setSuccess('Evento creado')
            await loadEventos()
        } catch (err) {
            console.error('Error creating evento:', err)
            setError('Error al crear el evento')
        } finally {
            setSaving(false)
        }
    }

    const headerDescription = useMemo(() => {
        if (profile?.rol === 'estudiante') return 'Consulta eventos y actividades del colegio'
        if (profile?.rol === 'padre') return 'Revisa fechas importantes y actividades'
        if (profile?.rol === 'docente') return 'Programa eventos académicos y actividades'
        return 'Gestión de eventos y calendario institucional'
    }, [profile?.rol])

    return (
        <div className="space-y-6">
            <div>
                <h1 className="text-3xl font-bold text-foreground">Calendario</h1>
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
                <CardContent className="pt-6">
                    <div className="grid gap-4 md:grid-cols-3">
                        <div className="space-y-2">
                            <Label>Desde</Label>
                            <Input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} />
                        </div>
                        <div className="space-y-2">
                            <Label>Hasta</Label>
                            <Input type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} />
                        </div>
                        <div className="flex items-end">
                            <Button variant="outline" onClick={loadEventos}>
                                Actualizar
                            </Button>
                        </div>
                    </div>
                </CardContent>
            </Card>

            {isStaff && (
                <Card>
                    <CardHeader>
                        <CardTitle>Crear evento</CardTitle>
                        <CardDescription>
                            Agrega actividades y fechas importantes al calendario
                        </CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <div className="grid gap-4 md:grid-cols-2">
                            <div className="space-y-2">
                                <Label>Título</Label>
                                <Input value={titulo} onChange={(e) => setTitulo(e.target.value)} />
                            </div>
                            <div className="space-y-2">
                                <Label>Tipo</Label>
                                <Input value={tipo} onChange={(e) => setTipo(e.target.value)} />
                            </div>
                        </div>

                        <div className="grid gap-4 md:grid-cols-2">
                            <div className="space-y-2">
                                <Label>Fecha inicio</Label>
                                <Input
                                    type="datetime-local"
                                    value={fechaInicio}
                                    onChange={(e) => setFechaInicio(e.target.value)}
                                />
                            </div>
                            <div className="space-y-2">
                                <Label>Fecha fin</Label>
                                <Input
                                    type="datetime-local"
                                    value={fechaFin}
                                    onChange={(e) => setFechaFin(e.target.value)}
                                />
                            </div>
                        </div>

                        <div className="grid gap-4 md:grid-cols-2">
                            <div className="space-y-2">
                                <Label>Lugar</Label>
                                <Input value={lugar} onChange={(e) => setLugar(e.target.value)} />
                            </div>
                            <div className="space-y-2">
                                <Label>Destinatario</Label>
                                <Select value={destinatario} onValueChange={setDestinatario}>
                                    <SelectTrigger>
                                        <SelectValue placeholder="Selecciona un destinatario" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {DESTINATARIOS.map((item) => (
                                            <SelectItem key={item.value} value={item.value}>
                                                {item.label}
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>
                        </div>

                        <div className="grid gap-4 md:grid-cols-2">
                            <div className="space-y-2">
                                <Label>Descripción</Label>
                                <Input value={descripcion} onChange={(e) => setDescripcion(e.target.value)} />
                            </div>
                            <div className="flex items-center gap-2 pt-7">
                                <input
                                    id="todo-el-dia"
                                    type="checkbox"
                                    className="h-4 w-4 rounded border-input"
                                    checked={todoElDia}
                                    onChange={(e) => setTodoElDia(e.target.checked)}
                                />
                                <Label htmlFor="todo-el-dia">Todo el día</Label>
                            </div>
                        </div>

                        <Button onClick={handleCreateEvento} disabled={saving}>
                            {saving ? (
                                <>
                                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                    Guardando...
                                </>
                            ) : (
                                'Crear evento'
                            )}
                        </Button>
                    </CardContent>
                </Card>
            )}

            {loading && (
                <div className="flex items-center justify-center py-12">
                    <Loader2 className="h-8 w-8 animate-spin text-primary" />
                </div>
            )}

            {!loading && eventos.length === 0 && (
                <Alert>
                    <CalendarDays className="h-4 w-4" />
                    <AlertDescription>No hay eventos en este rango.</AlertDescription>
                </Alert>
            )}

            {!loading && eventos.length > 0 && (
                <div className="space-y-4">
                    {eventos.map((evento) => (
                        <Card key={evento.id}>
                            <CardHeader className="space-y-1">
                                <CardTitle className="flex items-center gap-2">
                                    <CalendarDays className="h-4 w-4 text-primary" />
                                    {evento.titulo}
                                </CardTitle>
                                <CardDescription>
                                    {evento.todo_el_dia
                                        ? `Todo el día • ${new Date(evento.fecha_inicio).toLocaleDateString()}`
                                        : `${new Date(evento.fecha_inicio).toLocaleString()}${evento.fecha_fin ? ` - ${new Date(evento.fecha_fin).toLocaleString()}` : ''
                                        }`}
                                </CardDescription>
                            </CardHeader>
                            <CardContent className="space-y-2">
                                {evento.descripcion && (
                                    <p className="text-sm text-foreground whitespace-pre-line">{evento.descripcion}</p>
                                )}
                                {evento.lugar && (
                                    <p className="text-xs text-muted-foreground flex items-center gap-1">
                                        <MapPin className="h-3 w-3" />
                                        {evento.lugar}
                                    </p>
                                )}
                                <p className="text-xs text-muted-foreground">Destinatarios: {evento.destinatarios.join(', ')}</p>
                            </CardContent>
                        </Card>
                    ))}
                </div>
            )}
        </div>
    )
}
