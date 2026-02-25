import { useEffect, useState } from 'react'
import { useAuthStore } from '@/lib/auth-store'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Calendar, Bell, Clock, Users } from 'lucide-react'
import { supabase } from '@/lib/supabase'

interface Evento {
  id: string
  titulo: string
  fecha_inicio: string
  lugar: string
  tipo: string
}

interface Anuncio {
  id: string
  titulo: string
  contenido: string
  fecha_publicacion: string
  importante: boolean
}

export default function DashboardPage() {
  const { profile, user } = useAuthStore()
  const [eventos, setEventos] = useState<Evento[]>([])
  const [anuncios, setAnuncios] = useState<Anuncio[]>([])
  const [loadingEventos, setLoadingEventos] = useState(true)
  const [loadingAnuncios, setLoadingAnuncios] = useState(true)

  useEffect(() => {
    console.log('DashboardPage - User:', user)
    console.log('DashboardPage - Profile:', profile)
    loadEventos()
    loadAnuncios()
  }, [user, profile])

  const loadEventos = async () => {
    try {
      const hoy = new Date()
      const unaSemana = new Date()
      unaSemana.setDate(hoy.getDate() + 7)

      const { data, error } = await supabase
        .from('eventos')
        .select('*')
        .gte('fecha_inicio', hoy.toISOString())
        .lte('fecha_inicio', unaSemana.toISOString())
        .order('fecha_inicio', { ascending: true })
        .limit(5)

      if (error) throw error
      setEventos(data || [])
    } catch (error) {
      console.error('Error cargando eventos:', error)
    } finally {
      setLoadingEventos(false)
    }
  }

  const loadAnuncios = async () => {
    try {
      const { data, error } = await supabase
        .from('anuncios')
        .select('*')
        .order('fecha_publicacion', { ascending: false })
        .limit(3)

      if (error) throw error
      setAnuncios(data || [])
    } catch (error) {
      console.error('Error cargando anuncios:', error)
    } finally {
      setLoadingAnuncios(false)
    }
  }

  const formatFecha = (fecha: string) => {
    const date = new Date(fecha)
    const dias = ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb']
    return {
      dia: dias[date.getDay()],
      numero: date.getDate()
    }
  }

  const formatHora = (fecha: string) => {
    const date = new Date(fecha)
    return date.toLocaleTimeString('es-CO', { hour: '2-digit', minute: '2-digit' })
  }

  const tiempoDesde = (fecha: string) => {
    const ahora = new Date()
    const entonces = new Date(fecha)
    const diff = Math.floor((ahora.getTime() - entonces.getTime()) / 1000)

    if (diff < 60) return 'Hace un momento'
    if (diff < 3600) return `Hace ${Math.floor(diff / 60)} minutos`
    if (diff < 86400) return `Hace ${Math.floor(diff / 3600)} horas`
    if (diff < 604800) return `Hace ${Math.floor(diff / 86400)} días`
    return 'Hace más de una semana'
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold text-foreground">
          ¡Bienvenido, {profile?.nombre_completo}!
        </h1>
        <p className="text-muted-foreground mt-1">
          Aquí encontrarás un resumen de tu actividad académica
        </p>
      </div>

      {/* Stats Grid */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Calendario
            </CardTitle>
            <Calendar className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{eventos.length}</div>
            <p className="text-xs text-muted-foreground">
              eventos esta semana
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Anuncios
            </CardTitle>
            <Bell className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{anuncios.length}</div>
            <p className="text-xs text-muted-foreground">
              anuncios recientes
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Rol
            </CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold capitalize">{profile?.rol}</div>
            <p className="text-xs text-muted-foreground">
              tu perfil
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Estado
            </CardTitle>
            <Clock className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{profile?.activo ? 'Activo' : 'Inactivo'}</div>
            <p className="text-xs text-muted-foreground">
              tu cuenta
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Main Content Grid */}
      <div className="grid gap-6 md:grid-cols-2">
        {/* Calendario Semanal */}
        <Card>
          <CardHeader>
            <CardTitle>Calendario de esta semana</CardTitle>
            <CardDescription>
              Próximos eventos y fechas importantes
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {loadingEventos ? (
              <p className="text-sm text-muted-foreground">Cargando eventos...</p>
            ) : eventos.length === 0 ? (
              <p className="text-sm text-muted-foreground">No hay eventos esta semana</p>
            ) : (
              eventos.map((evento) => {
                const fecha = formatFecha(evento.fecha_inicio)
                const hora = formatHora(evento.fecha_inicio)
                const colors = {
                  'Reunión': 'blue',
                  'Evaluación': 'purple',
                  'Festivo': 'green',
                  'Cultural': 'pink',
                  'Académico': 'indigo',
                }
                const color = colors[evento.tipo as keyof typeof colors] || 'gray'

                return (
                  <div key={evento.id} className={`flex items-start gap-3 p-3 rounded-lg bg-${color}-50 border border-${color}-100`}>
                    <div className={`flex-shrink-0 w-12 h-12 rounded-lg bg-${color}-600 text-white flex flex-col items-center justify-center`}>
                      <span className="text-xs font-medium">{fecha.dia}</span>
                      <span className="text-lg font-bold">{fecha.numero}</span>
                    </div>
                    <div>
                      <p className="font-medium text-foreground">{evento.titulo}</p>
                      <p className="text-sm text-muted-foreground">{hora} - {evento.lugar}</p>
                    </div>
                  </div>
                )
              })
            )}
          </CardContent>
        </Card>

        {/* Anuncios Recientes */}
        <Card>
          <CardHeader>
            <CardTitle>Anuncios recientes</CardTitle>
            <CardDescription>
              Últimas novedades del colegio
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {loadingAnuncios ? (
              <p className="text-sm text-muted-foreground">Cargando anuncios...</p>
            ) : anuncios.length === 0 ? (
              <p className="text-sm text-muted-foreground">No hay anuncios recientes</p>
            ) : (
              anuncios.map((anuncio, index) => {
                const colors = ['blue', 'purple', 'green', 'orange']
                const color = colors[index % colors.length]

                return (
                  <div key={anuncio.id} className={`border-l-4 border-${color}-600 pl-4 py-2`}>
                    <p className="font-medium text-foreground flex items-center gap-2">
                      {anuncio.titulo}
                      {anuncio.importante && (
                        <span className="text-xs bg-destructive/10 text-destructive px-2 py-0.5 rounded-full">Importante</span>
                      )}
                    </p>
                    <p className="text-sm text-muted-foreground mt-1">
                      {anuncio.contenido.substring(0, 100)}{anuncio.contenido.length > 100 ? '...' : ''}
                    </p>
                    <p className="text-xs text-muted-foreground mt-2">{tiempoDesde(anuncio.fecha_publicacion)}</p>
                  </div>
                )
              })
            )}
          </CardContent>
        </Card>
      </div>

      {/* Información de perfil */}
      <Card>
        <CardHeader>
          <CardTitle>📋 Información de tu perfil</CardTitle>
          <CardDescription>
            Detalles de tu cuenta
          </CardDescription>
        </CardHeader>
        <CardContent>
          {!profile ? (
            <div className="text-center py-4">
              <p className="text-sm text-muted-foreground">Cargando información del perfil...</p>
              <p className="text-xs text-muted-foreground mt-2">User ID: {user?.id || 'No disponible'}</p>
            </div>
          ) : (
            <div className="grid gap-4 md:grid-cols-3">
              <div className="flex flex-col gap-1">
                <span className="text-sm text-muted-foreground">Nombre completo</span>
                <span className="font-medium">{profile.nombre_completo || 'No disponible'}</span>
              </div>
              <div className="flex flex-col gap-1">
                <span className="text-sm text-muted-foreground">Email</span>
                <span className="font-medium">{profile.email || 'No disponible'}</span>
              </div>
              <div className="flex flex-col gap-1">
                <span className="text-sm text-muted-foreground">Teléfono</span>
                <span className="font-medium">{profile.telefono || 'No registrado'}</span>
              </div>
              <div className="flex flex-col gap-1">
                <span className="text-sm text-muted-foreground">Rol</span>
                <span className="font-medium capitalize">{profile.rol || 'No asignado'}</span>
              </div>
              <div className="flex flex-col gap-1">
                <span className="text-sm text-muted-foreground">Dirección</span>
                <span className="font-medium">{profile.direccion || 'No registrada'}</span>
              </div>
              <div className="flex flex-col gap-1">
                <span className="text-sm text-muted-foreground">Estado</span>
                <span className={`font-medium ${profile.activo ? 'text-primary' : 'text-destructive'}`}>
                  {profile.activo ? 'Activo' : 'Inactivo'}
                </span>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
