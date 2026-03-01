import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '@/lib/supabase'
import { withTimeout } from '@/lib/async-utils'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Calendar, Megaphone, MapPin, Clock, AlertCircle } from 'lucide-react'

interface Evento {
    id: string
    titulo: string
    descripcion: string | null
    tipo: string
    fecha_inicio: string
    fecha_fin: string | null
    todo_el_dia: boolean
    lugar: string | null
}

interface Anuncio {
    id: string
    titulo: string
    contenido: string
    importante: boolean
    fecha_publicacion: string
}

export default function HomePage() {
    const navigate = useNavigate()
    const [eventos, setEventos] = useState<Evento[]>([])
    const [anuncios, setAnuncios] = useState<Anuncio[]>([])
    const [loading, setLoading] = useState(true)

    useEffect(() => {
        fetchPublicData()
    }, [])

    async function fetchPublicData() {
        try {
            setLoading(true)
            const nowIso = new Date().toISOString()
            const publicTargets = ['todos', 'estudiante', 'padre']
            const hasPublicTarget = (destinatarios?: string[] | null) => {
                if (!destinatarios || destinatarios.length === 0) return true
                return destinatarios.some((item) => publicTargets.includes((item || '').toLowerCase()))
            }

            // Obtener próximos eventos y filtrar por destinatarios públicos
            const { data: eventosData, error: eventosError } = await withTimeout(supabase
                .from('eventos')
                .select('id, titulo, descripcion, tipo, fecha_inicio, fecha_fin, todo_el_dia, lugar, destinatarios')
                .gte('fecha_inicio', nowIso)
                .order('fecha_inicio', { ascending: true })
                .limit(30), 15000, 'Tiempo de espera agotado al cargar eventos públicos')

            if (eventosError) throw eventosError

            const finalEventos = (eventosData || [])
                .filter((evento: any) => hasPublicTarget(evento.destinatarios))
                .slice(0, 5)
                .map((evento: any) => ({
                    id: evento.id,
                    titulo: evento.titulo,
                    descripcion: evento.descripcion,
                    tipo: evento.tipo,
                    fecha_inicio: evento.fecha_inicio,
                    fecha_fin: evento.fecha_fin,
                    todo_el_dia: evento.todo_el_dia,
                    lugar: evento.lugar,
                })) as Evento[]

            // Obtener anuncios activos y filtrar por destinatarios públicos
            const { data: anunciosData, error: anunciosError } = await withTimeout(supabase
                .from('anuncios')
                .select('id, titulo, contenido, importante, fecha_publicacion, destinatarios')
                .or(`fecha_expiracion.is.null,fecha_expiracion.gte.${nowIso}`)
                .order('fecha_publicacion', { ascending: false })
                .limit(30), 15000, 'Tiempo de espera agotado al cargar anuncios públicos')

            if (anunciosError) throw anunciosError

            const finalAnuncios = (anunciosData || [])
                .filter((anuncio: any) => hasPublicTarget(anuncio.destinatarios))
                .slice(0, 5)
                .map((anuncio: any) => ({
                    id: anuncio.id,
                    titulo: anuncio.titulo,
                    contenido: anuncio.contenido,
                    importante: anuncio.importante,
                    fecha_publicacion: anuncio.fecha_publicacion,
                })) as Anuncio[]

            setEventos(finalEventos)
            setAnuncios(finalAnuncios)
        } catch (error) {
            console.error('Error fetching public data:', error)
        } finally {
            setLoading(false)
        }
    }

    function formatDate(dateString: string, allDay: boolean = false) {
        const date = new Date(dateString)
        const options: Intl.DateTimeFormatOptions = allDay
            ? { year: 'numeric', month: 'long', day: 'numeric' }
            : { year: 'numeric', month: 'long', day: 'numeric', hour: '2-digit', minute: '2-digit' }

        return date.toLocaleDateString('es-ES', options)
    }

    function getEventTypeColor(tipo: string) {
        const colors: Record<string, string> = {
            'academico': 'bg-primary/10 text-primary border-primary/30',
            'deportivo': 'bg-accent/10 text-accent border-accent/30',
            'cultural': 'bg-secondary text-secondary-foreground border-secondary',
            'reunion': 'bg-muted text-foreground border-border',
            'festivo': 'bg-primary/20 text-primary border-primary/40',
            'otro': 'bg-muted/50 text-muted-foreground border-border',
        }
        return colors[tipo] || colors['otro']
    }

    if (loading) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-background via-muted to-secondary">
                <div className="text-center">
                    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
                    <p className="text-muted-foreground">Cargando...</p>
                </div>
            </div>
        )
    }

    return (
        <div className="min-h-screen bg-gradient-to-br from-background via-muted to-secondary">
            {/* Header */}
            <header className="bg-white shadow-sm border-b">
                <div className="container mx-auto px-4 py-4">
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                            <img
                                src="/images/escudo.jpg"
                                alt="Escudo Liceo Ángel de la Guarda"
                                className="h-16 w-16 object-contain"
                            />
                            <div>
                                <h1 className="text-2xl font-bold text-foreground">Liceo Ángel de la Guarda</h1>
                                <p className="text-sm text-muted-foreground">Agenda Virtual</p>
                                <p className="text-sm text-muted-foreground">26 años cultivando para el futuro</p>
                            </div>
                        </div>
                        <Button onClick={() => navigate('/login')}>
                            Iniciar Sesión
                        </Button>
                    </div>
                </div>
            </header>

            {/* Main Content */}
            <main className="container mx-auto px-4 py-8">
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                    {/* Left Sidebar - 1/3 */}
                    <div className="space-y-6">
                        {/* Misión */}
                        <Card className="shadow-lg">
                            <CardHeader className="bg-primary text-primary-foreground rounded-t-lg">
                                <CardTitle className="text-lg">Nuestra Misión</CardTitle>
                            </CardHeader>
                            <CardContent className="p-6">
                                <p className="text-foreground leading-relaxed">
                                    Formar integralmente a niños y jóvenes mediante una educación de calidad basada en valores cristianos,
                                    desarrollando sus capacidades intelectuales, espirituales y sociales para que sean ciudadanos comprometidos
                                    con el bienestar de la sociedad.
                                </p>
                            </CardContent>
                        </Card>

                        {/* Visión */}
                        <Card className="shadow-lg">
                            <CardHeader className="bg-primary text-primary-foreground rounded-t-lg">
                                <CardTitle className="text-lg">Nuestra Visión</CardTitle>
                            </CardHeader>
                            <CardContent className="p-6">
                                <p className="text-foreground leading-relaxed">
                                    Ser una institución educativa de excelencia reconocida por formar líderes íntegros, innovadores y
                                    comprometidos con los valores cristianos, que contribuyan al desarrollo sostenible de nuestra comunidad
                                    y del país.
                                </p>
                            </CardContent>
                        </Card>

                        {/* Información de Contacto */}
                        <Card className="shadow-lg">
                            <CardHeader className="bg-accent text-accent-foreground rounded-t-lg">
                                <CardTitle className="text-lg">Información de Contacto</CardTitle>
                            </CardHeader>
                            <CardContent className="p-6">
                                <div className="space-y-3 text-sm text-foreground">
                                    <div>
                                        <p className="font-semibold text-foreground">Dirección:</p>
                                        <p>Calle 36 # 41-13 este Ciudadela Sucre, Soacha, Colombia</p>
                                    </div>
                                    <div>
                                        <p className="font-semibold text-foreground">Teléfono:</p>
                                        <p>+57 302 3741098</p>
                                    </div>
                                    <div>
                                        <p className="font-semibold text-foreground">Email:</p>
                                        <p>secretaria.angel@liceoangeldelaguarda.education</p>
                                    </div>
                                    <div>
                                        <p className="font-semibold text-foreground">Instagram:</p>
                                        <a href="https://www.instagram.com/liceoangeldelaguardaeu?utm_source=ig_web_button_share_sheet&igsh=ZDNlZDc0MzIxNw==" target="_blank" rel="noopener noreferrer" style={{ textDecoration: 'underline' }}>
                                            liceoangeldelaguardaeu
                                        </a>
                                    </div>
                                    <div>
                                        <p className="font-semibold text-foreground">Facebook:</p>
                                        <a href="https://www.instagram.com/liceoangeldelaguardaeu?utm_source=ig_web_button_share_sheet&igsh=ZDNlZDc0MzIxNw==" target="_blank" rel="noopener noreferrer" style={{ textDecoration: 'underline' }}>
                                            Liceo Ángel De La Guarda E.U.
                                        </a>
                                    </div>
                                    <div>
                                        <p className="font-semibold text-foreground">Horario:</p>
                                        <p>Lunes a Viernes: 7:00 AM - 4:00 PM</p>
                                    </div>
                                </div>
                            </CardContent>
                        </Card>
                    </div>

                    {/* Right Content - 2/3 */}
                    <div className="lg:col-span-2 space-y-6">
                        {/* Próximos Eventos */}
                        <Card className="shadow-lg">
                            <CardHeader className="bg-primary text-primary-foreground rounded-t-lg">
                                <div className="flex items-center gap-2">
                                    <Calendar className="h-6 w-6" />
                                    <CardTitle className="text-xl">Próximos Eventos</CardTitle>
                                </div>
                                <CardDescription className="text-primary-foreground/80">
                                    Consulta los eventos y actividades programadas
                                </CardDescription>
                            </CardHeader>
                            <CardContent className="p-6">
                                {eventos.length === 0 ? (
                                    <div className="text-center py-8 text-muted-foreground">
                                        <Calendar className="h-12 w-12 mx-auto mb-3 opacity-50" />
                                        <p>No hay eventos programados próximamente</p>
                                    </div>
                                ) : (
                                    <div className="space-y-4">
                                        {eventos.map((evento) => (
                                            <div
                                                key={evento.id}
                                                className="border-l-4 border-primary bg-muted p-4 rounded-r-lg hover:shadow-md transition-shadow"
                                            >
                                                <div className="flex items-start justify-between gap-4">
                                                    <div className="flex-1">
                                                        <div className="flex items-center gap-2 mb-2">
                                                            <h3 className="font-semibold text-lg text-foreground">{evento.titulo}</h3>
                                                            <span className={`text-xs px-2 py-1 rounded-full border ${getEventTypeColor(evento.tipo)}`}>
                                                                {evento.tipo}
                                                            </span>
                                                        </div>
                                                        {evento.descripcion && (
                                                            <p className="text-foreground mb-2">{evento.descripcion}</p>
                                                        )}
                                                        <div className="flex flex-wrap gap-4 text-sm text-muted-foreground">
                                                            <div className="flex items-center gap-1">
                                                                <Clock className="h-4 w-4" />
                                                                <span>{formatDate(evento.fecha_inicio, evento.todo_el_dia)}</span>
                                                            </div>
                                                            {evento.lugar && (
                                                                <div className="flex items-center gap-1">
                                                                    <MapPin className="h-4 w-4" />
                                                                    <span>{evento.lugar}</span>
                                                                </div>
                                                            )}
                                                        </div>
                                                    </div>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </CardContent>
                        </Card>

                        {/* Anuncios */}
                        <Card className="shadow-lg">
                            <CardHeader className="bg-accent text-accent-foreground rounded-t-lg">
                                <div className="flex items-center gap-2">
                                    <Megaphone className="h-6 w-6" />
                                    <CardTitle className="text-xl">Anuncios</CardTitle>
                                </div>
                                <CardDescription className="text-accent-foreground/80">
                                    Mantente informado con las últimas noticias
                                </CardDescription>
                            </CardHeader>
                            <CardContent className="p-6">
                                {anuncios.length === 0 ? (
                                    <div className="text-center py-8 text-muted-foreground">
                                        <Megaphone className="h-12 w-12 mx-auto mb-3 opacity-50" />
                                        <p>No hay anuncios disponibles</p>
                                    </div>
                                ) : (
                                    <div className="space-y-4">
                                        {anuncios.map((anuncio) => (
                                            <div
                                                key={anuncio.id}
                                                className={`p-4 rounded-lg ${anuncio.importante
                                                    ? 'bg-accent/10 border-2 border-accent'
                                                    : 'bg-muted border border-border'
                                                    } hover:shadow-md transition-shadow`}
                                            >
                                                <div className="flex items-start gap-3">
                                                    {anuncio.importante && (
                                                        <AlertCircle className="h-5 w-5 text-accent flex-shrink-0 mt-1" />
                                                    )}
                                                    <div className="flex-1">
                                                        <div className="flex items-center justify-between mb-2">
                                                            <h3 className="font-semibold text-lg text-foreground">{anuncio.titulo}</h3>
                                                            {anuncio.importante && (
                                                                <span className="text-xs px-2 py-1 bg-accent text-accent-foreground rounded-full font-medium">
                                                                    Importante
                                                                </span>
                                                            )}
                                                        </div>
                                                        <p className="text-foreground mb-2 whitespace-pre-wrap">{anuncio.contenido}</p>
                                                        <p className="text-xs text-muted-foreground">
                                                            Publicado el {formatDate(anuncio.fecha_publicacion, true)}
                                                        </p>
                                                    </div>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </CardContent>
                        </Card>
                    </div>
                </div>
            </main>

            {/* Footer */}
            <footer className="bg-white border-t mt-12">
                <div className="container mx-auto px-4 py-6">
                    <div className="text-center text-muted-foreground text-sm">
                        <p>&copy; {new Date().getFullYear()} Liceo Ángel de la Guarda. Todos los derechos reservados.</p>
                    </div>
                </div>
            </footer>
        </div>
    )
}
