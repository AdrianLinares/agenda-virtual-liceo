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
    const [destinatario, setDestinatario] = useState('todos')
    const [fechaExpiracion, setFechaExpiracion] = useState('')
    const [importante, setImportante] = useState(false)

    const isStaff = profile?.rol === 'administrador' || profile?.rol === 'administrativo' || profile?.rol === 'docente'

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

            if (profile.rol) {
                query = query.or(`destinatarios.cs.{${profile.rol}},destinatarios.cs.{todos}`)
            }

            const { data, error } = await query
            if (error) throw error

            const now = new Date()
            const items = (data || []) as Anuncio[]
            const filtered = items.filter((item) => {
                if (!item.fecha_expiracion) return true
                return new Date(item.fecha_expiracion) >= now
            })

            setAnuncios(filtered)
        } catch (err) {
            console.error('Error loading anuncios:', err)
            setError('Error al cargar los anuncios')
        } finally {
            setLoading(false)
        }
    }

    const handleCreateAnuncio = async () => {
        if (!profile) return
        if (!titulo.trim() || !contenido.trim()) {
            setError('Completa el título y el contenido')
            return
        }

        setSaving(true)
        setError(null)
        setSuccess(null)

        try {
            const payload = {
                titulo: titulo.trim(),
                contenido: contenido.trim(),
                autor_id: profile.id,
                destinatarios: [destinatario],
                importante,
                fecha_publicacion: new Date().toISOString(),
                fecha_expiracion: fechaExpiracion ? new Date(fechaExpiracion).toISOString() : null,
            }

            const { error } = await (supabase as any)
                .from('anuncios')
                .insert(payload)

            if (error) throw error

            setTitulo('')
            setContenido('')
            setDestinatario('todos')
            setFechaExpiracion('')
            setImportante(false)
            setSuccess('Anuncio publicado')
            await loadAnuncios()
        } catch (err) {
            console.error('Error creating anuncio:', err)
            setError('Error al publicar el anuncio')
        } finally {
            setSaving(false)
        }
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
                <Card>
                    <CardHeader>
                        <CardTitle>Publicar anuncio</CardTitle>
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

                        <Button onClick={handleCreateAnuncio} disabled={saving}>
                            {saving ? (
                                <>
                                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                    Publicando...
                                </>
                            ) : (
                                'Publicar'
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
