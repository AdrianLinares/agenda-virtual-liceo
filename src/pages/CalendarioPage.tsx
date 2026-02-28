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
import { AlertCircle, CalendarDays, CheckCircle2, Loader2, MapPin, Pencil, Trash2, X } from 'lucide-react'
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
    const [editingId, setEditingId] = useState<string | null>(null)
    const [actionLoadingId, setActionLoadingId] = useState<string | null>(null)
    const [editTitulo, setEditTitulo] = useState('')
    const [editTipo, setEditTipo] = useState('General')
    const [editFechaInicio, setEditFechaInicio] = useState('')
    const [editFechaFin, setEditFechaFin] = useState('')
    const [editTodoElDia, setEditTodoElDia] = useState(false)
    const [editLugar, setEditLugar] = useState('')
    const [editDescripcion, setEditDescripcion] = useState('')
    const [editDestinatario, setEditDestinatario] = useState('todos')

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

    const canManageEvento = (evento: Evento) => {
        if (!profile || !isStaff) return false
        return canViewAll || evento.creado_por === profile.id
    }

    const toDateTimeLocal = (value: string | null) => {
        if (!value) return ''
        const date = new Date(value)
        if (Number.isNaN(date.getTime())) return ''
        return new Date(date.getTime() - date.getTimezoneOffset() * 60000).toISOString().slice(0, 16)
    }

    const handleStartEdit = (evento: Evento) => {
        setEditingId(evento.id)
        setEditTitulo(evento.titulo)
        setEditTipo(evento.tipo)
        setEditFechaInicio(toDateTimeLocal(evento.fecha_inicio))
        setEditFechaFin(toDateTimeLocal(evento.fecha_fin))
        setEditTodoElDia(evento.todo_el_dia)
        setEditLugar(evento.lugar || '')
        setEditDescripcion(evento.descripcion || '')
        setEditDestinatario(evento.destinatarios?.[0] || 'todos')
        setError(null)
        setSuccess(null)
    }

    const handleCancelEdit = () => {
        setEditingId(null)
        setActionLoadingId(null)
    }

    const handleUpdateEvento = async (eventoId: string) => {
        if (!editTitulo.trim() || !editFechaInicio) {
            setError('Completa el título y la fecha de inicio para actualizar')
            return
        }

        setActionLoadingId(eventoId)
        setError(null)
        setSuccess(null)

        try {
            const payload = {
                titulo: editTitulo.trim(),
                descripcion: editDescripcion.trim() ? editDescripcion.trim() : null,
                tipo: editTipo.trim() || 'General',
                fecha_inicio: new Date(editFechaInicio).toISOString(),
                fecha_fin: editFechaFin ? new Date(editFechaFin).toISOString() : null,
                todo_el_dia: editTodoElDia,
                lugar: editLugar.trim() ? editLugar.trim() : null,
                destinatarios: [editDestinatario],
            } satisfies Database['public']['Tables']['eventos']['Update']

            const { error } = await supabase
                .from('eventos')
                .update(payload)
                .eq('id', eventoId)

            if (error) throw error

            setSuccess('Evento actualizado')
            setEditingId(null)
            await loadEventos()
        } catch (err) {
            console.error('Error updating evento:', err)
            setError('Error al actualizar el evento')
        } finally {
            setActionLoadingId(null)
        }
    }

    const handleDeleteEvento = async (eventoId: string) => {
        const confirmed = window.confirm('¿Seguro que deseas eliminar este evento?')
        if (!confirmed) return

        setActionLoadingId(eventoId)
        setError(null)
        setSuccess(null)

        try {
            const { error } = await supabase
                .from('eventos')
                .delete()
                .eq('id', eventoId)

            if (error) throw error

            setSuccess('Evento eliminado')
            if (editingId === eventoId) {
                setEditingId(null)
            }
            await loadEventos()
        } catch (err) {
            console.error('Error deleting evento:', err)
            setError('Error al eliminar el evento')
        } finally {
            setActionLoadingId(null)
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
                                {editingId === evento.id ? (
                                    <div className="space-y-4 border rounded-md p-4 bg-muted/30">
                                        <div className="grid gap-4 md:grid-cols-2">
                                            <div className="space-y-2">
                                                <Label>Título</Label>
                                                <Input value={editTitulo} onChange={(e) => setEditTitulo(e.target.value)} />
                                            </div>
                                            <div className="space-y-2">
                                                <Label>Tipo</Label>
                                                <Input value={editTipo} onChange={(e) => setEditTipo(e.target.value)} />
                                            </div>
                                        </div>

                                        <div className="grid gap-4 md:grid-cols-2">
                                            <div className="space-y-2">
                                                <Label>Fecha inicio</Label>
                                                <Input
                                                    type="datetime-local"
                                                    value={editFechaInicio}
                                                    onChange={(e) => setEditFechaInicio(e.target.value)}
                                                />
                                            </div>
                                            <div className="space-y-2">
                                                <Label>Fecha fin</Label>
                                                <Input
                                                    type="datetime-local"
                                                    value={editFechaFin}
                                                    onChange={(e) => setEditFechaFin(e.target.value)}
                                                />
                                            </div>
                                        </div>

                                        <div className="grid gap-4 md:grid-cols-2">
                                            <div className="space-y-2">
                                                <Label>Lugar</Label>
                                                <Input value={editLugar} onChange={(e) => setEditLugar(e.target.value)} />
                                            </div>
                                            <div className="space-y-2">
                                                <Label>Destinatario</Label>
                                                <Select value={editDestinatario} onValueChange={setEditDestinatario}>
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
                                                <Input value={editDescripcion} onChange={(e) => setEditDescripcion(e.target.value)} />
                                            </div>
                                            <div className="flex items-center gap-2 pt-7">
                                                <input
                                                    id={`todo-el-dia-${evento.id}`}
                                                    type="checkbox"
                                                    className="h-4 w-4 rounded border-input"
                                                    checked={editTodoElDia}
                                                    onChange={(e) => setEditTodoElDia(e.target.checked)}
                                                />
                                                <Label htmlFor={`todo-el-dia-${evento.id}`}>Todo el día</Label>
                                            </div>
                                        </div>

                                        <div className="flex gap-2">
                                            <Button
                                                onClick={() => handleUpdateEvento(evento.id)}
                                                disabled={actionLoadingId === evento.id}
                                            >
                                                {actionLoadingId === evento.id ? (
                                                    <>
                                                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                                        Guardando...
                                                    </>
                                                ) : (
                                                    'Guardar cambios'
                                                )}
                                            </Button>
                                            <Button variant="outline" onClick={handleCancelEdit}>
                                                <X className="mr-2 h-4 w-4" />
                                                Cancelar
                                            </Button>
                                        </div>
                                    </div>
                                ) : (
                                    <>
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
                                    </>
                                )}

                                {canManageEvento(evento) && editingId !== evento.id && (
                                    <div className="flex gap-2 pt-2">
                                        <Button variant="outline" size="sm" onClick={() => handleStartEdit(evento)}>
                                            <Pencil className="mr-2 h-3.5 w-3.5" />
                                            Editar
                                        </Button>
                                        <Button
                                            variant="destructive"
                                            size="sm"
                                            onClick={() => handleDeleteEvento(evento.id)}
                                            disabled={actionLoadingId === evento.id}
                                        >
                                            {actionLoadingId === evento.id ? (
                                                <Loader2 className="h-3.5 w-3.5 animate-spin" />
                                            ) : (
                                                <Trash2 className="mr-2 h-3.5 w-3.5" />
                                            )}
                                            Eliminar
                                        </Button>
                                    </div>
                                )}
                            </CardContent>
                        </Card>
                    ))}
                </div>
            )}
        </div>
    )
}
