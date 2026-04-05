import { useCallback, useEffect, useMemo, useState } from 'react'
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
import { AlertCircle, CalendarClock, CheckCircle2, Loader2, Pencil, Trash2, X } from 'lucide-react'
import type { Database } from '@/types/database.types'
import { sortByGradeAndGroupName } from '@/utils/grade-order'

interface Horario {
    id: string
    grupo_id: string
    asignatura_id: string
    docente_id: string | null
    dia_semana: number
    hora_inicio: string
    hora_fin: string
    aula: string | null
    año_academico: number
    created_at: string
    asignatura: {
        nombre: string
    }
    grupo: {
        nombre: string
        grado: {
            nombre: string
        }
    }
    docente?: {
        nombre_completo: string
    }
}

interface GrupoOption {
    id: string
    nombre: string
    grado: string
}

interface DocenteOption {
    id: string
    nombre_completo: string
}

interface AsignacionGrupoOption {
    asignatura_id: string
    docente_id: string | null
}

const DIAS = [
    { value: 1, label: 'Día 1' },
    { value: 2, label: 'Día 2' },
    { value: 3, label: 'Día 3' },
    { value: 4, label: 'Día 4' },
    { value: 5, label: 'Día 5' },
]

export default function HorariosPage() {
    const { profile } = useAuthStore()
    const [horarios, setHorarios] = useState<Horario[]>([])
    const [loading, setLoading] = useState(false)
    const [saving, setSaving] = useState(false)
    const [error, setError] = useState<string | null>(null)
    const [success, setSuccess] = useState<string | null>(null)

    const [grupos, setGrupos] = useState<GrupoOption[]>([])
    const [selectedGrupo, setSelectedGrupo] = useState('')
    const [docentes, setDocentes] = useState<DocenteOption[]>([])
    const [docenteId, setDocenteId] = useState('')
    const [asignacionesGrupo, setAsignacionesGrupo] = useState<AsignacionGrupoOption[]>([])
    const [editAsignacionesGrupo, setEditAsignacionesGrupo] = useState<AsignacionGrupoOption[]>([])
    const [loadingEditAsignaciones, setLoadingEditAsignaciones] = useState(false)

    const [diaSemana, setDiaSemana] = useState(1)
    const [horaInicio, setHoraInicio] = useState('')
    const [horaFin, setHoraFin] = useState('')
    const [aula, setAula] = useState('')
    const [asignaturaId, setAsignaturaId] = useState('')
    const [asignaturas, setAsignaturas] = useState<Array<{ id: string; nombre: string }>>([])

    const [editingHorarioId, setEditingHorarioId] = useState<string | null>(null)
    const [updatingHorarioId, setUpdatingHorarioId] = useState<string | null>(null)
    const [deletingHorarioId, setDeletingHorarioId] = useState<string | null>(null)
    const [editGrupoId, setEditGrupoId] = useState('')
    const [editAsignaturaId, setEditAsignaturaId] = useState('')
    const [editDocenteId, setEditDocenteId] = useState('')
    const [editDiaSemana, setEditDiaSemana] = useState(1)
    const [editHoraInicio, setEditHoraInicio] = useState('')
    const [editHoraFin, setEditHoraFin] = useState('')
    const [editAula, setEditAula] = useState('')

    const canManageHorarios = profile?.rol === 'administrador' || profile?.rol === 'administrativo'

    const loadAsignacionesGrupo = useCallback(async (grupoId: string) => {
        if (!grupoId || !profile) return []

        try {
            let query = supabase
                .from('asignaciones_docentes')
                .select('asignatura_id, docente_id')
                .eq('grupo_id', grupoId)
                .eq('año_academico', 2026)

            if (profile.rol === 'docente') {
                query = query.eq('docente_id', profile.id)
            }

            const { data, error } = await query

            if (error) throw error

            return (data || []) as AsignacionGrupoOption[]
        } catch (err) {
            console.error('Error loading asignaciones del grupo:', err)
            setError('Error al cargar asignaturas y docentes del grupo')
            return []
        }
    }, [profile])

    useEffect(() => {
        if (profile) {
            loadGrupos()
            loadAsignaturas()
            loadDocentes()
        }
    }, [profile])

    useEffect(() => {
        if (profile && selectedGrupo) {
            loadHorarios()
        }
        // Motivo: loadHorarios depende de selectedGrupo y profile; omitimos otras dependencias intencionalmente.
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [profile, selectedGrupo])

    useEffect(() => {
        if (profile && selectedGrupo) {
            loadAsignacionesGrupo(selectedGrupo)
                .then((asignaciones) => setAsignacionesGrupo(asignaciones))
            return
        }

        setAsignacionesGrupo([])
    }, [profile, selectedGrupo, loadAsignacionesGrupo])

    useEffect(() => {
        if (profile && editingHorarioId && editGrupoId) {
            setLoadingEditAsignaciones(true)
            loadAsignacionesGrupo(editGrupoId)
                .then((asignaciones) => setEditAsignacionesGrupo(asignaciones))
                .finally(() => setLoadingEditAsignaciones(false))
            return
        }

        setLoadingEditAsignaciones(false)
        setEditAsignacionesGrupo([])
    }, [profile, editingHorarioId, editGrupoId, loadAsignacionesGrupo])

    const loadGrupos = async () => {
        try {
            const { data, error } = await supabase
                .from('grupos')
                .select('id, nombre, grado:grado_id (nombre)')
                .eq('año_academico', 2026)
                .order('nombre', { ascending: true })

            if (error) throw error

            const items = (data || []) as Array<{ id: string; nombre: string; grado?: { nombre: string } }>
            const mapped = items.map((item) => ({
                id: item.id,
                nombre: item.nombre,
                grado: item.grado?.nombre || 'Sin grado',
            }))

            const gruposOrdenados = sortByGradeAndGroupName(
                mapped,
                (grupo) => grupo.grado,
                (grupo) => grupo.nombre
            )

            setGrupos(gruposOrdenados)
            if (gruposOrdenados.length > 0) {
                setSelectedGrupo(gruposOrdenados[0].id)
            }
        } catch (err) {
            console.error('Error loading grupos:', err)
            setError('Error al cargar los grupos')
        }
    }

    const loadAsignaturas = async () => {
        try {
            const { data, error } = await supabase
                .from('asignaturas')
                .select('id, nombre')
                .order('nombre', { ascending: true })

            if (error) throw error

            setAsignaturas((data || []) as Array<{ id: string; nombre: string }>)
        } catch (err) {
            console.error('Error loading asignaturas:', err)
        }
    }

    const loadDocentes = async () => {
        try {
            const { data, error } = await supabase
                .from('profiles')
                .select('id, nombre_completo')
                .eq('rol', 'docente')
                .eq('activo', true)
                .order('nombre_completo', { ascending: true })

            if (error) throw error

            setDocentes((data || []) as DocenteOption[])
        } catch (err) {
            console.error('Error loading docentes:', err)
        }
    }

    const loadHorarios = async () => {
        if (!selectedGrupo) return

        setLoading(true)
        setError(null)

        try {
            let query = supabase
                .from('horarios')
                .select(`
          *,
          asignatura:asignatura_id (nombre),
          grupo:grupo_id (nombre, grado:grado_id (nombre)),
          docente:docente_id (nombre_completo)
        `)
                .eq('grupo_id', selectedGrupo)
                .order('dia_semana', { ascending: true })
                .order('hora_inicio', { ascending: true })

            if (profile?.rol === 'docente') {
                query = query.eq('docente_id', profile.id)
            }

            const { data, error } = await query
            if (error) throw error

            setHorarios((data || []) as Horario[])
        } catch (err) {
            console.error('Error loading horarios:', err)
            setError('Error al cargar el horario')
        } finally {
            setLoading(false)
        }
    }

    const handleCreateHorario = async () => {
        if (!profile || !canManageHorarios) {
            setError('No tienes permisos para editar horarios')
            return
        }

        if (!selectedGrupo || !asignaturaId || !horaInicio || !horaFin) {
            setError('Completa grupo, asignatura y horario')
            return
        }

        if (profile.rol !== 'docente' && !docenteId) {
            setError('Selecciona el docente para este horario')
            return
        }

        setSaving(true)
        setError(null)
        setSuccess(null)

        try {
            const payload = {
                grupo_id: selectedGrupo,
                asignatura_id: asignaturaId,
                docente_id: profile.rol === 'docente' ? profile.id : docenteId,
                dia_semana: diaSemana,
                hora_inicio: horaInicio,
                hora_fin: horaFin,
                aula: aula.trim() ? aula.trim() : null,
                año_academico: 2026,
            } satisfies Database['public']['Tables']['horarios']['Insert']

            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            const { error } = await (supabase as any)
                .from('horarios')
                .insert(payload)

            if (error) throw error

            setDiaSemana(1)
            setHoraInicio('')
            setHoraFin('')
            setAula('')
            setAsignaturaId('')
            setDocenteId('')
            setSuccess('Horario registrado')
            await loadHorarios()
        } catch (err) {
            console.error('Error creating horario:', err)
            setError('Error al registrar el horario')
        } finally {
            setSaving(false)
        }
    }

    const startEditHorario = (item: Horario) => {
        setEditingHorarioId(item.id)
        setEditGrupoId(item.grupo_id)
        setEditAsignaturaId(item.asignatura_id)
        setEditDocenteId(item.docente_id ?? '')
        setEditDiaSemana(item.dia_semana)
        setEditHoraInicio(item.hora_inicio)
        setEditHoraFin(item.hora_fin)
        setEditAula(item.aula ?? '')
    }

    const cancelEditHorario = () => {
        setEditingHorarioId(null)
    }

    const handleUpdateHorario = async (itemId: string) => {
        if (!profile || !canManageHorarios) {
            setError('No tienes permisos para eliminar horarios')
            return
        }

        if (!editGrupoId) {
            setError('Selecciona el grupo para este horario')
            return
        }

        if (!editAsignaturaId || !editHoraInicio || !editHoraFin) {
            setError('Completa asignatura y horario')
            return
        }

        if (profile.rol !== 'docente' && !editDocenteId) {
            setError('Selecciona el docente para este horario')
            return
        }

        setUpdatingHorarioId(itemId)
        setError(null)
        setSuccess(null)

        try {
            const payload = {
                grupo_id: editGrupoId,
                asignatura_id: editAsignaturaId,
                docente_id: profile.rol === 'docente' ? profile.id : editDocenteId,
                dia_semana: editDiaSemana,
                hora_inicio: editHoraInicio,
                hora_fin: editHoraFin,
                aula: editAula.trim() ? editAula.trim() : null,
            } satisfies Database['public']['Tables']['horarios']['Update']

            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            const { error } = await (supabase as any)
                .from('horarios')
                .update(payload)
                .eq('id', itemId)

            if (error) throw error

            setSuccess('Horario actualizado')
            setEditingHorarioId(null)
            await loadHorarios()
        } catch (err) {
            console.error('Error updating horario:', err)
            setError('Error al actualizar el horario')
        } finally {
            setUpdatingHorarioId(null)
        }
    }

    const handleDeleteHorario = async (itemId: string) => {
        if (!window.confirm('¿Eliminar este horario?')) return

        if (!selectedGrupo) {
            setError('Selecciona un grupo')
            return
        }

        setDeletingHorarioId(itemId)
        setError(null)
        setSuccess(null)

        try {
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            const { error } = await (supabase as any)
                .from('horarios')
                .delete()
                .eq('id', itemId)
                .eq('grupo_id', selectedGrupo)

            if (error) throw error

            setSuccess('Horario eliminado')
            await loadHorarios()
        } catch (err) {
            console.error('Error deleting horario:', err)
            setError('Error al eliminar el horario')
        } finally {
            setDeletingHorarioId(null)
        }
    }

    const headerDescription = useMemo(() => {
        if (profile?.rol === 'estudiante') return 'Consulta tu horario de clases'
        if (profile?.rol === 'padre') return 'Revisa el horario de tus hijos'
        if (profile?.rol === 'docente') return 'Gestiona tus horarios de clase'
        return 'Gestión de horarios académicos'
    }, [profile?.rol])

    const dayLabel = (dia: number) => DIAS.find((d) => d.value === dia)?.label || 'Día'

    const asignaturasDisponiblesRegistro = useMemo(() => {
        if (!selectedGrupo) return []

        const asignaturasPermitidas = new Set(asignacionesGrupo.map((asignacion) => asignacion.asignatura_id))
        return asignaturas.filter((asignatura) => asignaturasPermitidas.has(asignatura.id))
    }, [asignacionesGrupo, asignaturas, selectedGrupo])

    const docentesDisponiblesRegistro = useMemo(() => {
        if (!selectedGrupo) return []

        const asignacionesFiltradas = asignaturaId
            ? asignacionesGrupo.filter((asignacion) => asignacion.asignatura_id === asignaturaId)
            : asignacionesGrupo

        const docentesPermitidos = new Set(
            asignacionesFiltradas
                .map((asignacion) => asignacion.docente_id)
                .filter((docente): docente is string => Boolean(docente))
        )

        return docentes.filter((docente) => docentesPermitidos.has(docente.id))
    }, [asignaturaId, asignacionesGrupo, docentes, selectedGrupo])

    const asignaturasDisponiblesEdicion = useMemo(() => {
        if (!editGrupoId) return []

        const asignaturasPermitidas = new Set(editAsignacionesGrupo.map((asignacion) => asignacion.asignatura_id))
        return asignaturas.filter((asignatura) => asignaturasPermitidas.has(asignatura.id))
    }, [asignaturas, editAsignacionesGrupo, editGrupoId])

    const asignaturasDisponiblesEdicionConSeleccion = useMemo(() => {
        if (!editAsignaturaId) return asignaturasDisponiblesEdicion

        if (asignaturasDisponiblesEdicion.some((asignatura) => asignatura.id === editAsignaturaId)) {
            return asignaturasDisponiblesEdicion
        }

        const asignaturaActual = asignaturas.find((asignatura) => asignatura.id === editAsignaturaId)
        if (!asignaturaActual) return asignaturasDisponiblesEdicion

        return [asignaturaActual, ...asignaturasDisponiblesEdicion]
    }, [asignaturas, asignaturasDisponiblesEdicion, editAsignaturaId])

    const docentesDisponiblesEdicion = useMemo(() => {
        if (!editGrupoId) return []

        const asignacionesFiltradas = editAsignaturaId
            ? editAsignacionesGrupo.filter((asignacion) => asignacion.asignatura_id === editAsignaturaId)
            : editAsignacionesGrupo

        const docentesPermitidos = new Set(
            asignacionesFiltradas
                .map((asignacion) => asignacion.docente_id)
                .filter((docente): docente is string => Boolean(docente))
        )

        return docentes.filter((docente) => docentesPermitidos.has(docente.id))
    }, [docentes, editAsignaturaId, editAsignacionesGrupo, editGrupoId])

    const docentesDisponiblesEdicionConSeleccion = useMemo(() => {
        if (!editDocenteId) return docentesDisponiblesEdicion

        if (docentesDisponiblesEdicion.some((docente) => docente.id === editDocenteId)) {
            return docentesDisponiblesEdicion
        }

        const docenteActual = docentes.find((docente) => docente.id === editDocenteId)
        if (!docenteActual) return docentesDisponiblesEdicion

        return [docenteActual, ...docentesDisponiblesEdicion]
    }, [docentes, docentesDisponiblesEdicion, editDocenteId])

    useEffect(() => {
        if (asignaturaId && !asignaturasDisponiblesRegistro.some((asignatura) => asignatura.id === asignaturaId)) {
            setAsignaturaId('')
        }
    }, [asignaturaId, asignaturasDisponiblesRegistro])

    useEffect(() => {
        if (profile?.rol === 'docente') return

        if (docenteId && !docentesDisponiblesRegistro.some((docente) => docente.id === docenteId)) {
            setDocenteId('')
        }
    }, [docenteId, docentesDisponiblesRegistro, profile?.rol])

    useEffect(() => {
        if (!editingHorarioId) return
        if (loadingEditAsignaciones) return

        if (editAsignaturaId && !asignaturasDisponiblesEdicionConSeleccion.some((asignatura) => asignatura.id === editAsignaturaId)) {
            setEditAsignaturaId('')
        }
    }, [asignaturasDisponiblesEdicionConSeleccion, editAsignaturaId, editingHorarioId, loadingEditAsignaciones])

    useEffect(() => {
        if (profile?.rol === 'docente') return
        if (!editingHorarioId) return
        if (loadingEditAsignaciones) return

        if (editDocenteId && !docentesDisponiblesEdicionConSeleccion.some((docente) => docente.id === editDocenteId)) {
            setEditDocenteId('')
        }
    }, [docentesDisponiblesEdicionConSeleccion, editDocenteId, editingHorarioId, loadingEditAsignaciones, profile?.rol])

    return (
        <div className="space-y-6">
            <div>
                <h1 className="text-3xl font-bold text-foreground">Horarios</h1>
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
                            <Label>Grupo</Label>
                            <Select value={selectedGrupo} onValueChange={setSelectedGrupo}>
                                <SelectTrigger>
                                    <SelectValue placeholder="Selecciona un grupo" />
                                </SelectTrigger>
                                <SelectContent>
                                    {grupos.map((grupo) => (
                                        <SelectItem key={grupo.id} value={grupo.id}>
                                            {grupo.grado} - {grupo.nombre}
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>
                    </div>
                </CardContent>
            </Card>

            {canManageHorarios && (
                <Card>
                    <CardHeader>
                        <CardTitle>Registrar horario</CardTitle>
                        <CardDescription>Agrega bloques de clase al horario</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <div className="grid gap-4 md:grid-cols-2">
                            <div className="space-y-2">
                                <Label>Asignatura</Label>
                                <Select value={asignaturaId} onValueChange={setAsignaturaId}>
                                    <SelectTrigger>
                                        <SelectValue placeholder="Selecciona asignatura" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {asignaturasDisponiblesRegistro.map((asignatura) => (
                                            <SelectItem key={asignatura.id} value={asignatura.id}>
                                                {asignatura.nombre}
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>
                            <div className="space-y-2">
                                <Label>Día</Label>
                                <Select value={String(diaSemana)} onValueChange={(value) => setDiaSemana(Number(value))}>
                                    <SelectTrigger>
                                        <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {DIAS.map((dia) => (
                                            <SelectItem key={dia.value} value={String(dia.value)}>
                                                {dia.label}
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>
                        </div>

                        {profile?.rol !== 'docente' && (
                            <div className="space-y-2">
                                <Label>Docente</Label>
                                <Select value={docenteId} onValueChange={setDocenteId}>
                                    <SelectTrigger>
                                        <SelectValue placeholder="Selecciona docente" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {docentesDisponiblesRegistro.map((docente) => (
                                            <SelectItem key={docente.id} value={docente.id}>
                                                {docente.nombre_completo}
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>
                        )}

                        <div className="grid gap-4 md:grid-cols-3">
                            <div className="space-y-2">
                                <Label>Hora inicio</Label>
                                <Input type="time" value={horaInicio} onChange={(e) => setHoraInicio(e.target.value)} />
                            </div>
                            <div className="space-y-2">
                                <Label>Hora fin</Label>
                                <Input type="time" value={horaFin} onChange={(e) => setHoraFin(e.target.value)} />
                            </div>
                            <div className="space-y-2">
                                <Label>Aula</Label>
                                <Input value={aula} onChange={(e) => setAula(e.target.value)} />
                            </div>
                        </div>

                        <Button onClick={handleCreateHorario} disabled={saving}>
                            {saving ? (
                                <>
                                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                    Guardando...
                                </>
                            ) : (
                                'Registrar horario'
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

            {!loading && horarios.length === 0 && (
                <Alert>
                    <CalendarClock className="h-4 w-4" />
                    <AlertDescription>No hay horarios registrados para este grupo.</AlertDescription>
                </Alert>
            )}

            {!loading && horarios.length > 0 && (
                <div className="space-y-4">
                    {horarios.map((item) => (
                        <Card key={item.id}>
                            <CardHeader>
                                <div className="flex items-start justify-between gap-3">
                                    <CardTitle className="flex items-center gap-2">
                                        <CalendarClock className="h-4 w-4 text-primary" />
                                        {item.asignatura?.nombre}
                                    </CardTitle>
                                    {canManageHorarios && (
                                        <div className="flex gap-2">
                                            <Button
                                                variant="outline"
                                                size="icon"
                                                onClick={() => startEditHorario(item)}
                                                title="Editar horario"
                                            >
                                                <Pencil className="h-4 w-4" />
                                            </Button>
                                            <Button
                                                variant="destructive"
                                                size="icon"
                                                onClick={() => handleDeleteHorario(item.id)}
                                                disabled={deletingHorarioId === item.id}
                                                title="Eliminar horario"
                                            >
                                                {deletingHorarioId === item.id ? (
                                                    <Loader2 className="h-4 w-4 animate-spin" />
                                                ) : (
                                                    <Trash2 className="h-4 w-4" />
                                                )}
                                            </Button>
                                        </div>
                                    )}
                                </div>
                                <CardDescription>
                                    {dayLabel(item.dia_semana)} • {item.hora_inicio} - {item.hora_fin}
                                </CardDescription>
                            </CardHeader>
                            <CardContent className="space-y-2">
                                <p className="text-sm text-foreground">
                                    {item.grupo.grado.nombre} - Grupo {item.grupo.nombre}
                                </p>
                                {item.docente?.nombre_completo && (
                                    <p className="text-xs text-muted-foreground">Docente: {item.docente.nombre_completo}</p>
                                )}
                                {item.aula && (
                                    <p className="text-xs text-muted-foreground">Aula: {item.aula}</p>
                                )}

                                {editingHorarioId === item.id && (
                                    <div className="mt-4 space-y-4 border-t pt-4">
                                        <div className="grid gap-4 md:grid-cols-3">
                                            <div className="space-y-2">
                                                <Label>Grupo</Label>
                                                <Select value={editGrupoId} onValueChange={setEditGrupoId}>
                                                    <SelectTrigger>
                                                        <SelectValue placeholder="Selecciona grupo" />
                                                    </SelectTrigger>
                                                    <SelectContent>
                                                        {grupos.map((grupo) => (
                                                            <SelectItem key={grupo.id} value={grupo.id}>
                                                                {grupo.grado} - {grupo.nombre}
                                                            </SelectItem>
                                                        ))}
                                                    </SelectContent>
                                                </Select>
                                            </div>
                                            <div className="space-y-2">
                                                <Label>Asignatura</Label>
                                                <Select value={editAsignaturaId} onValueChange={setEditAsignaturaId}>
                                                    <SelectTrigger>
                                                        <SelectValue placeholder="Selecciona asignatura" />
                                                    </SelectTrigger>
                                                    <SelectContent>
                                                        {asignaturasDisponiblesEdicionConSeleccion.map((asignatura) => (
                                                            <SelectItem key={asignatura.id} value={asignatura.id}>
                                                                {asignatura.nombre}
                                                            </SelectItem>
                                                        ))}
                                                    </SelectContent>
                                                </Select>
                                            </div>
                                            <div className="space-y-2">
                                                <Label>Día</Label>
                                                <Select value={String(editDiaSemana)} onValueChange={(value) => setEditDiaSemana(Number(value))}>
                                                    <SelectTrigger>
                                                        <SelectValue />
                                                    </SelectTrigger>
                                                    <SelectContent>
                                                        {DIAS.map((dia) => (
                                                            <SelectItem key={dia.value} value={String(dia.value)}>
                                                                {dia.label}
                                                            </SelectItem>
                                                        ))}
                                                    </SelectContent>
                                                </Select>
                                            </div>
                                        </div>

                                        {profile?.rol !== 'docente' && (
                                            <div className="space-y-2">
                                                <Label>Docente</Label>
                                                <Select value={editDocenteId} onValueChange={setEditDocenteId}>
                                                    <SelectTrigger>
                                                        <SelectValue placeholder="Selecciona docente" />
                                                    </SelectTrigger>
                                                    <SelectContent>
                                                        {docentesDisponiblesEdicionConSeleccion.map((docente) => (
                                                            <SelectItem key={docente.id} value={docente.id}>
                                                                {docente.nombre_completo}
                                                            </SelectItem>
                                                        ))}
                                                    </SelectContent>
                                                </Select>
                                            </div>
                                        )}

                                        <div className="grid gap-4 md:grid-cols-3">
                                            <div className="space-y-2">
                                                <Label>Hora inicio</Label>
                                                <Input type="time" value={editHoraInicio} onChange={(e) => setEditHoraInicio(e.target.value)} />
                                            </div>
                                            <div className="space-y-2">
                                                <Label>Hora fin</Label>
                                                <Input type="time" value={editHoraFin} onChange={(e) => setEditHoraFin(e.target.value)} />
                                            </div>
                                            <div className="space-y-2">
                                                <Label>Aula</Label>
                                                <Input value={editAula} onChange={(e) => setEditAula(e.target.value)} />
                                            </div>
                                        </div>

                                        <div className="flex flex-wrap gap-2">
                                            <Button
                                                onClick={() => handleUpdateHorario(item.id)}
                                                disabled={updatingHorarioId === item.id}
                                            >
                                                {updatingHorarioId === item.id ? (
                                                    <>
                                                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                                        Guardando...
                                                    </>
                                                ) : (
                                                    'Guardar cambios'
                                                )}
                                            </Button>
                                            <Button variant="outline" onClick={cancelEditHorario}>
                                                <X className="mr-2 h-4 w-4" />
                                                Cancelar
                                            </Button>
                                        </div>
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
