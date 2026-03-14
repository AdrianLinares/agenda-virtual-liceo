import { useEffect, useMemo, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
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
import { sortByGradeAndGroupName } from '@/utils/grade-order'

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

interface GrupoOption {
    id: string
    nombre: string
    año_academico: number
    grado?: {
        nombre: string
    } | null
}

interface EstudianteGrupoLink {
    estudiante_id: string
    grupo_id: string
}

interface PadreEstudianteLink {
    padre_id: string
    estudiante_id: string
    estudiante?: {
        nombre_completo: string
    } | null
}

type TabType = 'recibidos' | 'enviados'

export default function MensajesPage() {
    const { profile } = useAuthStore()
    const [searchParams, setSearchParams] = useSearchParams()
    const [tab, setTab] = useState<TabType>('recibidos')
    const [mensajes, setMensajes] = useState<Mensaje[]>([])
    const [loading, setLoading] = useState(false)
    const [saving, setSaving] = useState(false)
    const [error, setError] = useState<string | null>(null)
    const [success, setSuccess] = useState<string | null>(null)

    const [categoriaUsuario, setCategoriaUsuario] = useState<string>('')
    const [grupoFiltro, setGrupoFiltro] = useState('')
    const [sendToAllStudentsInGroup, setSendToAllStudentsInGroup] = useState(false)
    const [sendToAllParentsInGroup, setSendToAllParentsInGroup] = useState(false)
    const [destinatarioId, setDestinatarioId] = useState('')
    const [asunto, setAsunto] = useState('')
    const [contenido, setContenido] = useState('')
    const [recipients, setRecipients] = useState<PerfilOption[]>([])
    const [gruposDisponibles, setGruposDisponibles] = useState<GrupoOption[]>([])
    const [estudiantesGrupos, setEstudiantesGrupos] = useState<EstudianteGrupoLink[]>([])
    const [padresEstudiantes, setPadresEstudiantes] = useState<PadreEstudianteLink[]>([])

    const [selectedMessage, setSelectedMessage] = useState<Mensaje | null>(null)
    const [markingRead, setMarkingRead] = useState<string | null>(null)

    useEffect(() => {
        const tabParam = searchParams.get('tab')
        if (tabParam === 'recibidos' || tabParam === 'enviados') {
            setTab(tabParam)
        }
    }, [searchParams])

    const handleTabChange = (nextTab: TabType) => {
        setTab(nextTab)
        const nextSearchParams = new URLSearchParams(searchParams)
        nextSearchParams.set('tab', nextTab)
        setSearchParams(nextSearchParams)
    }

    useEffect(() => {
        if (profile) {
            loadMensajes()
            loadRecipients()
            loadRecipientRelations()
        }
        // Ambas cargas dependen de profile/tab por diseño.
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [profile, tab])

    const allowedRecipientRoles = useMemo(() => {
        if (!profile?.rol) return null
        if (profile.rol === 'estudiante') return ['docente']
        if (profile.rol === 'padre') return ['docente', 'administrativo', 'administrador']
        return null
    }, [profile?.rol])

    const categoriaOptions = useMemo(() => {
        const allOptions = [
            { value: 'todos', label: 'Todos' },
            { value: 'grupo', label: 'Grupo (envío masivo)' },
            { value: 'administrativo', label: 'Administrativo' },
            { value: 'docente', label: 'Docente' },
            { value: 'estudiante', label: 'Estudiante' },
            { value: 'padre', label: 'Padre/Madre' },
        ]

        if (!allowedRecipientRoles) return allOptions

        return allOptions.filter((option) => {
            if (option.value === 'todos') return true
            if (option.value === 'administrativo') {
                return (
                    allowedRecipientRoles.includes('administrativo') ||
                    allowedRecipientRoles.includes('administrador')
                )
            }
            return allowedRecipientRoles.includes(option.value)
        })
    }, [allowedRecipientRoles])

    useEffect(() => {
        if (!categoriaUsuario || categoriaUsuario === 'todos') return
        if (categoriaOptions.some((option) => option.value === categoriaUsuario)) return
        setCategoriaUsuario('')
        setGrupoFiltro('')
        setSendToAllStudentsInGroup(false)
        setSendToAllParentsInGroup(false)
        setDestinatarioId('')
    }, [categoriaUsuario, categoriaOptions])

    useEffect(() => {
        if (categoriaUsuario === 'grupo') return
        if (sendToAllStudentsInGroup) setSendToAllStudentsInGroup(false)
        if (sendToAllParentsInGroup) setSendToAllParentsInGroup(false)
    }, [categoriaUsuario, sendToAllStudentsInGroup, sendToAllParentsInGroup])

    useEffect(() => {
        const needsGroupFilter = categoriaUsuario === 'estudiante' || categoriaUsuario === 'padre' || categoriaUsuario === 'grupo'

        if (!needsGroupFilter) {
            if (grupoFiltro) setGrupoFiltro('')
            return
        }

        if (!grupoFiltro) return
        if (gruposDisponibles.some((grupo) => grupo.id === grupoFiltro)) return

        setGrupoFiltro('')
        setDestinatarioId('')
    }, [categoriaUsuario, grupoFiltro, gruposDisponibles])

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
                .filter((item) => {
                    if (!allowedRecipientRoles) return true
                    return allowedRecipientRoles.includes(item.rol)
                })
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

    const loadRecipientRelations = async () => {
        try {
            const [gruposRes, estudiantesGruposRes, padresEstudiantesRes] = await Promise.all([
                supabase
                    .from('grupos')
                    .select('id, nombre, año_academico, grado:grado_id(nombre)')
                    .order('año_academico', { ascending: false })
                    .order('nombre', { ascending: true }),
                supabase
                    .from('estudiantes_grupos')
                    .select('estudiante_id, grupo_id')
                    .eq('estado', 'activo'),
                supabase
                    .from('padres_estudiantes')
                    .select('padre_id, estudiante_id, estudiante:estudiante_id(nombre_completo)'),
            ])

            if (gruposRes.error) throw gruposRes.error
            if (estudiantesGruposRes.error) throw estudiantesGruposRes.error
            if (padresEstudiantesRes.error) throw padresEstudiantesRes.error

            const gruposOrdenados = sortByGradeAndGroupName(
                (gruposRes.data || []) as GrupoOption[],
                (g) => (g.grado as { nombre: string } | null)?.nombre,
                (g) => g.nombre
            )
            setGruposDisponibles(gruposOrdenados)
            setEstudiantesGrupos((estudiantesGruposRes.data || []) as EstudianteGrupoLink[])
            setPadresEstudiantes((padresEstudiantesRes.data || []) as PadreEstudianteLink[])
        } catch (err) {
            console.error('Error loading recipient relations:', err)
        }
    }

    const recipientById = useMemo(() => {
        const map = new Map<string, PerfilOption>()
        recipients.forEach((recipient) => {
            map.set(recipient.id, recipient)
        })
        return map
    }, [recipients])

    const groupMassRecipientIds = useMemo(() => {
        if (categoriaUsuario !== 'grupo' || !grupoFiltro) return []

        const estudiantesEnGrupo = new Set(
            estudiantesGrupos
                .filter((item) => item.grupo_id === grupoFiltro)
                .map((item) => item.estudiante_id)
        )

        const targetIds = new Set<string>()

        if (sendToAllStudentsInGroup) {
            estudiantesEnGrupo.forEach((estudianteId) => {
                const recipient = recipientById.get(estudianteId)
                if (recipient?.rol === 'estudiante') {
                    targetIds.add(estudianteId)
                }
            })
        }

        if (sendToAllParentsInGroup) {
            padresEstudiantes
                .filter((item) => estudiantesEnGrupo.has(item.estudiante_id))
                .forEach((item) => {
                    const recipient = recipientById.get(item.padre_id)
                    if (recipient?.rol === 'padre') {
                        targetIds.add(item.padre_id)
                    }
                })
        }

        return Array.from(targetIds)
    }, [
        categoriaUsuario,
        grupoFiltro,
        sendToAllStudentsInGroup,
        sendToAllParentsInGroup,
        estudiantesGrupos,
        padresEstudiantes,
        recipientById,
    ])

    const handleSendMessage = async () => {
        if (!profile) return

        const isGroupMassMode = categoriaUsuario === 'grupo'

        if (isGroupMassMode) {
            if (!grupoFiltro) {
                setError('Selecciona un grupo para el envío masivo')
                return
            }

            if (!sendToAllStudentsInGroup && !sendToAllParentsInGroup) {
                setError('Selecciona al menos estudiantes y/o padres para el envío masivo')
                return
            }
        }

        if (!asunto.trim() || !contenido.trim()) {
            setError('Completa asunto y mensaje')
            return
        }

        let targetRecipientIds: string[] = []

        if (isGroupMassMode) {
            targetRecipientIds = groupMassRecipientIds
            if (targetRecipientIds.length === 0) {
                setError('No hay destinatarios disponibles para el grupo y criterios seleccionados')
                return
            }
        } else {
            if (!destinatarioId) {
                setError('Completa destinatario, asunto y mensaje')
                return
            }

            const selectedRecipient = recipients.find((item) => item.id === destinatarioId)
            if (!selectedRecipient) {
                setError('Selecciona un destinatario válido')
                return
            }

            if (allowedRecipientRoles && !allowedRecipientRoles.includes(selectedRecipient.rol)) {
                setError('No tienes permiso para enviar mensajes a ese usuario')
                return
            }

            targetRecipientIds = [destinatarioId]
        }

        setSaving(true)
        setError(null)
        setSuccess(null)

        try {
            const payload = targetRecipientIds.map((recipientId) => ({
                remitente_id: profile.id,
                destinatario_id: recipientId,
                asunto: asunto.trim(),
                contenido: contenido.trim(),
                estado: 'enviado',
            } satisfies Database['public']['Tables']['mensajes']['Insert']))

            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            const { error } = await (supabase as any)
                .from('mensajes')
                .insert(payload)

            if (error) throw error

            setDestinatarioId('')
            setAsunto('')
            setContenido('')
            if (isGroupMassMode) {
                setSuccess(`Mensaje enviado a ${targetRecipientIds.length} destinatario(s)`)
            } else {
                setSuccess('Mensaje enviado')
            }
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
                // eslint-disable-next-line @typescript-eslint/no-explicit-any
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
        const needsGroupFilter = categoriaUsuario === 'estudiante' || categoriaUsuario === 'padre' || categoriaUsuario === 'grupo'

        const rolMap: Record<string, string[]> = {
            'administrativo': ['administrador', 'administrativo'],
            'docente': ['docente'],
            'estudiante': ['estudiante'],
            'padre': ['padre']
        }

        const baseList = !categoriaUsuario || categoriaUsuario === 'todos'
            ? recipients
            : recipients.filter((user) => {
                const rolesPermitidos = rolMap[categoriaUsuario.toLowerCase()] || []
                return rolesPermitidos.includes(user.rol.toLowerCase())
            })

        if (!needsGroupFilter) return baseList
        if (categoriaUsuario === 'grupo') return []
        if (!grupoFiltro) return []

        const estudiantesEnGrupo = new Set(
            estudiantesGrupos
                .filter((item) => item.grupo_id === grupoFiltro)
                .map((item) => item.estudiante_id)
        )

        if (categoriaUsuario === 'estudiante') {
            return baseList.filter((user) => estudiantesEnGrupo.has(user.id))
        }

        const padresConHijoEnGrupo = new Set(
            padresEstudiantes
                .filter((item) => estudiantesEnGrupo.has(item.estudiante_id))
                .map((item) => item.padre_id)
        )

        return baseList.filter((user) => padresConHijoEnGrupo.has(user.id))
    }, [recipients, categoriaUsuario, grupoFiltro, estudiantesGrupos, padresEstudiantes])

    const parentChildLabelByParentId = useMemo(() => {
        if (categoriaUsuario !== 'padre' || !grupoFiltro) return new Map<string, string>()

        const estudiantesEnGrupo = new Set(
            estudiantesGrupos
                .filter((item) => item.grupo_id === grupoFiltro)
                .map((item) => item.estudiante_id)
        )

        const map = new Map<string, Set<string>>()

        padresEstudiantes
            .filter((item) => estudiantesEnGrupo.has(item.estudiante_id))
            .forEach((item) => {
                const childName = item.estudiante?.nombre_completo?.trim()
                if (!childName) return

                const names = map.get(item.padre_id) ?? new Set<string>()
                names.add(childName)
                map.set(item.padre_id, names)
            })

        const labelMap = new Map<string, string>()
        map.forEach((names, padreId) => {
            labelMap.set(padreId, Array.from(names).join(', '))
        })

        return labelMap
    }, [categoriaUsuario, grupoFiltro, estudiantesGrupos, padresEstudiantes])

    const showGroupFilter = categoriaUsuario === 'estudiante' || categoriaUsuario === 'padre' || categoriaUsuario === 'grupo'

    const headerDescription = useMemo(() => {
        if (profile?.rol === 'estudiante') return 'Envía y recibe mensajes institucionales'
        if (profile?.rol === 'padre') return 'Comunícate con docentes y directivos'
        if (profile?.rol === 'docente') return 'Gestiona mensajes con estudiantes y acudientes'
        return 'Bandeja de mensajes institucionales'
    }, [profile?.rol])

    const estadoBadge = (estado: Mensaje['estado']) => {
        if (estado === 'leido') return 'bg-emerald-50 text-emerald-700'
        if (estado === 'archivado') return 'bg-muted text-foreground'
        return 'bg-secondary text-primary'
    }

    const estadoLabel = (estado: Mensaje['estado']) => {
        if (tab === 'recibidos' && estado === 'enviado') return 'recibido'
        return estado
    }

    return (
        <div className="space-y-6">
            <div>
                <h1 className="text-3xl font-bold text-foreground">Mensajes</h1>
                <p className="text-muted-foreground mt-1">{headerDescription}</p>
                <p className="text-muted-foreground mt-1">Horarios de respuesta: lunes a viernes 8:00 am a 3:00 pm</p>
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
                    onClick={() => handleTabChange('recibidos')}
                >
                    <Inbox className="mr-2 h-4 w-4" />
                    Recibidos
                </Button>
                <Button
                    variant={tab === 'enviados' ? 'default' : 'outline'}
                    onClick={() => handleTabChange('enviados')}
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
                    <div className="grid gap-4 md:grid-cols-4">
                        <div className="space-y-2">
                            <Label>Categoría de usuario (filtro opcional)</Label>
                            <Select value={categoriaUsuario} onValueChange={(value) => {
                                setCategoriaUsuario(value)
                                setGrupoFiltro('')
                                setSendToAllStudentsInGroup(false)
                                setSendToAllParentsInGroup(false)
                                setDestinatarioId('') // Limpiar destinatario al cambiar categoría
                            }}>
                                <SelectTrigger>
                                    <SelectValue placeholder="Todos" />
                                </SelectTrigger>
                                <SelectContent>
                                    {categoriaOptions.map((option) => (
                                        <SelectItem key={option.value} value={option.value}>
                                            {option.label}
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>
                        {showGroupFilter && (
                            <div className="space-y-2">
                                <Label>Grupo</Label>
                                <Select value={grupoFiltro} onValueChange={(value) => {
                                    setGrupoFiltro(value)
                                    setDestinatarioId('')
                                }}>
                                    <SelectTrigger>
                                        <SelectValue placeholder="Selecciona un grupo" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {gruposDisponibles.length === 0 && (
                                            <div className="px-2 py-1.5 text-sm text-muted-foreground">
                                                No hay grupos disponibles
                                            </div>
                                        )}
                                        {gruposDisponibles.map((grupo) => (
                                            <SelectItem key={grupo.id} value={grupo.id}>
                                                {grupo.grado?.nombre
                                                    ? `${grupo.grado.nombre} - ${grupo.nombre} (${grupo.año_academico})`
                                                    : `${grupo.nombre} (${grupo.año_academico})`}
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>
                        )}
                        {categoriaUsuario === 'grupo' && (
                            <div className="space-y-2 md:col-span-2">
                                <Label>Envío masivo por grupo</Label>
                                <div className="rounded-md border border-border p-3 space-y-2">
                                    <label className="flex items-center gap-2 text-sm text-foreground">
                                        <input
                                            type="checkbox"
                                            checked={sendToAllStudentsInGroup}
                                            onChange={(e) => setSendToAllStudentsInGroup(e.target.checked)}
                                        />
                                        Todos los estudiantes del grupo
                                    </label>
                                    <label className="flex items-center gap-2 text-sm text-foreground">
                                        <input
                                            type="checkbox"
                                            checked={sendToAllParentsInGroup}
                                            onChange={(e) => setSendToAllParentsInGroup(e.target.checked)}
                                        />
                                        Todos los padres/acudientes del grupo
                                    </label>
                                    <p className="text-xs text-muted-foreground">
                                        Destinatarios estimados: {groupMassRecipientIds.length}
                                    </p>
                                </div>
                            </div>
                        )}
                        {categoriaUsuario !== 'grupo' && (
                            <div className="space-y-2">
                                <Label>Destinatario</Label>
                                <Select
                                    value={destinatarioId}
                                    onValueChange={setDestinatarioId}
                                    disabled={showGroupFilter && !grupoFiltro}
                                >
                                    <SelectTrigger>
                                        <SelectValue placeholder={showGroupFilter && !grupoFiltro ? 'Primero selecciona un grupo' : 'Selecciona un destinatario'} />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {filteredRecipients.length === 0 && (
                                            <div className="px-2 py-1.5 text-sm text-muted-foreground">
                                                {showGroupFilter && !grupoFiltro
                                                    ? 'Selecciona un grupo para ver destinatarios'
                                                    : 'No hay usuarios disponibles'}
                                            </div>
                                        )}
                                        {filteredRecipients.map((user) => (
                                            <SelectItem key={user.id} value={user.id}>
                                                <div className="flex flex-col">
                                                    <span>{user.nombre_completo}</span>
                                                    {categoriaUsuario === 'padre' && parentChildLabelByParentId.get(user.id) && (
                                                        <span className="text-xs text-muted-foreground">
                                                            Hijo(a): {parentChildLabelByParentId.get(user.id)}
                                                        </span>
                                                    )}
                                                </div>
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>
                        )}
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
                    <Loader2 className="h-8 w-8 animate-spin text-primary" />
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
                                    className={`w-full rounded-lg border p-3 text-left transition hover:bg-muted ${selectedMessage?.id === mensaje.id ? 'border-primary/60 bg-secondary' : 'border-border'
                                        }`}
                                >
                                    <div className="flex items-center justify-between gap-2">
                                        <p className="text-sm font-semibold text-foreground line-clamp-1">{mensaje.asunto}</p>
                                        <span className={`rounded-full px-2 py-1 text-[11px] font-medium ${estadoBadge(mensaje.estado)}`}>
                                            {estadoLabel(mensaje.estado)}
                                        </span>
                                    </div>
                                    <p className="text-xs text-muted-foreground mt-1">
                                        {tab === 'recibidos'
                                            ? mensaje.remitente?.nombre_completo || 'Sistema'
                                            : mensaje.destinatario?.nombre_completo || 'Destinatario'}
                                    </p>
                                    <p className="text-[11px] text-muted-foreground">
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
                                <div className="flex flex-col items-center justify-center gap-2 py-12 text-muted-foreground">
                                    <Inbox className="h-10 w-10" />
                                    <p>Selecciona un mensaje para ver su contenido</p>
                                </div>
                            ) : (
                                <div className="space-y-4">
                                    <div>
                                        <div className="flex flex-wrap items-center gap-2">
                                            <h3 className="text-lg font-semibold text-foreground">{selectedMessage.asunto}</h3>
                                            <span
                                                className={`rounded-full px-2 py-1 text-[11px] font-medium ${estadoBadge(selectedMessage.estado)}`}
                                            >
                                                {estadoLabel(selectedMessage.estado)}
                                            </span>
                                        </div>
                                        <p className="text-xs text-muted-foreground">
                                            {tab === 'recibidos'
                                                ? `De: ${selectedMessage.remitente?.nombre_completo || 'Sistema'}`
                                                : `Para: ${selectedMessage.destinatario?.nombre_completo || 'Destinatario'}`}
                                        </p>
                                        <p className="text-xs text-muted-foreground">
                                            {new Date(selectedMessage.created_at).toLocaleString()}
                                        </p>
                                        {markingRead === selectedMessage.id && (
                                            <p className="text-xs text-primary">Marcando como leído...</p>
                                        )}
                                    </div>
                                    <div className="rounded-lg border border-border bg-muted p-4 text-sm text-foreground whitespace-pre-line">
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
