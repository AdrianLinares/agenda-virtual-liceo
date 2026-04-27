import { useCallback, useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuthStore } from '@/lib/auth-store'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Mail, Users, UserSearch, Clock, RefreshCw, CheckCircle, FileText } from 'lucide-react'
// Tipos y estructura de estadísticas mostradas en el dashboard
interface AsistenciaStats {
  presentes: number
  ausentes: number
  tarde: number
  excusas: number
}

interface NotasStats {
  total: number
  promedio: number
}

interface PermisosStats {
  pendiente: number
  aprobado: number
  rechazado: number
}

// Código auxiliar de caché y utilidades para el dashboard
import { supabase } from '@/lib/supabase'
import { withRetry, withTimeout } from '@/lib/async-utils'
import { rpcCountNotas } from '@/lib/supabase'

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

type GroupAssignment = {
  grupo_id: string
}

type TeacherStudent = {
  estudiante_id: string
}

type TeacherAssignment = {
  grupo_id: string
  asignatura_id: string
}

const DASHBOARD_CACHE_TTL_MS = 60_000

type CachedEntry<T> = {
  value: T
  updatedAt: number
}

const dashboardCache = {
  eventosByUser: new Map<string, CachedEntry<Evento[]>>(),
  anunciosByUser: new Map<string, CachedEntry<Anuncio[]>>(),
  mensajesSinLeerByProfile: new Map<string, CachedEntry<number>>(),
  seguimientosByUser: new Map<string, CachedEntry<number>>(),
  horariosByUser: new Map<string, CachedEntry<number>>(),
  citacionesByUser: new Map<string, CachedEntry<number>>(),
  asistenciaByUser: new Map<string, CachedEntry<AsistenciaStats>>(),
  notasByUser: new Map<string, CachedEntry<NotasStats>>(),
  permisosByUser: new Map<string, CachedEntry<PermisosStats>>(),
}

function getFreshCache<T>(map: Map<string, CachedEntry<T>>, key: string): T | null {
  const entry = map.get(key)
  if (!entry) return null

  if (Date.now() - entry.updatedAt > DASHBOARD_CACHE_TTL_MS) {
    map.delete(key)
    return null
  }

  return entry.value
}

function setCache<T>(map: Map<string, CachedEntry<T>>, key: string, value: T) {
  map.set(key, {
    value,
    updatedAt: Date.now(),
  })
}

function clearDashboardCache(userId: string | null, profileId: string | null) {
  if (userId) {
    dashboardCache.eventosByUser.delete(userId)
    dashboardCache.anunciosByUser.delete(userId)
    dashboardCache.seguimientosByUser.delete(userId)
    dashboardCache.horariosByUser.delete(userId)
    dashboardCache.citacionesByUser.delete(userId)
  }

  if (profileId) {
    dashboardCache.mensajesSinLeerByProfile.delete(profileId)
  }
}

