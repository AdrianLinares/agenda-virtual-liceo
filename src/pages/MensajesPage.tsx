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
import { AlertCircle, CheckCircle2, Inbox, Loader2, Mail, Send } from 'lucide-react'
import type { Database } from '@/types/database.types'

interface Mensaje {
    id: string
    remitente_id: string
    destinatario_id: string
    asunto: string
    contenido: string
    estado: Database['public']['Enums']['mensaje_estado']
    leido_en: string | null
    created_at: string
    remitente?: {
        nombre_completo: string
        email: string
    }
    destinatario?: {
        nombre_completo: string
        email: string
    }
}

interface PerfilOption {
    id: string
    nombre_completo: string
    email: string
    rol: string
}

type TabType = 'recibidos' | 'enviados'

export default function MensajesPage() {
    const { profile } = useAuthStore()
    const [tab, setTab] = useState<TabType>('recibidos')
    const [mensajes, setMensajes] = useState<Mensaje[]>([])
    const [loading, setLoading] = useState(false)
    const [saving, setSaving] = useState(false)
    const [error, setError] = useState<string | null>(null)
    const [success, setSuccess] = useState<string | null>(null)

    const [categoriaUsuario, setCategoriaUsuario] = useState<string>('')
    const [destinatarioId, setDestinatarioId] = useState('')
    const [asunto, setAsunto] = useState('')
    const [contenido, setContenido] = useState('')
    const [recipients, setRecipients] = useState<PerfilOption[]>([])

    const [selectedMessage, setSelectedMessage] = useState<Mensaje | null>(null)
    const [markingRead, setMarkingRead] = useState<string | null>(null)

    useEffect(() => {
        if (profile) {
            loadMensajes()
            loadRecipients()
        }
    }, [profile, tab])

    const loadMensajes = async () => {
        if (!profile) return

        setLoading(true)
        setError(null)

        try {
            let query = supabase
                .from('mensajes')
                .select(`
          *,
          remitente:remitente_id (nombre_completo, email),
          destinatario:destinatario_id (nombre_completo, email)
        `)
                .order('created_at', { ascending: false })

            if (tab === 'recibidos') {
                query = query.eq('destinatario_id', profile.id)
            } else {
                query = query.eq('remitente_id', profile.id)
            }

            const { data, error } = await query
            if (error) throw error

            setMensajes((data || []) as Mensaje[])
        } catch (err) {
            console.error('Error loading mensajes:', err)
            setError('Error al cargar los mensajes')
        } finally {
            setLoading(false)
        }
    }

    const loadRecipients = async () => {
        if (!profile) return

        try {
            const { data, error } = await supabase
                .from('profiles')
                .select('id, nombre_completo, email, rol')
                .eq('activo', true)
                .order('nombre_completo', { ascending: true })

            if (error) throw error

            const items = (data || []) as Array<{
                id: string
                nombre_completo: string
                email: string
                rol: string
            }>

            const list = items
                .filter((item) => item.id !== profile.id)
                .map((item) => ({
                    id: item.id,
                    nombre_completo: item.nombre_completo,
                    email: item.email,
                    rol: item.rol,
                }))

            setRecipients(list)
        } catch (err) {
            console.error('Error loading recipients:', err)
        }
    }

    const handleSendMessage = async () => {
        if (!profile) return

        if (!destinatarioId || !asunto.trim() || !contenido.trim()) {
            setError('Completa destinatario, asunto y mensaje')
            return
        }

        setSaving(true)
        setError(null)
        setSuccess(null)

        try {
            const payload = {
                remitente_id: profile.id,
                destinatario_id: destinatarioId,
                asunto: asunto.trim(),
                contenido: contenido.trim(),
                estado: 'enviado',
            } satisfies Database['public']['Tables']['mensajes']['Insert']

            const { error } = await (supabase as any)
                .from('mensajes')
                .insert(payload)

            if (error) throw error

            setDestinatarioId('')
            setAsunto('')
            setContenido('')
            setSuccess('Mensaje enviado')
            if (tab === 'enviados') {
                await loadMensajes()
            }
        } catch (err) {
            console.error('Error sending message:', err)
            setError('Error al enviar el mensaje')
        } finally {
            setSaving(false)
        }
    }

    const handleOpenMessage = async (mensaje: Mensaje) => {
        setSelectedMessage(mensaje)

        if (tab === 'recibidos' && mensaje.estado !== 'leido' && !markingRead) {
            setMarkingRead(mensaje.id)
            try {
                const { error } = await (supabase as any)
                    .from('mensajes')
                    .update({ estado: 'leido', leido_en: new Date().toISOString() })
                    .eq('id', mensaje.id)

                if (!error) {
                    setMensajes((prev) =>
                        prev.map((item) =>
                            item.id === mensaje.id
                                ? { ...item, estado: 'leido', leido_en: new Date().toISOString() }
                                : item
                        )
                    )
                }
            } catch (err) {
                console.error('Error marking message as read:', err)
            } finally {
                setMarkingRead(null)
            }
        }
    }

    const filteredRecipients = useMemo(() => {
        if (!categoriaUsuario || categoriaUsuario === 'todos') return recipients

        const rolMap: Record<string, string[]> = {
            'administrativo': ['administrador', 'administrativo'],
            'docente': ['docente'],
            'estudiante': ['estudiante'],
            'padre': ['padre']
        }

        const rolesPermitidos = rolMap[categoriaUsuario.toLowerCase()] || []
        return recipients.filter((user) =>
            rolesPermitidos.includes(user.rol.toLowerCase())
        )
    }, [recipients, categoriaUsuario])

    const headerDescription = useMemo(() => {
        if (profile?.rol === 'estudiante') return 'Envía y recibe mensajes institucionales'
        if (profile?.rol === 'padre') return 'Comunícate con docentes y directivos'
        if (profile?.rol === 'docente') return 'Gestiona mensajes con estudiantes y acudientes'
        return 'Bandeja de mensajes institucionales'
    }, [profile?.rol])

    const estadoBadge = (estado: Mensaje['estado']) => {
        if (estado === 'leido') return 'bg-emerald-50 text-emerald-700'
        if (estado === 'archivado') return 'bg-gray-100 text-gray-700'
        return 'bg-blue-50 text-blue-700'
    }

    const estadoLabel = (estado: Mensaje['estado']) => {
        if (tab === 'recibidos' && estado === 'enviado') return 'recibido'
        return estado
    }

    return (
        <div className="space-y-6">
            <div>
                <h1 className="text-3xl font-bold text-gray-900">Mensajes</h1>
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

            <div className="flex flex-wrap gap-2">
                <Button
                    variant={tab === 'recibidos' ? 'default' : 'outline'}
                    onClick={() => setTab('recibidos')}
                >
                    <Inbox className="mr-2 h-4 w-4" />
                    Recibidos
                </Button>
                <Button
                    variant={tab === 'enviados' ? 'default' : 'outline'}
                    onClick={() => setTab('enviados')}
                >
                    <Send className="mr-2 h-4 w-4" />
                    Enviados
                </Button>
            </div>

            <Card>
                <CardHeader>
                    <CardTitle>Enviar mensaje</CardTitle>
                    <CardDescription>
                        Selecciona el destinatario y redacta tu mensaje
                    </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                    <div className="grid gap-4 md:grid-cols-3">
                        <div className="space-y-2">
                            <Label>Categoría de usuario (filtro opcional)</Label>
                            <Select value={categoriaUsuario} onValueChange={(value) => {
                                setCategoriaUsuario(value)
                                setDestinatarioId('') // Limpiar destinatario al cambiar categoría
                            }}>
                                <SelectTrigger>
                                    <SelectValue placeholder="Todos" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="todos">Todos</SelectItem>
                                    <SelectItem value="administrativo">Administrativo</SelectItem>
                                    <SelectItem value="docente">Docente</SelectItem>
                                    <SelectItem value="estudiante">Estudiante</SelectItem>
                                    <SelectItem value="padre">Padre/Madre</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>
                        <div className="space-y-2">
                            <Label>Destinatario</Label>
                            <Select
                                value={destinatarioId}
                                onValueChange={setDestinatarioId}
                            >
                                <SelectTrigger>
                                    <SelectValue placeholder="Selecciona un destinatario" />
                                </SelectTrigger>
                                <SelectContent>
                                    {filteredRecipients.length === 0 && (
                                        <div className="px-2 py-1.5 text-sm text-gray-500">
                                            No hay usuarios disponibles
                                        </div>
                                    )}
                                    {filteredRecipients.map((user) => (
                                        <SelectItem key={user.id} value={user.id}>
                                            {user.nombre_completo}
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>
                        <div className="space-y-2">
                            <Label>Asunto</Label>
                            <Input value={asunto} onChange={(e) => setAsunto(e.target.value)} />
                        </div>
                    </div>

                    <div className="space-y-2">
                        <Label>Mensaje</Label>
                        <Input value={contenido} onChange={(e) => setContenido(e.target.value)} />
                    </div>

                    <Button onClick={handleSendMessage} disabled={saving}>
                        {saving ? (
                            <>
                                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                Enviando...
                            </>
                        ) : (
                            'Enviar'
                        )}
                    </Button>
                </CardContent>
            </Card>

            {loading && (
                <div className="flex items-center justify-center py-12">
                    <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
                </div>
            )}

            {!loading && mensajes.length === 0 && (
                <Alert>
                    <Mail className="h-4 w-4" />
                    <AlertDescription>No hay mensajes en esta bandeja.</AlertDescription>
                </Alert>
            )}

            {!loading && mensajes.length > 0 && (
                <div className="grid gap-6 lg:grid-cols-3">
                    <Card className="lg:col-span-1">
                        <CardHeader>
                            <CardTitle>Bandeja {tab === 'recibidos' ? 'de entrada' : 'de salida'}</CardTitle>
                            <CardDescription>
                                {tab === 'recibidos' ? 'Mensajes recibidos' : 'Mensajes enviados'}
                            </CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-3">
                            {mensajes.map((mensaje) => (
                                <button
                                    key={mensaje.id}
                                    onClick={() => handleOpenMessage(mensaje)}
                                    className={`w-full rounded-lg border p-3 text-left transition hover:bg-gray-50 ${selectedMessage?.id === mensaje.id ? 'border-blue-400 bg-blue-50' : 'border-gray-200'
                                        }`}
                                >
                                    <div className="flex items-center justify-between gap-2">
                                        <p className="text-sm font-semibold text-gray-900 line-clamp-1">{mensaje.asunto}</p>
                                        <span className={`rounded-full px-2 py-1 text-[11px] font-medium ${estadoBadge(mensaje.estado)}`}>
                                            {estadoLabel(mensaje.estado)}
                                        </span>
                                    </div>
                                    <p className="text-xs text-gray-500 mt-1">
                                        {tab === 'recibidos'
                                            ? mensaje.remitente?.nombre_completo || 'Sistema'
                                            : mensaje.destinatario?.nombre_completo || 'Destinatario'}
                                    </p>
                                    <p className="text-[11px] text-gray-400">
                                        {new Date(mensaje.created_at).toLocaleString()}
                                    </p>
                                </button>
                            ))}
                        </CardContent>
                    </Card>

                    <Card className="lg:col-span-2">
                        <CardHeader>
                            <CardTitle>Detalle del mensaje</CardTitle>
                            <CardDescription>
                                {selectedMessage ? 'Vista previa del mensaje seleccionado' : 'Selecciona un mensaje'}
                            </CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            {!selectedMessage ? (
                                <div className="flex flex-col items-center justify-center gap-2 py-12 text-gray-500">
                                    <Inbox className="h-10 w-10" />
                                    <p>Selecciona un mensaje para ver su contenido</p>
                                </div>
                            ) : (
                                <div className="space-y-4">
                                    <div>
                                        <div className="flex flex-wrap items-center gap-2">
                                            <h3 className="text-lg font-semibold text-gray-900">{selectedMessage.asunto}</h3>
                                            <span
                                                className={`rounded-full px-2 py-1 text-[11px] font-medium ${estadoBadge(selectedMessage.estado)}`}
                                            >
                                                {estadoLabel(selectedMessage.estado)}
                                            </span>
                                        </div>
                                        <p className="text-xs text-gray-500">
                                            {tab === 'recibidos'
                                                ? `De: ${selectedMessage.remitente?.nombre_completo || 'Sistema'}`
                                                : `Para: ${selectedMessage.destinatario?.nombre_completo || 'Destinatario'}`}
                                        </p>
                                        <p className="text-xs text-gray-400">
                                            {new Date(selectedMessage.created_at).toLocaleString()}
                                        </p>
                                        {markingRead === selectedMessage.id && (
                                            <p className="text-xs text-blue-500">Marcando como leído...</p>
                                        )}
                                    </div>
                                    <div className="rounded-lg border border-gray-200 bg-gray-50 p-4 text-sm text-gray-700 whitespace-pre-line">
                                        {selectedMessage.contenido}
                                    </div>
                                </div>
                            )}
                        </CardContent>
                    </Card>
                </div>
            )}
        </div>
    )
}
