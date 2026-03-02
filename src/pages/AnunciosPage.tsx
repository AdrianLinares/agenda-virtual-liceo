import { useEffect, useMemo, useState } from 'react'
import { useAuthStore } from '@/lib/auth-store'
import { supabase } from '@/lib/supabase'
import { withTimeout } from '@/lib/async-utils'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { AlertCircle, Bell, CheckCircle2, Loader2, Megaphone } from 'lucide-react'

interface Anuncio {
    id: string
    titulo: string
    contenido: string
    autor_id: string
    destinatarios: string[]
    importante: boolean
    fecha_publicacion: string
    fecha_expiracion: string | null
    created_at: string
    autor?: {
        nombre_completo: string
        email: string
    }
}

const DESTINATARIOS = [
    { value: 'todos', label: 'Todos' },
    { value: 'estudiante', label: 'Estudiantes' },
    { value: 'padre', label: 'Padres' },
    { value: 'docente', label: 'Docentes' },
    { value: 'administrativo', label: 'Administrativos' },
    { value: 'administrador', label: 'Administradores' },
]

export default function AnunciosPage() {
    const { profile } = useAuthStore()
    const [anuncios, setAnuncios] = useState<Anuncio[]>([])
    const [loading, setLoading] = useState(false)
    const [saving, setSaving] = useState(false)
    const [error, setError] = useState<string | null>(null)
    const [success, setSuccess] = useState<string | null>(null)

    const [titulo, setTitulo] = useState('')
    const [contenido, setContenido] = useState('')
    const [destinatarios, setDestinatarios] = useState<string[]>(['todos'])
    const [fechaExpiracion, setFechaExpiracion] = useState('')
    const [importante, setImportante] = useState(false)
    const [formOpen, setFormOpen] = useState(false)
    const [editingId, setEditingId] = useState<string | null>(null)

    const isStaff = profile?.rol === 'administrador' || profile?.rol === 'administrativo' || profile?.rol === 'docente'
    const canViewAll = profile?.rol === 'administrador' || profile?.rol === 'administrativo'

    useEffect(() => {
        if (profile) {
            loadAnuncios()
        }
    }, [profile])

    const loadAnuncios = async () => {
        if (!profile) return

        setLoading(true)
        setError(null)

        try {
            let query = supabase
                .from('anuncios')
                .select(`
          *,
          autor:autor_id (nombre_completo, email)
        `)
                .order('fecha_publicacion', { ascending: false })

            if (profile.rol && !canViewAll) {
                query = query.or(`destinatarios.cs.{${profile.rol}},destinatarios.cs.{todos}`)
            }

            const { data, error } = await withTimeout(query, 15000, 'Tiempo de espera agotado al cargar anuncios')
            if (error) throw error

            const items = (data || []) as Anuncio[]
            const visibleItems = canViewAll
                ? items
                : items.filter((item) => {
                    if (!item.fecha_expiracion) return true
                    return new Date(item.fecha_expiracion) >= new Date()
                })

            setAnuncios(visibleItems)
        } catch (err) {
            console.error('Error loading anuncios:', err)
            setError('Error al cargar los anuncios')
        } finally {
            setLoading(false)
        }
    }

    const resetForm = () => {
        setTitulo('')
        setContenido('')
        setDestinatarios(['todos'])
        setFechaExpiracion('')
        setImportante(false)
        setEditingId(null)
        setFormOpen(false)
    }

    const handleDestinatarioToggle = (value: string, checked: boolean) => {
        if (value === 'todos') {
            setDestinatarios(checked ? ['todos'] : [])
            return
        }

        setDestinatarios((prev) => {
            const withoutTodos = prev.filter((item) => item !== 'todos')

            if (checked) {
                return Array.from(new Set([...withoutTodos, value]))
            }

            return withoutTodos.filter((item) => item !== value)
        })
    }

    const handleSaveAnuncio = async () => {
        if (!profile) return
        if (!titulo.trim() || !contenido.trim()) {
            setFormOpen(true)
            setError('Completa el título y el contenido')
            return
        }

        if (destinatarios.length === 0) {
            setFormOpen(true)
            setError('Selecciona al menos un destinatario')
            return
        }

        setSaving(true)
        setError(null)
        setSuccess(null)

        try {
            const normalizedDestinatarios = destinatarios.includes('todos')
                ? ['todos']
                : Array.from(new Set(destinatarios))

            const payload = {
                titulo: titulo.trim(),
                contenido: contenido.trim(),
                destinatarios: normalizedDestinatarios,
                importante,
                fecha_expiracion: fechaExpiracion ? new Date(fechaExpiracion).toISOString() : null,
            }

            let error = null

            if (editingId) {
                const result: any = await withTimeout((supabase as any)
                    .from('anuncios')
                    .update(payload)
                    .eq('id', editingId), 15000, 'Tiempo de espera agotado al actualizar el anuncio')
                error = result.error
            } else {
                const result: any = await withTimeout((supabase as any)
                    .from('anuncios')
                    .insert({
                        ...payload,
                        autor_id: profile.id,
                        fecha_publicacion: new Date().toISOString(),
                    }), 15000, 'Tiempo de espera agotado al publicar el anuncio')
                error = result.error
            }

            if (error) throw error

            resetForm()
            setSuccess(editingId ? 'Anuncio actualizado' : 'Anuncio publicado')
            await loadAnuncios()
        } catch (err) {
            console.error('Error saving anuncio:', err)
            setFormOpen(true)
            setError(editingId ? 'Error al actualizar el anuncio' : 'Error al publicar el anuncio')
        } finally {
            setSaving(false)
        }
    }

    const handleEditAnuncio = (anuncio: Anuncio) => {
        setFormOpen(true)
        setEditingId(anuncio.id)
        setTitulo(anuncio.titulo)
        setContenido(anuncio.contenido)
        setDestinatarios(anuncio.destinatarios.length > 0 ? anuncio.destinatarios : ['todos'])
        setFechaExpiracion(anuncio.fecha_expiracion ? anuncio.fecha_expiracion.slice(0, 10) : '')
        setImportante(anuncio.importante)
        setError(null)
        setSuccess(null)
    }

    const handleDeleteAnuncio = async (anuncioId: string) => {
        if (!window.confirm('¿Seguro que deseas eliminar este anuncio?')) return

        setSaving(true)
        setError(null)
        setSuccess(null)

        try {
            const result: any = await withTimeout((supabase as any)
                .from('anuncios')
                .delete()
                .eq('id', anuncioId), 15000, 'Tiempo de espera agotado al eliminar el anuncio')
            const error = result?.error

            if (error) throw error

            if (editingId === anuncioId) {
                resetForm()
            }

            setAnuncios((prev) => prev.filter((item) => item.id !== anuncioId))
            const verification: any = await withTimeout((supabase as any)
                .from('anuncios')
                .select('id')
                .eq('id', anuncioId)
                .maybeSingle(), 15000, 'Tiempo de espera agotado al verificar eliminación del anuncio')

            if (verification?.error) {
                throw verification.error
            }

            const stillExists = Boolean(verification?.data?.id)
            if (stillExists) {
                throw new Error('No se pudo eliminar el anuncio (sin permisos o ya no existe)')
            }

            await loadAnuncios()
            setSuccess('Anuncio eliminado')
        } catch (err) {
            console.error('Error deleting anuncio:', err)
            setError('Error al eliminar el anuncio')
        } finally {
            setSaving(false)
        }
    }

    const canEditOrDelete = (anuncio: Anuncio) => {
        if (!profile) return false
        if (profile.rol === 'administrador' || profile.rol === 'administrativo') return true
        return anuncio.autor_id === profile.id
    }

    const headerDescription = useMemo(() => {
        if (profile?.rol === 'estudiante') return 'Consulta las últimas novedades del colegio'
        if (profile?.rol === 'padre') return 'Mantente al tanto de los avisos importantes'
        if (profile?.rol === 'docente') return 'Publica y revisa anuncios para tu comunidad'
        return 'Gestión de anuncios institucionales'
    }, [profile?.rol])

    return (
        <div className="space-y-6">
            <div>
                <h1 className="text-3xl font-bold text-foreground">Anuncios</h1>
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

            {isStaff && (
                <div className="space-y-4">
                    <Button
                        variant={formOpen ? 'outline' : 'default'}
                        onClick={() => {
                            if (formOpen) {
                                resetForm()
                            } else {
                                setFormOpen(true)
                            }
                        }}
                    >
                        {formOpen ? 'Ocultar formulario' : 'Publicar anuncio'}
                    </Button>

                    {formOpen && (
                        <Card>
                            <CardHeader>
                                <CardTitle>{editingId ? 'Editar anuncio' : 'Publicar anuncio'}</CardTitle>
                                <CardDescription>
                                    Comparte información con la comunidad educativa
                                </CardDescription>
                            </CardHeader>
                            <CardContent className="space-y-4">
                                <div className="grid gap-4 md:grid-cols-2">
                                    <div className="space-y-2">
                                        <Label>Título</Label>
                                        <Input value={titulo} onChange={(e) => setTitulo(e.target.value)} />
                                    </div>
                                    <div className="space-y-2">
                                        <Label>Destinatarios</Label>
                                        <div className="rounded-md border border-input p-3 space-y-2 max-h-48 overflow-y-auto">
                                            {DESTINATARIOS.map((item) => {
                                                const checked = destinatarios.includes(item.value)
                                                return (
                                                    <label key={item.value} className="flex items-center gap-2 text-sm text-foreground">
                                                        <input
                                                            type="checkbox"
                                                            className="h-4 w-4 rounded border-input"
                                                            checked={checked}
                                                            onChange={(e) => handleDestinatarioToggle(item.value, e.target.checked)}
                                                        />
                                                        <span>{item.label}</span>
                                                    </label>
                                                )
                                            })}
                                        </div>
                                    </div>
                                </div>

                                <div className="space-y-2">
                                    <Label>Contenido</Label>
                                    <Input value={contenido} onChange={(e) => setContenido(e.target.value)} />
                                </div>

                                <div className="grid gap-4 md:grid-cols-2">
                                    <div className="space-y-2">
                                        <Label>Fecha de expiración (opcional)</Label>
                                        <Input
                                            type="date"
                                            value={fechaExpiracion}
                                            onChange={(e) => setFechaExpiracion(e.target.value)}
                                        />
                                    </div>
                                    <div className="flex items-center gap-2 pt-7">
                                        <input
                                            id="importante"
                                            type="checkbox"
                                            className="h-4 w-4 rounded border-input"
                                            checked={importante}
                                            onChange={(e) => setImportante(e.target.checked)}
                                        />
                                        <Label htmlFor="importante">Marcar como importante</Label>
                                    </div>
                                </div>

                                <div className="flex items-center gap-2">
                                    <Button onClick={handleSaveAnuncio} disabled={saving}>
                                        {saving ? (
                                            <>
                                                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                                {editingId ? 'Guardando...' : 'Publicando...'}
                                            </>
                                        ) : (
                                            editingId ? 'Guardar cambios' : 'Publicar'
                                        )}
                                    </Button>
                                    {editingId && (
                                        <Button variant="outline" onClick={resetForm} disabled={saving}>
                                            Cancelar
                                        </Button>
                                    )}
                                </div>
                            </CardContent>
                        </Card>
                    )}
                </div>
            )}

            {loading && (
                <div className="flex items-center justify-center py-12">
                    <Loader2 className="h-8 w-8 animate-spin text-primary" />
                </div>
            )}

            {!loading && anuncios.length === 0 && (
                <Alert>
                    <Bell className="h-4 w-4" />
                    <AlertDescription>No hay anuncios disponibles.</AlertDescription>
                </Alert>
            )}

            {!loading && anuncios.length > 0 && (
                <div className="space-y-4">
                    {anuncios.map((anuncio) => (
                        <Card key={anuncio.id}>
                            <CardHeader className="space-y-2">
                                <div className="flex items-start justify-between">
                                    <div>
                                        <CardTitle className="flex items-center gap-2">
                                            {anuncio.importante && (
                                                <span className="inline-flex items-center gap-1 rounded-full bg-rose-100 px-2 py-1 text-xs font-semibold text-rose-700">
                                                    <Megaphone className="h-3 w-3" />
                                                    Importante
                                                </span>
                                            )}
                                            <span>{anuncio.titulo}</span>
                                        </CardTitle>
                                        <CardDescription>
                                            {new Date(anuncio.fecha_publicacion).toLocaleDateString()} •
                                            {anuncio.autor?.nombre_completo ? ` ${anuncio.autor.nombre_completo}` : ' Sistema'}
                                        </CardDescription>
                                    </div>
                                    <span className="text-xs text-muted-foreground">
                                        {anuncio.destinatarios.join(', ')}
                                    </span>
                                </div>
                                {canEditOrDelete(anuncio) && (
                                    <div className="flex items-center gap-2">
                                        <Button
                                            variant="outline"
                                            size="sm"
                                            onClick={() => handleEditAnuncio(anuncio)}
                                            disabled={saving}
                                        >
                                            Editar
                                        </Button>
                                        <Button
                                            variant="destructive"
                                            size="sm"
                                            onClick={() => handleDeleteAnuncio(anuncio.id)}
                                            disabled={saving}
                                        >
                                            Eliminar
                                        </Button>
                                    </div>
                                )}
                            </CardHeader>
                            <CardContent>
                                <p className="text-sm text-foreground whitespace-pre-line">{anuncio.contenido}</p>
                            </CardContent>
                        </Card>
                    ))}
                </div>
            )}
        </div>
    )
}