export default function DashboardPage() {
  // Declaración de hooks de usuario primero
  const { profile, user } = useAuthStore()
  const userId = user?.id ?? null
  const profileId = profile?.id ?? null
  const navigate = useNavigate()
  // Estado y funciones para tarjetas y contadores secundarios
  const [eventos, setEventos] = useState<Evento[]>([])
  const [anuncios, setAnuncios] = useState<Anuncio[]>([])
  const [loadingEventos, setLoadingEventos] = useState(true)
  const [loadingAnuncios, setLoadingAnuncios] = useState(true)
  const [seguimientosCount, setSeguimientosCount] = useState(0)
  const [loadingSeguimientosCount, setLoadingSeguimientosCount] = useState(true)
  const [horariosCount, setHorariosCount] = useState(0)
  const [loadingHorariosCount, setLoadingHorariosCount] = useState(true)
  const [citacionesProximas, setCitacionesProximas] = useState(0)
  const [loadingCitaciones, setLoadingCitaciones] = useState(true)
  const [refreshing, setRefreshing] = useState(false)

  // Mensajes sin leer
  const [mensajesSinLeer, setMensajesSinLeer] = useState(0)
  const [loadingMensajesSinLeer, setLoadingMensajesSinLeer] = useState(true)
  const loadMensajesSinLeer = useCallback(async () => {
    if (!profileId) {
      setMensajesSinLeer(0)
      setLoadingMensajesSinLeer(false)
      return
    }
    const cachedCount = getFreshCache(dashboardCache.mensajesSinLeerByProfile, profileId)
    if (cachedCount !== null) {
      setMensajesSinLeer(cachedCount)
      setLoadingMensajesSinLeer(false)
      return
    }
    setLoadingMensajesSinLeer(true)
    try {
      const { count, error } = await withRetry(async () => withTimeout(supabase
        .from('mensajes')
        .select('id', { count: 'exact', head: true })
        .eq('destinatario_id', profileId)
        .eq('estado', 'enviado'), 15000, 'Tiempo de espera agotado al cargar mensajes sin leer'))
      if (error) throw error
      const resolvedCount = count ?? 0
      setMensajesSinLeer(resolvedCount)
      setCache(dashboardCache.mensajesSinLeerByProfile, profileId, resolvedCount)
    } catch (error) {
      setMensajesSinLeer(0)
    } finally {
      setLoadingMensajesSinLeer(false)
    }
  }, [profileId])
  // ...existing code...


  // Hooks y funciones de stats
  const [asistenciaStats, setAsistenciaStats] = useState<AsistenciaStats>({ presentes: 0, ausentes: 0, tarde: 0, excusas: 0 })
  const [loadingAsistencia, setLoadingAsistencia] = useState(true)
  const [notasStats, setNotasStats] = useState<NotasStats>({ total: 0, promedio: 0 })
  const [loadingNotas, setLoadingNotas] = useState(true)
  const [permisosStats, setPermisosStats] = useState<PermisosStats>({ pendiente: 0, aprobado: 0, rechazado: 0 })
  const [loadingPermisos, setLoadingPermisos] = useState(true)

  // Asistencia: presentes, ausentes, tarde, excusas
  const loadAsistenciaStats = useCallback(async () => {
    if (!userId) {
      setAsistenciaStats({ presentes: 0, ausentes: 0, tarde: 0, excusas: 0 })
      setLoadingAsistencia(false)
      return
    }
    const isAdmin = profile?.rol === 'administrador' || profile?.rol === 'administrativo'
    const isDocente = profile?.rol === 'docente'
    const cacheKey = isAdmin ? 'global' : isDocente ? profile?.id ?? '' : userId
    const cached = getFreshCache(dashboardCache.asistenciaByUser, cacheKey)
    if (cached) {
      setAsistenciaStats(cached)
      setLoadingAsistencia(false)
      return
    }
    setLoadingAsistencia(true)

    try {
      let query = supabase
        .from('asistencias')
        .select('estado, estudiante_id')
        .gte('fecha', '2026-01-01')
        .lte('fecha', '2026-12-31')
      if (isDocente && profile?.id) {
        // Obtener grupos asignados al docente
        const { data: asignaciones, error: errorAsign } = await withTimeout(
          supabase
            .from('asignaciones_docentes')
            .select('grupo_id')
            .eq('docente_id', profile.id),
          8000,
          'Tiempo de espera agotado al cargar asignaciones del docente'
        )
        if (errorAsign) throw errorAsign
        const grupos = Array.from(new Set(((asignaciones || []) as GroupAssignment[]).map((a) => a.grupo_id)))
        if (grupos.length > 0) {
          // Obtener estudiantes de esos grupos
          const { data: estudiantes, error: errorEst } = await withTimeout(
            supabase
              .from('estudiantes_grupos')
              .select('estudiante_id')
              .in('grupo_id', grupos),
            8000,
            'Tiempo de espera agotado al cargar estudiantes de los grupos del docente'
          )
          if (errorEst) throw errorEst
          const estudiantesIds = Array.from(new Set(((estudiantes || []) as TeacherStudent[]).map((e) => e.estudiante_id)))
          if (estudiantesIds.length > 0) {
            query = query.in('estudiante_id', estudiantesIds)
          } else {
            setAsistenciaStats({ presentes: 0, ausentes: 0, tarde: 0, excusas: 0 })
            setLoadingAsistencia(false)
            return
          }
        } else {
          setAsistenciaStats({ presentes: 0, ausentes: 0, tarde: 0, excusas: 0 })
          setLoadingAsistencia(false)
          return
        }
      } else if (!isAdmin && userId) {
        query = query.eq('estudiante_id', userId)
      }
      const { data, error } = await withTimeout(query, 12000, 'Tiempo de espera agotado al cargar asistencia')
      if (error) throw error
      const stats: AsistenciaStats = { presentes: 0, ausentes: 0, tarde: 0, excusas: 0 }
      for (const row of (data as Array<{ estado: string }> || [])) {
        switch (row.estado) {
          case 'presente': stats.presentes++; break
          case 'ausente': stats.ausentes++; break
          case 'tarde': stats.tarde++; break
          case 'excusa': stats.excusas++; break
        }
      }
      setAsistenciaStats(stats)
      setCache(dashboardCache.asistenciaByUser, cacheKey, stats)
    } catch (error) {
      setAsistenciaStats({ presentes: 0, ausentes: 0, tarde: 0, excusas: 0 })
    } finally {
      setLoadingAsistencia(false)
    }
  }, [userId, profile?.rol, profile?.id])

  // Notas: total y promedio
  const loadNotasStats = useCallback(async () => {
    const isAdmin = profile?.rol === 'administrador' || profile?.rol === 'administrativo'
    const isDocente = profile?.rol === 'docente'
    const cacheKey = isAdmin ? 'global' : isDocente ? profile?.id ?? '' : userId || ''
    if (!isAdmin && !isDocente && !userId) {
      setNotasStats({ total: 0, promedio: 0 })
      setLoadingNotas(false)
      return
    }
    const cached = getFreshCache(dashboardCache.notasByUser, cacheKey)
    if (cached) {
      setNotasStats(cached)
      setLoadingNotas(false)
      return
    }
    setLoadingNotas(true)
    try {
      // 1. Obtener periodos del año 2026
      const { data: periodos, error: errorPeriodos } = await withTimeout(
        supabase.from('periodos').select('id').eq('año_academico', 2026),
        8000,
        'Tiempo de espera agotado al cargar periodos'
      )
      if (errorPeriodos) throw errorPeriodos
      const periodoIds = (periodos as Array<{ id: string }>).map((p) => p.id)
      if (periodoIds.length === 0) {
        setNotasStats({ total: 0, promedio: 0 })
        setLoadingNotas(false)
        return
      }
      let query = supabase
        .from('notas')
        .select('nota, grupo_id, asignatura_id')
        .in('periodo_id', periodoIds)
      let grupos: string[] = []
      let asignaturas: string[] = []
      if (isDocente && profile?.id) {
        // Obtener grupos y asignaturas asignados al docente
        const { data: asignacionesData, error: errorAsign } = await withTimeout(
          supabase
            .from('asignaciones_docentes')
            .select('grupo_id, asignatura_id')
            .eq('docente_id', profile.id),
          8000,
          'Tiempo de espera agotado al cargar asignaciones del docente'
        )
        if (errorAsign) throw errorAsign
        grupos = Array.from(new Set(((asignacionesData || []) as TeacherAssignment[]).map((a) => a.grupo_id)))
        asignaturas = Array.from(new Set(((asignacionesData || []) as TeacherAssignment[]).map((a) => a.asignatura_id)))
        if (grupos.length === 0 || asignaturas.length === 0) {
          setNotasStats({ total: 0, promedio: 0 })
          setLoadingNotas(false)
          return
        }
        query = query.in('grupo_id', grupos).in('asignatura_id', asignaturas)
      }

      // Get filters for RPC
      const filters: any = { periodo_id: periodoIds }
      if (isDocente && profile?.id) {
        if (grupos.length > 0) filters.grupo_id = grupos
        if (asignaturas.length > 0) filters.asignatura_id = asignaturas
      } else if (!isAdmin && userId) {
        filters.estudiante_id = userId
      }

      // Use RPC for total count, fallback to data.length if fails
      let total: number
      try {
        total = await rpcCountNotas(filters)
      } catch (rpcError) {
        console.log('RPC notas_count failed, falling back to data.length:', rpcError)
        // Will set after fetching data
      }

      const { data, error } = await withTimeout(query, 12000, 'Tiempo de espera agotado al cargar notas')
      if (error) throw error
      const notas = (data as Array<{ nota: number }> || []).map((n) => n.nota)
      if (total === undefined) {
        total = notas.length
      }
      const promedio = total > 0 ? Math.round((notas.reduce((a, b) => a + b, 0) / notas.length) * 100) / 100 : 0
      const stats: NotasStats = { total, promedio }
      setNotasStats(stats)
      setCache(dashboardCache.notasByUser, cacheKey, stats)
    } catch (error) {
      console.error('Error loading notas stats:', error)
      setNotasStats({ total: 0, promedio: 0 })
    } finally {
      setLoadingNotas(false)
    }
  }, [userId, profile?.rol, profile?.id])

  // Permisos: pendiente, aprobado, rechazado
  const loadPermisosStats = useCallback(async () => {
    const isAdmin = profile?.rol === 'administrador' || profile?.rol === 'administrativo'
    const cacheKey = isAdmin ? 'global' : userId || ''
    if (!isAdmin && !userId) {
      setPermisosStats({ pendiente: 0, aprobado: 0, rechazado: 0 })
      setLoadingPermisos(false)
      return
    }
    const cached = getFreshCache(dashboardCache.permisosByUser, cacheKey)
    if (cached) {
      setPermisosStats(cached)
      setLoadingPermisos(false)
      return
    }
    setLoadingPermisos(true)
    try {
      let query = supabase
        .from('permisos')
        .select('estado')
      if (!isAdmin && userId) {
        query = query.eq('estudiante_id', userId)
      }
      // Si quieres filtrar por año, aquí puedes agregar lógica por fecha_inicio/fecha_fin
      const { data, error } = await withTimeout(query, 12000, 'Tiempo de espera agotado al cargar permisos')
      if (error) throw error
      const stats: PermisosStats = { pendiente: 0, aprobado: 0, rechazado: 0 }
      for (const row of (data as Array<{ estado: string }> || [])) {
        switch (row.estado) {
          case 'pendiente': stats.pendiente++; break
          case 'aprobado': stats.aprobado++; break
          case 'rechazado': stats.rechazado++; break
        }
      }
      setPermisosStats(stats)
      setCache(dashboardCache.permisosByUser, cacheKey, stats)
    } catch (error) {
      setPermisosStats({ pendiente: 0, aprobado: 0, rechazado: 0 })
    } finally {
      setLoadingPermisos(false)
    }
  }, [userId, profile?.rol])
  useEffect(() => {
    if (!userId) {
      return
    }

    let cancelled = false

    // Fase 1: datos críticos para pintar el dashboard rápido.
    void Promise.allSettled([
      loadEventos(),
      loadAnuncios(),
      loadMensajesSinLeer(),
      loadAsistenciaStats(),
      loadNotasStats(),
      loadPermisosStats(),
    ])

    // Fase 2: contadores secundarios, diferidos para evitar pico inicial de consultas.
    const deferredLoadId = window.setTimeout(() => {
      if (cancelled) return

      void Promise.allSettled([
        loadSeguimientosCount(),
        loadHorariosCount(),
        loadCitacionesProximas(),
      ])
    }, 250)

    return () => {
      cancelled = true
      window.clearTimeout(deferredLoadId)
    }
    // Motivo: mantener secuencia de carga controlada sin re-ejecutar por funciones recreadas.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userId, loadMensajesSinLeer, loadAsistenciaStats, loadNotasStats, loadPermisosStats])

  const loadEventos = async () => {
    if (!userId) {
      setEventos([])
      setLoadingEventos(false)
      return
    }

    const cachedEventos = getFreshCache(dashboardCache.eventosByUser, userId)
    if (cachedEventos) {
      setEventos(cachedEventos)
      setLoadingEventos(false)
      return
    }

    setLoadingEventos(true)

    try {
      const hoy = new Date()
      const unaSemana = new Date()
      unaSemana.setDate(hoy.getDate() + 7)

      const { data, error } = await withRetry(async () => withTimeout(supabase
        .from('eventos')
        .select('id, titulo, fecha_inicio, lugar, tipo')
        .gte('fecha_inicio', hoy.toISOString())
        .lte('fecha_inicio', unaSemana.toISOString())
        .order('fecha_inicio', { ascending: true })
        .limit(5), 15000, 'Tiempo de espera agotado al cargar eventos del dashboard'))

      if (error) throw error
      const resolvedData = data || []
      setEventos(resolvedData)
      setCache(dashboardCache.eventosByUser, userId, resolvedData)
    } catch (error) {
      console.error('Error cargando eventos:', error)
    } finally {
      setLoadingEventos(false)
    }
  }

  const loadAnuncios = async () => {
    if (!userId) {
      setAnuncios([])
      setLoadingAnuncios(false)
      return
    }

    const cachedAnuncios = getFreshCache(dashboardCache.anunciosByUser, userId)
    if (cachedAnuncios) {
      setAnuncios(cachedAnuncios)
      setLoadingAnuncios(false)
      return
    }

    setLoadingAnuncios(true)

    try {
      const { data, error } = await withRetry(async () => withTimeout(supabase
        .from('anuncios')
        .select('id, titulo, contenido, fecha_publicacion, importante')
        .order('fecha_publicacion', { ascending: false })
        .limit(3), 15000, 'Tiempo de espera agotado al cargar anuncios del dashboard'))

      if (error) throw error
      const resolvedData = data || []
      setAnuncios(resolvedData)
      setCache(dashboardCache.anunciosByUser, userId, resolvedData)
    } catch (error) {
      console.error('Error cargando anuncios:', error)
    } finally {
      setLoadingAnuncios(false)
    }
  }

  const loadSeguimientosCount = async () => {
    if (!userId) {
      setSeguimientosCount(0)
      setLoadingSeguimientosCount(false)
      return
    }
    const isDocente = profile?.rol === 'docente'
    const cacheKeyS = isDocente ? (profile?.id || '') : userId
    const cachedCountS = getFreshCache(dashboardCache.seguimientosByUser, cacheKeyS)
    if (cachedCountS !== null) {
      setSeguimientosCount(cachedCountS)
      setLoadingSeguimientosCount(false)
      return
    }

    setLoadingSeguimientosCount(true)

    try {
      const { count, error } = await withTimeout(supabase
        .from('seguimientos')
        .select('id', { count: 'exact', head: true }), 8000, 'Tiempo de espera agotado al cargar seguimiento')

      if (error) throw error
      const resolvedCount = count ?? 0
      setSeguimientosCount(resolvedCount)
      setCache(dashboardCache.seguimientosByUser, cacheKeyS, resolvedCount)
    } catch (error) {
      console.error('Error cargando seguimiento:', error)
      setSeguimientosCount(0)
    } finally {
      setLoadingSeguimientosCount(false)
    }
  }

  const loadGruposRelacionadosParaHorarios = useCallback(async (): Promise<string[]> => {
    if (!profile?.id) return []

    if (profile.rol === 'estudiante') {
      const { data, error } = await withTimeout(
        supabase
          .from('estudiantes_grupos')
          .select('grupo_id')
          .eq('estudiante_id', profile.id)
          .eq('año_academico', 2026),
        8000,
        'Tiempo de espera agotado al cargar grupos del estudiante'
      )

      if (error) throw error

      return Array.from(new Set(((data || []) as GroupAssignment[]).map((item) => item.grupo_id)))
    }

    if (profile.rol === 'padre') {
      const { data: hijos, error: hijosError } = await withTimeout(
        supabase
          .from('padres_estudiantes')
          .select('estudiante_id')
          .eq('padre_id', profile.id),
        8000,
        'Tiempo de espera agotado al cargar hijos del acudiente'
      )

      if (hijosError) throw hijosError

      const hijosIds = Array.from(new Set(((hijos || []) as TeacherStudent[]).map((item) => item.estudiante_id)))
      if (hijosIds.length === 0) return []

      const { data: grupos, error: gruposError } = await withTimeout(
        supabase
          .from('estudiantes_grupos')
          .select('grupo_id')
          .in('estudiante_id', hijosIds)
          .eq('año_academico', 2026),
        8000,
        'Tiempo de espera agotado al cargar grupos de los hijos'
      )

      if (gruposError) throw gruposError

      return Array.from(new Set(((grupos || []) as GroupAssignment[]).map((item) => item.grupo_id)))
    }

    return []
  }, [profile?.id, profile?.rol])

  const loadHorariosCount = async () => {
    if (!userId) {
      setHorariosCount(0)
      setLoadingHorariosCount(false)
      return
    }

    const isDocente = profile?.rol === 'docente'
    const isStudentOrParent = profile?.rol === 'estudiante' || profile?.rol === 'padre'
    const cacheKeyH = isDocente ? (profile?.id || '') : userId
    const cachedCountH = getFreshCache(dashboardCache.horariosByUser, cacheKeyH)
    if (cachedCountH !== null) {
      setHorariosCount(cachedCountH)
      setLoadingHorariosCount(false)
      return
    }

    setLoadingHorariosCount(true)

    try {
      let query = supabase
        .from('horarios')
        .select('id', { count: 'exact', head: true })

      if (isStudentOrParent) {
        const gruposRelacionados = await loadGruposRelacionadosParaHorarios()
        if (gruposRelacionados.length === 0) {
          setHorariosCount(0)
          setCache(dashboardCache.horariosByUser, cacheKeyH, 0)
          return
        }

        query = query.in('grupo_id', gruposRelacionados)
      } else if (isDocente && profile?.id) {
        query = query.eq('docente_id', profile.id)
      }

      const { count, error } = await withTimeout(query, 8000, 'Tiempo de espera agotado al cargar horarios')
      if (error) throw error
      const resolvedCount = count ?? 0
      setHorariosCount(resolvedCount)
      setCache(dashboardCache.horariosByUser, cacheKeyH, resolvedCount)
    } catch (error) {
      console.error('Error cargando horarios:', error)
      setHorariosCount(0)
    } finally {
      setLoadingHorariosCount(false)
    }
  }

  const loadCitacionesProximas = async () => {
    if (!userId) {
      setCitacionesProximas(0)
      setLoadingCitaciones(false)
      return
    }

    const isDocente = profile?.rol === 'docente'
    const cacheKeyC = isDocente ? (profile?.id || '') : userId
    const cachedCountC = getFreshCache(dashboardCache.citacionesByUser, cacheKeyC)
    if (cachedCountC !== null) {
      setCitacionesProximas(cachedCountC)
      setLoadingCitaciones(false)
      return
    }

    setLoadingCitaciones(true)

    try {
      const { count, error } = await withTimeout(supabase
        .from('citaciones')
        .select('id', { count: 'exact', head: true })
        .gte('fecha_citacion', new Date().toISOString()), 8000, 'Tiempo de espera agotado al cargar citaciones')

      if (error) throw error
      const resolvedCount = count ?? 0
      setCitacionesProximas(resolvedCount)
      setCache(dashboardCache.citacionesByUser, cacheKeyC, resolvedCount)
    } catch (error) {
      console.error('Error cargando citaciones próximas:', error)
      setCitacionesProximas(0)
    } finally {
      setLoadingCitaciones(false)
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

  const handleRefreshDashboard = async () => {
    setRefreshing(true)

    clearDashboardCache(userId, profileId)

    await Promise.allSettled([
      loadEventos(),
      loadAnuncios(),
      loadMensajesSinLeer(),
      loadSeguimientosCount(),
      loadHorariosCount(),
      loadCitacionesProximas(),
    ])

  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between gap-3">
        <div>
          <h1 className="text-3xl font-bold text-foreground">
            ¡Bienvenido, {profile?.nombre_completo}!
          </h1>
          <p className="text-muted-foreground mt-1">
            Aquí encontrarás un resumen de tu actividad académica
          </p>
        </div>
        <Button
          type="button"
          variant="outline"
          onClick={() => {
            void handleRefreshDashboard()
          }}
          disabled={refreshing}
          className="shrink-0"
        >
          <RefreshCw className={`mr-2 h-4 w-4 ${refreshing ? 'animate-spin' : ''}`} />
          {refreshing ? 'Actualizando...' : 'Actualizar'}
        </Button>
      </div>

      {/* Stats Grid */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4 xl:grid-cols-7">
        {/* Asistencia */}
        <Card
          className="cursor-pointer hover:bg-muted/40 transition-colors"
          onClick={() => navigate('/dashboard/asistencia')}
          onKeyDown={(event) => {
            if (event.key === 'Enter' || event.key === ' ') {
              event.preventDefault()
              navigate('/dashboard/asistencia')
            }
          }}
          role="button"
          tabIndex={0}
        >
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Asistencia</CardTitle>
            <CheckCircle className="h-4 w-4 text-green-600" />
          </CardHeader>
          <CardContent>
            {loadingAsistencia ? (
              <div className="text-2xl font-bold">...</div>
            ) : (
              <div className="flex flex-col gap-1">
                <span className="text-xs text-muted-foreground">Presentes: <span className="font-bold text-green-700">{asistenciaStats.presentes}</span></span>
                <span className="text-xs text-muted-foreground">Ausentes: <span className="font-bold text-destructive">{asistenciaStats.ausentes}</span></span>
                <span className="text-xs text-muted-foreground">Tarde: <span className="font-bold text-yellow-600">{asistenciaStats.tarde}</span></span>
                <span className="text-xs text-muted-foreground">Excusas: <span className="font-bold text-blue-700">{asistenciaStats.excusas}</span></span>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Notas Parciales */}
        <Card
          className="cursor-pointer hover:bg-muted/40 transition-colors"
          onClick={() => navigate('/dashboard/notas')}
          onKeyDown={(event) => {
            if (event.key === 'Enter' || event.key === ' ') {
              event.preventDefault()
              navigate('/dashboard/notas')
            }
          }}
          role="button"
          tabIndex={0}
        >
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Notas parciales</CardTitle>
            <FileText className="h-4 w-4 text-indigo-600" />
          </CardHeader>
          <CardContent>
            {loadingNotas ? (
              <div className="text-2xl font-bold">...</div>
            ) : (
              <div className="flex flex-col gap-1">
                <span className="text-xs text-muted-foreground">Total: <span className="font-bold">{notasStats.total}</span></span>
                <span className="text-xs text-muted-foreground">Promedio: <span className="font-bold text-primary">{notasStats.promedio}</span></span>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Permisos y excusas */}
        <Card
          className="cursor-pointer hover:bg-muted/40 transition-colors"
          onClick={() => navigate('/dashboard/permisos')}
          onKeyDown={(event) => {
            if (event.key === 'Enter' || event.key === ' ') {
              event.preventDefault()
              navigate('/dashboard/permisos')
            }
          }}
          role="button"
          tabIndex={0}
        >
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Permisos y excusas</CardTitle>
            <Clock className="h-4 w-4 text-orange-600" />
          </CardHeader>
          <CardContent>
            {loadingPermisos ? (
              <div className="text-2xl font-bold">...</div>
            ) : (
              <div className="flex flex-col gap-1">
                <span className="text-xs text-muted-foreground">Pendientes: <span className="font-bold text-yellow-700">{permisosStats.pendiente}</span></span>
                <span className="text-xs text-muted-foreground">Aprobados: <span className="font-bold text-green-700">{permisosStats.aprobado}</span></span>
                <span className="text-xs text-muted-foreground">Rechazados: <span className="font-bold text-destructive">{permisosStats.rechazado}</span></span>
              </div>
            )}
          </CardContent>
        </Card>
        <Card
          className="cursor-pointer hover:bg-muted/40 transition-colors"
          onClick={() => navigate('/dashboard/seguimiento')}
          onKeyDown={(event) => {
            if (event.key === 'Enter' || event.key === ' ') {
              event.preventDefault()
              navigate('/dashboard/seguimiento')
            }
          }}
          role="button"
          tabIndex={0}
        >
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Seguimiento
            </CardTitle>
            <UserSearch className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {loadingSeguimientosCount ? '...' : seguimientosCount}
            </div>
            <p className="text-xs text-muted-foreground">
              registros visibles
            </p>
          </CardContent>
        </Card>

        <Card
          className="cursor-pointer hover:bg-muted/40 transition-colors"
          onClick={() => navigate('/dashboard/horarios')}
          onKeyDown={(event) => {
            if (event.key === 'Enter' || event.key === ' ') {
              event.preventDefault()
              navigate('/dashboard/horarios')
            }
          }}
          role="button"
          tabIndex={0}
        >
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Horarios
            </CardTitle>
            <Clock className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {loadingHorariosCount ? '...' : horariosCount}
            </div>
            <p className="text-xs text-muted-foreground">
              bloques programados
            </p>
          </CardContent>
        </Card>

        <Card
          className="cursor-pointer hover:bg-muted/40 transition-colors"
          onClick={() => navigate('/dashboard/mensajes?tab=recibidos')}
          onKeyDown={(event) => {
            if (event.key === 'Enter' || event.key === ' ') {
              event.preventDefault()
              navigate('/dashboard/mensajes?tab=recibidos')
            }
          }}
          role="button"
          tabIndex={0}
        >
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Mensajes sin leer
            </CardTitle>
            <Mail className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {loadingMensajesSinLeer ? '...' : mensajesSinLeer}
            </div>
            <p className="text-xs text-muted-foreground">
              en tu bandeja de entrada
            </p>
          </CardContent>
        </Card>

        <Card
          className="cursor-pointer hover:bg-muted/40 transition-colors"
          onClick={() => navigate('/dashboard/citaciones')}
          onKeyDown={(event) => {
            if (event.key === 'Enter' || event.key === ' ') {
              event.preventDefault()
              navigate('/dashboard/citaciones')
            }
          }}
          role="button"
          tabIndex={0}
        >
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Citaciones
            </CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {loadingCitaciones ? '...' : citacionesProximas}
            </div>
            <p className="text-xs text-muted-foreground">
              próximas programadas
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Main Content Grid */}
      <div className="grid gap-6 md:grid-cols-2">
        {/* Calendario Semanal */}
        <Card
          className="cursor-pointer hover:bg-muted/40 transition-colors"
          onClick={() => navigate('/dashboard/calendario')}
          onKeyDown={(event) => {
            if (event.key === 'Enter' || event.key === ' ') {
              event.preventDefault()
              navigate('/dashboard/calendario')
            }
          }}
          role="button"
          tabIndex={0}
        >
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
                const eventStyles = {
                  'Reunión': {
                    container: 'bg-blue-50 border-blue-100',
                    badge: 'bg-blue-600 text-white',
                  },
                  'Evaluación': {
                    container: 'bg-purple-50 border-purple-100',
                    badge: 'bg-purple-600 text-white',
                  },
                  'Festivo': {
                    container: 'bg-green-50 border-green-100',
                    badge: 'bg-green-600 text-white',
                  },
                  'Cultural': {
                    container: 'bg-pink-50 border-pink-100',
                    badge: 'bg-pink-600 text-white',
                  },
                  'Académico': {
                    container: 'bg-indigo-50 border-indigo-100',
                    badge: 'bg-indigo-600 text-white',
                  },
                  default: {
                    container: 'bg-gray-50 border-gray-100',
                    badge: 'bg-gray-600 text-white',
                  },
                }
                const style = eventStyles[evento.tipo as keyof typeof eventStyles] || eventStyles.default

                return (
                  <div key={evento.id} className={`flex items-start gap-3 p-3 rounded-lg border ${style.container}`}>
                    <div className={`flex-shrink-0 w-12 h-12 rounded-lg flex flex-col items-center justify-center ${style.badge}`}>
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
        <Card
          className="cursor-pointer hover:bg-muted/40 transition-colors"
          onClick={() => navigate('/dashboard/anuncios')}
          onKeyDown={(event) => {
            if (event.key === 'Enter' || event.key === ' ') {
              event.preventDefault()
              navigate('/dashboard/anuncios')
            }
          }}
          role="button"
          tabIndex={0}
        >
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
