import { useCallback, useEffect, useMemo, useState } from 'react'
import type { SupabaseClient } from '@supabase/supabase-js'
import { Loader2, Mail, KeyRound, RefreshCw, Trash2 } from 'lucide-react'
import { useAuthStore } from '@/lib/auth-store'
import { supabase } from '@/lib/supabase'
import {
    adminCreateUser,
    adminDeleteUser,
    adminResetPassword,
    adminUpdateEmail,
    type CreateUserPayload
} from '@/lib/admin-api'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Alert, AlertDescription } from '@/components/ui/alert'
import type { Database, UserRole } from '@/types/database.types'

type Profile = Database['public']['Tables']['profiles']['Row']
type Grado = Database['public']['Tables']['grados']['Row']
type Asignatura = Database['public']['Tables']['asignaturas']['Row']
type Grupo = Database['public']['Tables']['grupos']['Row']
type PadreEstudiante = Database['public']['Tables']['padres_estudiantes']['Row']

type TableWithRelationships<T> = T & { Relationships: [] }

type WritableDatabase = {
    public: {
        Tables: {
            [K in keyof Database['public']['Tables']]: TableWithRelationships<Database['public']['Tables'][K]>
        }
        Enums: Database['public']['Enums']
    }
}

type GroupRow = Grupo & {
    grado: { nombre: string } | null
    director_grupo: { nombre_completo: string } | null
}

type PadreEstudianteRow = PadreEstudiante & {
    padre: { id: string; nombre_completo: string; email: string } | null
    estudiante: { id: string; nombre_completo: string; email: string } | null
}

type Tab = 'usuarios' | 'grados' | 'asignaturas' | 'grupos'
type UserRoleFilter = 'todos' | UserRole

type Message = { type: 'success' | 'error'; text: string } | null

type UserModalState =
    | { kind: 'create' }
    | { kind: 'edit'; user: Profile }
    | { kind: 'reset-password'; user: Profile }
    | { kind: 'change-email'; user: Profile }
    | null

function useMessage(timeout: number) {
    const [msg, setMsg] = useState<Message>(null)

    const show = useCallback((type: 'success' | 'error', text: string) => {
        setMsg({ type, text })
        window.setTimeout(() => {
            setMsg((current) => (current?.text === text ? null : current))
        }, timeout)
    }, [timeout])

    return { msg, show }
}

function MsgBanner({ msg }: { msg: Message }) {
    if (!msg) return null

    return (
        <Alert variant={msg.type === 'error' ? 'destructive' : 'default'}>
            <AlertDescription>{msg.text}</AlertDescription>
        </Alert>
    )
}

const ROLE_OPTIONS: UserRole[] = ['administrador', 'administrativo', 'docente', 'estudiante', 'padre']

const TABS: Array<{ key: Tab; label: string }> = [
    { key: 'usuarios', label: 'Usuarios' },
    { key: 'grados', label: 'Grados' },
    { key: 'asignaturas', label: 'Asignaturas' },
    { key: 'grupos', label: 'Grupos' }
]

const dbClient = supabase as unknown as SupabaseClient<WritableDatabase>

export default function AdminPage() {
    const { profile } = useAuthStore()
    const [activeTab, setActiveTab] = useState<Tab>('usuarios')

    const usersMessage = useMessage(5000)
    const gradosMessage = useMessage(5000)
    const asignaturasMessage = useMessage(5000)
    const gruposMessage = useMessage(5000)

    const [usuarios, setUsuarios] = useState<Profile[]>([])
    const [userRoleFilter, setUserRoleFilter] = useState<UserRoleFilter>('todos')
    const [loadingUsuarios, setLoadingUsuarios] = useState(false)
    const [realtimeConnected, setRealtimeConnected] = useState(false)
    const [deletingUserId, setDeletingUserId] = useState<string | null>(null)
    const [togglingUserId, setTogglingUserId] = useState<string | null>(null)
    const [savingUser, setSavingUser] = useState(false)

    const [padresEstudiantes, setPadresEstudiantes] = useState<PadreEstudianteRow[]>([])
    const [loadingPadresEstudiantes, setLoadingPadresEstudiantes] = useState(false)
    const [savingPadreEstudiante, setSavingPadreEstudiante] = useState(false)
    const [deletingPadreEstudianteId, setDeletingPadreEstudianteId] = useState<string | null>(null)
    const [padreSeleccionadoId, setPadreSeleccionadoId] = useState('')
    const [estudiantePadreSeleccionadoId, setEstudiantePadreSeleccionadoId] = useState('')
    const [parentescoPadreEstudiante, setParentescoPadreEstudiante] = useState('Padre/Madre')
    const [principalPadreEstudiante, setPrincipalPadreEstudiante] = useState(false)

    const [userModal, setUserModal] = useState<UserModalState>(null)
    const [createForm, setCreateForm] = useState<CreateUserPayload>({
        email: '',
        password: '',
        nombre_completo: '',
        rol: 'estudiante',
        telefono: '',
        direccion: ''
    })
    const [editForm, setEditForm] = useState<{
        nombre_completo: string
        rol: UserRole
        telefono: string
        direccion: string
        activo: boolean
    }>({
        nombre_completo: '',
        rol: 'estudiante',
        telefono: '',
        direccion: '',
        activo: true
    })
    const [emailForm, setEmailForm] = useState('')
    const [passwordForm, setPasswordForm] = useState('')

    const [grados, setGrados] = useState<Grado[]>([])
    const [loadingGradosList, setLoadingGradosList] = useState(false)
    const [creatingGrado, setCreatingGrado] = useState(false)
    const [deletingGradoId, setDeletingGradoId] = useState<string | null>(null)
    const [newGrado, setNewGrado] = useState({ nombre: '', nivel: '' })

    const [asignaturas, setAsignaturas] = useState<Asignatura[]>([])
    const [loadingAsignaturasList, setLoadingAsignaturasList] = useState(false)
    const [creatingAsignatura, setCreatingAsignatura] = useState(false)
    const [deletingAsignaturaId, setDeletingAsignaturaId] = useState<string | null>(null)
    const [newAsignatura, setNewAsignatura] = useState({ nombre: '', codigo: '', descripcion: '' })
    const [asignaturaDocenteId, setAsignaturaDocenteId] = useState('')
    const [asignaturaGrupoIds, setAsignaturaGrupoIds] = useState<string[]>([])
    const [asignaturaAno, setAsignaturaAno] = useState(new Date().getFullYear())

    const [grupos, setGrupos] = useState<GroupRow[]>([])
    const [docentes, setDocentes] = useState<Profile[]>([])
    const [loadingGruposList, setLoadingGruposList] = useState(false)
    const [creatingGrupo, setCreatingGrupo] = useState(false)
    const [deletingGrupoId, setDeletingGrupoId] = useState<string | null>(null)
    const [newGrupo, setNewGrupo] = useState({
        grado_id: '',
        nombre: '',
        año_academico: new Date().getFullYear(),
        director_grupo_id: ''
    })

    const [estudiantes, setEstudiantes] = useState<Profile[]>([])
    const [selectedGrupoId, setSelectedGrupoId] = useState<string | null>(null)
    const [estudiantesEnGrupo, setEstudiantesEnGrupo] = useState<Profile[]>([])
    const [loadingEstudiantes, setLoadingEstudiantes] = useState(false)
    const [asignandoEstudiante, setAsignandoEstudiante] = useState(false)
    const [eliminandoEstudianteId, setEliminandoEstudianteId] = useState<string | null>(null)
    const [estudianteSeleccionado, setEstudianteSeleccionado] = useState('')

    const isAdmin = profile?.rol === 'administrador'

    const loadUsuarios = useCallback(async () => {
        try {
            setLoadingUsuarios(true)
            const { data, error } = await dbClient.from('profiles').select('*').order('nombre_completo')
            if (error) throw error
            setUsuarios(data ?? [])
        } catch (error) {
            usersMessage.show('error', error instanceof Error ? error.message : 'Error cargando usuarios')
        } finally {
            setLoadingUsuarios(false)
        }
    }, [usersMessage.show])

    const loadGrados = useCallback(async () => {
        try {
            setLoadingGradosList(true)
            const { data, error } = await dbClient.from('grados').select('*').order('nivel').order('nombre')
            if (error) throw error
            setGrados(data ?? [])
        } catch (error) {
            gradosMessage.show('error', error instanceof Error ? error.message : 'Error cargando grados')
        } finally {
            setLoadingGradosList(false)
        }
    }, [gradosMessage.show])

    const loadPadresEstudiantes = useCallback(async () => {
        try {
            setLoadingPadresEstudiantes(true)
            const { data, error } = await dbClient
                .from('padres_estudiantes')
                .select(
                    'id, padre_id, estudiante_id, parentesco, principal, created_at, padre:padre_id(id, nombre_completo, email), estudiante:estudiante_id(id, nombre_completo, email)'
                )
                .order('created_at', { ascending: false })

            if (error) throw error
            setPadresEstudiantes((data as PadreEstudianteRow[]) ?? [])
        } catch (error) {
            usersMessage.show('error', error instanceof Error ? error.message : 'Error cargando relaciones padre-estudiante')
        } finally {
            setLoadingPadresEstudiantes(false)
        }
    }, [usersMessage.show])

    const loadAsignaturas = useCallback(async () => {
        try {
            setLoadingAsignaturasList(true)
            const { data, error } = await dbClient.from('asignaturas').select('*').order('nombre')
            if (error) throw error
            setAsignaturas(data ?? [])
        } catch (error) {
            asignaturasMessage.show('error', error instanceof Error ? error.message : 'Error cargando asignaturas')
        } finally {
            setLoadingAsignaturasList(false)
        }
    }, [asignaturasMessage.show])

    const loadDocentes = useCallback(async () => {
        try {
            const { data, error } = await dbClient
                .from('profiles')
                .select('*')
                .eq('rol', 'docente')
                .eq('activo', true)
                .order('nombre_completo')
            if (error) throw error
            setDocentes(data ?? [])
        } catch (error) {
            gruposMessage.show('error', error instanceof Error ? error.message : 'Error cargando docentes')
        }
    }, [gruposMessage.show])

    const loadGrupos = useCallback(async () => {
        try {
            setLoadingGruposList(true)
            const { data, error } = await dbClient
                .from('grupos')
                .select('*, grado:grados(nombre), director_grupo:profiles(nombre_completo)')
                .order('año_academico', { ascending: false })
                .order('nombre')

            if (error) throw error
            setGrupos((data as GroupRow[]) ?? [])
        } catch (error) {
            gruposMessage.show('error', error instanceof Error ? error.message : 'Error cargando grupos')
        } finally {
            setLoadingGruposList(false)
        }
    }, [gruposMessage.show])

    const loadEstudiantes = useCallback(async () => {
        try {
            const { data, error } = await dbClient
                .from('profiles')
                .select('*')
                .eq('rol', 'estudiante')
                .eq('activo', true)
                .order('nombre_completo')
            if (error) throw error
            setEstudiantes(data ?? [])
        } catch (error) {
            gruposMessage.show('error', error instanceof Error ? error.message : 'Error cargando estudiantes')
        }
    }, [gruposMessage.show])

    const loadEstudiantesEnGrupo = useCallback(async (grupoId: string) => {
        try {
            setLoadingEstudiantes(true)
            const { data, error } = await dbClient
                .from('estudiantes_grupos')
                .select('estudiante:estudiante_id (id, nombre_completo, email)')
                .eq('grupo_id', grupoId)
                .eq('estado', 'activo')

            if (error) throw error
            const estudiantes = (data ?? []).map((item: any) => item.estudiante).filter(Boolean)
            setEstudiantesEnGrupo(estudiantes)
        } catch (error) {
            gruposMessage.show('error', error instanceof Error ? error.message : 'Error cargando estudiantes del grupo')
        } finally {
            setLoadingEstudiantes(false)
        }
    }, [gruposMessage.show])

    useEffect(() => {
        if (!isAdmin) return
        void Promise.all([loadUsuarios(), loadPadresEstudiantes()])
    }, [isAdmin, loadPadresEstudiantes, loadUsuarios])

    useEffect(() => {
        if (!isAdmin) return

        if (activeTab === 'grados') {
            loadGrados()
        }

        if (activeTab === 'asignaturas') {
            loadAsignaturas()
            loadDocentes()
            loadGrupos()
        }

        if (activeTab === 'grupos') {
            void Promise.all([loadGrupos(), loadDocentes(), loadGrados(), loadEstudiantes()])
        }
    }, [activeTab, isAdmin, loadAsignaturas, loadDocentes, loadGrados, loadGrupos, loadEstudiantes])

    useEffect(() => {
        if (!isAdmin) return

        const channel = dbClient
            .channel('profiles-admin-panel')
            .on('postgres_changes', { event: '*', schema: 'public', table: 'profiles' }, (payload) => {
                if (payload.eventType === 'INSERT') {
                    const inserted = payload.new as Profile
                    setUsuarios((prev) => {
                        const next = prev.some((u) => u.id === inserted.id) ? prev.map((u) => (u.id === inserted.id ? inserted : u)) : [...prev, inserted]
                        return [...next].sort((a, b) => a.nombre_completo.localeCompare(b.nombre_completo))
                    })
                    return
                }

                if (payload.eventType === 'UPDATE') {
                    const updated = payload.new as Profile
                    setUsuarios((prev) =>
                        [...prev.map((u) => (u.id === updated.id ? updated : u))].sort((a, b) =>
                            a.nombre_completo.localeCompare(b.nombre_completo)
                        )
                    )
                    return
                }

                if (payload.eventType === 'DELETE') {
                    const deleted = payload.old as Profile
                    setUsuarios((prev) => prev.filter((u) => u.id !== deleted.id))
                }
            })
            .subscribe((status) => {
                setRealtimeConnected(status === 'SUBSCRIBED')
            })

        return () => {
            void dbClient.removeChannel(channel)
            setRealtimeConnected(false)
        }
    }, [isAdmin])

    const currentUserId = profile?.id ?? null

    const usuariosFiltrados = useMemo(
        () => (userRoleFilter === 'todos' ? usuarios : usuarios.filter((usuario) => usuario.rol === userRoleFilter)),
        [usuarios, userRoleFilter]
    )

    const padresDisponibles = useMemo(
        () => usuarios.filter((usuario) => usuario.rol === 'padre' && usuario.activo),
        [usuarios]
    )

    const estudiantesDisponibles = useMemo(
        () => usuarios.filter((usuario) => usuario.rol === 'estudiante' && usuario.activo),
        [usuarios]
    )

    const estudiantesAsignadosAlPadre = useMemo(
        () => new Set(padresEstudiantes.filter((item) => item.padre_id === padreSeleccionadoId).map((item) => item.estudiante_id)),
        [padreSeleccionadoId, padresEstudiantes]
    )

    const currentModalTitle = useMemo(() => {
        if (!userModal) return ''
        if (userModal.kind === 'create') return 'Nuevo usuario'
        if (userModal.kind === 'edit') return `Editar usuario: ${userModal.user.nombre_completo}`
        if (userModal.kind === 'change-email') return `Cambiar correo: ${userModal.user.nombre_completo}`
        return `Restablecer contraseña: ${userModal.user.nombre_completo}`
    }, [userModal])

    const openCreateUserModal = () => {
        setCreateForm({
            email: '',
            password: '',
            nombre_completo: '',
            rol: 'estudiante',
            telefono: '',
            direccion: ''
        })
        setUserModal({ kind: 'create' })
    }

    const openEditUserModal = (user: Profile) => {
        setEditForm({
            nombre_completo: user.nombre_completo,
            rol: user.rol,
            telefono: user.telefono ?? '',
            direccion: user.direccion ?? '',
            activo: user.activo
        })
        setUserModal({ kind: 'edit', user })
    }

    const openChangeEmailModal = (user: Profile) => {
        setEmailForm(user.email)
        setUserModal({ kind: 'change-email', user })
    }

    const openResetPasswordModal = (user: Profile) => {
        setPasswordForm('')
        setUserModal({ kind: 'reset-password', user })
    }

    const closeModal = () => {
        setSavingUser(false)
        setUserModal(null)
    }

    const onCreateUser = async (e: React.FormEvent) => {
        e.preventDefault()

        if (!createForm.nombre_completo || !createForm.email || !createForm.password) {
            usersMessage.show('error', 'Completa los campos obligatorios')
            return
        }

        if (createForm.password.length < 6) {
            usersMessage.show('error', 'La contraseña debe tener al menos 6 caracteres')
            return
        }

        try {
            setSavingUser(true)
            await adminCreateUser({
                ...createForm,
                telefono: createForm.telefono?.trim() || undefined,
                direccion: createForm.direccion?.trim() || undefined
            })
            usersMessage.show('success', 'Usuario creado. Realtime actualizará la tabla automáticamente.')
            closeModal()
        } catch (error) {
            usersMessage.show('error', error instanceof Error ? error.message : 'No se pudo crear el usuario')
        } finally {
            setSavingUser(false)
        }
    }

    const onEditUser = async (e: React.FormEvent) => {
        e.preventDefault()

        if (!userModal || userModal.kind !== 'edit') return

        const user = userModal.user
        const previousUsers = usuarios

        const optimisticUser: Profile = {
            ...user,
            nombre_completo: editForm.nombre_completo,
            rol: editForm.rol,
            telefono: editForm.telefono || null,
            direccion: editForm.direccion || null,
            activo: editForm.activo,
            updated_at: new Date().toISOString()
        }

        setUsuarios((prev) => prev.map((u) => (u.id === user.id ? optimisticUser : u)))

        try {
            setSavingUser(true)
            const updates: Database['public']['Tables']['profiles']['Update'] = {
                nombre_completo: editForm.nombre_completo,
                rol: editForm.rol,
                telefono: editForm.telefono || null,
                direccion: editForm.direccion || null,
                activo: editForm.activo
            }

            const { error } = await dbClient
                .from('profiles')
                .update(updates as never)
                .eq('id', user.id)

            if (error) throw error

            usersMessage.show('success', 'Usuario actualizado correctamente')
            closeModal()
        } catch (error) {
            setUsuarios(previousUsers)
            usersMessage.show('error', error instanceof Error ? error.message : 'No se pudo actualizar el usuario')
        } finally {
            setSavingUser(false)
        }
    }

    const onChangeEmail = async (e: React.FormEvent) => {
        e.preventDefault()

        if (!userModal || userModal.kind !== 'change-email') return

        try {
            setSavingUser(true)
            await adminUpdateEmail(userModal.user.id, emailForm)
            usersMessage.show('success', 'Correo actualizado correctamente')
            closeModal()
        } catch (error) {
            usersMessage.show('error', error instanceof Error ? error.message : 'No se pudo cambiar el correo')
        } finally {
            setSavingUser(false)
        }
    }

    const onResetPassword = async (e: React.FormEvent) => {
        e.preventDefault()

        if (!userModal || userModal.kind !== 'reset-password') return

        if (userModal.user.id === currentUserId) {
            usersMessage.show('error', 'No puedes restablecer tu propia contraseña desde este panel')
            return
        }

        if (passwordForm.length < 6) {
            usersMessage.show('error', 'La contraseña debe tener al menos 6 caracteres')
            return
        }

        try {
            setSavingUser(true)
            await adminResetPassword(userModal.user.id, passwordForm)
            usersMessage.show('success', 'Contraseña restablecida correctamente')
            closeModal()
        } catch (error) {
            usersMessage.show('error', error instanceof Error ? error.message : 'No se pudo restablecer la contraseña')
        } finally {
            setSavingUser(false)
        }
    }

    const onToggleActive = async (user: Profile) => {
        if (user.id === currentUserId) {
            usersMessage.show('error', 'No puedes desactivar tu propio usuario')
            return
        }

        const previousUsers = usuarios
        const nextActive = !user.activo

        setTogglingUserId(user.id)
        setUsuarios((prev) => prev.map((u) => (u.id === user.id ? { ...u, activo: nextActive } : u)))

        try {
            const updates: Database['public']['Tables']['profiles']['Update'] = { activo: nextActive }
            const { error } = await dbClient.from('profiles').update(updates as never).eq('id', user.id)
            if (error) throw error
            usersMessage.show('success', `Usuario ${nextActive ? 'activado' : 'desactivado'} correctamente`)
        } catch (error) {
            setUsuarios(previousUsers)
            usersMessage.show('error', error instanceof Error ? error.message : 'No se pudo cambiar el estado')
        } finally {
            setTogglingUserId(null)
        }
    }

    const onDeleteUser = async (user: Profile) => {
        if (user.id === currentUserId) {
            usersMessage.show('error', 'No puedes eliminar tu propio usuario')
            return
        }

        if (!window.confirm(`¿Eliminar a "${user.nombre_completo}"? Esta acción no se puede deshacer.`)) return

        try {
            setDeletingUserId(user.id)
            await adminDeleteUser(user.id)
            usersMessage.show('success', 'Usuario eliminado correctamente')
        } catch (error) {
            usersMessage.show('error', error instanceof Error ? error.message : 'No se pudo eliminar el usuario')
        } finally {
            setDeletingUserId(null)
        }
    }

    const onCreatePadreEstudiante = async (e: React.FormEvent) => {
        e.preventDefault()

        if (!padreSeleccionadoId || !estudiantePadreSeleccionadoId) {
            usersMessage.show('error', 'Selecciona padre y estudiante')
            return
        }

        const padreValido = padresDisponibles.some((usuario) => usuario.id === padreSeleccionadoId)
        const estudianteValido = estudiantesDisponibles.some((usuario) => usuario.id === estudiantePadreSeleccionadoId)

        if (!padreValido || !estudianteValido) {
            usersMessage.show('error', 'La relación es inválida para los roles seleccionados')
            return
        }

        if (padresEstudiantes.some((item) => item.padre_id === padreSeleccionadoId && item.estudiante_id === estudiantePadreSeleccionadoId)) {
            usersMessage.show('error', 'Esta relación ya existe')
            return
        }

        try {
            setSavingPadreEstudiante(true)
            const payload: Database['public']['Tables']['padres_estudiantes']['Insert'] = {
                padre_id: padreSeleccionadoId,
                estudiante_id: estudiantePadreSeleccionadoId,
                parentesco: parentescoPadreEstudiante.trim() || 'Padre/Madre',
                principal: principalPadreEstudiante
            }

            const { error } = await dbClient.from('padres_estudiantes').insert(payload as never)
            if (error) throw error

            setEstudiantePadreSeleccionadoId('')
            setParentescoPadreEstudiante('Padre/Madre')
            setPrincipalPadreEstudiante(false)
            usersMessage.show('success', 'Relación padre-estudiante creada correctamente')
            await loadPadresEstudiantes()
        } catch (error) {
            usersMessage.show('error', error instanceof Error ? error.message : 'No se pudo crear la relación')
        } finally {
            setSavingPadreEstudiante(false)
        }
    }

    const onDeletePadreEstudiante = async (relationId: string) => {
        if (!window.confirm('¿Eliminar esta relación padre-estudiante?')) return

        try {
            setDeletingPadreEstudianteId(relationId)
            const { error } = await dbClient.from('padres_estudiantes').delete().eq('id', relationId)
            if (error) throw error

            usersMessage.show('success', 'Relación eliminada correctamente')
            setPadresEstudiantes((prev) => prev.filter((item) => item.id !== relationId))
        } catch (error) {
            usersMessage.show('error', error instanceof Error ? error.message : 'No se pudo eliminar la relación')
        } finally {
            setDeletingPadreEstudianteId(null)
        }
    }

    const onCreateGrado = async (e: React.FormEvent) => {
        e.preventDefault()

        if (!newGrado.nombre || !newGrado.nivel) {
            gradosMessage.show('error', 'Completa nombre y nivel')
            return
        }

        try {
            setCreatingGrado(true)
            const payload: Database['public']['Tables']['grados']['Insert'] = {
                nombre: newGrado.nombre,
                nivel: newGrado.nivel
            }
            const { error } = await dbClient.from('grados').insert(payload as never)
            if (error) throw error

            setNewGrado({ nombre: '', nivel: '' })
            gradosMessage.show('success', 'Grado creado correctamente')
            await loadGrados()
        } catch (error) {
            gradosMessage.show('error', error instanceof Error ? error.message : 'No se pudo crear el grado')
        } finally {
            setCreatingGrado(false)
        }
    }

    const onDeleteGrado = async (gradoId: string) => {
        if (!window.confirm('¿Eliminar este grado? También eliminará grupos asociados.')) return

        try {
            setDeletingGradoId(gradoId)
            const { error } = await dbClient.from('grados').delete().eq('id', gradoId)
            if (error) throw error

            gradosMessage.show('success', 'Grado eliminado correctamente')
            setGrados((prev) => prev.filter((g) => g.id !== gradoId))
        } catch (error) {
            gradosMessage.show('error', error instanceof Error ? error.message : 'No se pudo eliminar el grado')
        } finally {
            setDeletingGradoId(null)
        }
    }

    const onCreateAsignatura = async (e: React.FormEvent) => {
        e.preventDefault()

        if (!newAsignatura.nombre) {
            asignaturasMessage.show('error', 'El nombre es obligatorio')
            return
        }

        if ((asignaturaDocenteId && asignaturaGrupoIds.length === 0)
            || (!asignaturaDocenteId && asignaturaGrupoIds.length > 0)) {
            asignaturasMessage.show('error', 'Selecciona docente y al menos un grupo para asignar la materia')
            return
        }

        try {
            setCreatingAsignatura(true)
            const payload: Database['public']['Tables']['asignaturas']['Insert'] = {
                nombre: newAsignatura.nombre,
                codigo: newAsignatura.codigo || null,
                descripcion: newAsignatura.descripcion || null
            }
            const { data, error } = await dbClient
                .from('asignaturas')
                .insert(payload as never)
                .select('id')
                .single<{ id: string }>()
            if (error || !data) throw error

            if (asignaturaDocenteId && asignaturaGrupoIds.length > 0) {
                const asignacionPayload: Array<Database['public']['Tables']['asignaciones_docentes']['Insert']> =
                    asignaturaGrupoIds.map((grupoId) => ({
                        docente_id: asignaturaDocenteId,
                        grupo_id: grupoId,
                        asignatura_id: data.id,
                        año_academico: asignaturaAno
                    }))
                const { error: asignacionError } = await dbClient
                    .from('asignaciones_docentes')
                    .insert(asignacionPayload as never)
                if (asignacionError) throw asignacionError
            }

            setNewAsignatura({ nombre: '', codigo: '', descripcion: '' })
            setAsignaturaDocenteId('')
            setAsignaturaGrupoIds([])
            setAsignaturaAno(new Date().getFullYear())
            asignaturasMessage.show('success', 'Asignatura creada correctamente')
            await loadAsignaturas()
        } catch (error) {
            asignaturasMessage.show('error', error instanceof Error ? error.message : 'No se pudo crear la asignatura')
        } finally {
            setCreatingAsignatura(false)
        }
    }

    const onDeleteAsignatura = async (asignaturaId: string) => {
        if (!window.confirm('¿Eliminar esta asignatura?')) return

        try {
            setDeletingAsignaturaId(asignaturaId)
            const { error } = await dbClient.from('asignaturas').delete().eq('id', asignaturaId)
            if (error) throw error

            asignaturasMessage.show('success', 'Asignatura eliminada correctamente')
            setAsignaturas((prev) => prev.filter((a) => a.id !== asignaturaId))
        } catch (error) {
            asignaturasMessage.show('error', error instanceof Error ? error.message : 'No se pudo eliminar la asignatura')
        } finally {
            setDeletingAsignaturaId(null)
        }
    }

    const toggleAsignaturaGrupo = (grupoId: string) => {
        setAsignaturaGrupoIds((prev) =>
            prev.includes(grupoId) ? prev.filter((id) => id !== grupoId) : [...prev, grupoId]
        )
    }

    const onCreateGrupo = async (e: React.FormEvent) => {
        e.preventDefault()

        if (!newGrupo.grado_id || !newGrupo.nombre) {
            gruposMessage.show('error', 'Completa los campos obligatorios del grupo')
            return
        }

        try {
            setCreatingGrupo(true)
            const payload: Database['public']['Tables']['grupos']['Insert'] = {
                grado_id: newGrupo.grado_id,
                nombre: newGrupo.nombre,
                año_academico: newGrupo.año_academico,
                director_grupo_id: newGrupo.director_grupo_id || null
            }
            const { error } = await dbClient.from('grupos').insert(payload as never)
            if (error) throw error

            setNewGrupo({
                grado_id: '',
                nombre: '',
                año_academico: new Date().getFullYear(),
                director_grupo_id: ''
            })
            gruposMessage.show('success', 'Grupo creado correctamente')
            await loadGrupos()
        } catch (error) {
            gruposMessage.show('error', error instanceof Error ? error.message : 'No se pudo crear el grupo')
        } finally {
            setCreatingGrupo(false)
        }
    }

    const onDeleteGrupo = async (grupoId: string) => {
        if (!window.confirm('¿Eliminar este grupo?')) return

        try {
            setDeletingGrupoId(grupoId)
            const { error } = await dbClient.from('grupos').delete().eq('id', grupoId)
            if (error) throw error

            gruposMessage.show('success', 'Grupo eliminado correctamente')
            setGrupos((prev) => prev.filter((g) => g.id !== grupoId))
        } catch (error) {
            gruposMessage.show('error', error instanceof Error ? error.message : 'No se pudo eliminar el grupo')
        } finally {
            setDeletingGrupoId(null)
        }
    }

    const onAsignarEstudiante = async (e: React.FormEvent) => {
        e.preventDefault()

        if (!estudianteSeleccionado || !selectedGrupoId) {
            gruposMessage.show('error', 'Selecciona un estudiante')
            return
        }

        try {
            setAsignandoEstudiante(true)

            // Verificar si ya está asignado
            const { data: existing } = await dbClient
                .from('estudiantes_grupos')
                .select('id')
                .eq('estudiante_id', estudianteSeleccionado)
                .eq('grupo_id', selectedGrupoId)
                .eq('estado', 'activo')
                .single()

            if (existing) {
                gruposMessage.show('error', 'El estudiante ya está asignado a este grupo')
                return
            }

            const payload = {
                estudiante_id: estudianteSeleccionado,
                grupo_id: selectedGrupoId,
                año_academico: new Date().getFullYear(),
                estado: 'activo'
            }

            const { error } = await dbClient.from('estudiantes_grupos').insert(payload as never)
            if (error) throw error

            setEstudianteSeleccionado('')
            gruposMessage.show('success', 'Estudiante asignado correctamente')
            await loadEstudiantesEnGrupo(selectedGrupoId)
        } catch (error) {
            gruposMessage.show('error', error instanceof Error ? error.message : 'No se pudo asignar el estudiante')
        } finally {
            setAsignandoEstudiante(false)
        }
    }

    const onEliminarEstudianteDeGrupo = async (estudianteId: string) => {
        if (!selectedGrupoId || !window.confirm('¿Remover este estudiante del grupo?')) return

        try {
            setEliminandoEstudianteId(estudianteId)
            const { error } = await dbClient
                .from('estudiantes_grupos')
                .delete()
                .eq('estudiante_id', estudianteId)
                .eq('grupo_id', selectedGrupoId)

            if (error) throw error

            gruposMessage.show('success', 'Estudiante removido del grupo')
            setEstudiantesEnGrupo((prev) => prev.filter((e) => e.id !== estudianteId))
        } catch (error) {
            gruposMessage.show('error', error instanceof Error ? error.message : 'No se pudo remover el estudiante')
        } finally {
            setEliminandoEstudianteId(null)
        }
    }

    const handleVerEstudiantes = (grupoId: string) => {
        setSelectedGrupoId(grupoId)
        void loadEstudiantesEnGrupo(grupoId)
    }

    const handleCerrarEstudiantes = () => {
        setSelectedGrupoId(null)
        setEstudiantesEnGrupo([])
        setEstudianteSeleccionado('')
    }

    if (!isAdmin) {
        return (
            <div className="p-6">
                <Alert variant="destructive">
                    <AlertDescription>
                        No tienes permisos para acceder a esta sección. Solo los administradores pueden gestionar configuración.
                    </AlertDescription>
                </Alert>
            </div>
        )
    }

    return (
        <div className="p-6 max-w-7xl mx-auto space-y-6">
            <div>
                <h1 className="text-3xl font-bold mb-2">Panel de Administración</h1>
                <p className="text-muted-foreground">Gestiona usuarios, grados, asignaturas y grupos del sistema</p>
            </div>

            <div className="flex gap-2 border-b">
                {TABS.map((tab) => (
                    <button
                        key={tab.key}
                        type="button"
                        onClick={() => setActiveTab(tab.key)}
                        className={`px-4 py-2 font-medium transition-colors ${activeTab === tab.key
                            ? 'border-b-2 border-primary text-primary'
                            : 'text-muted-foreground hover:text-foreground'
                            }`}
                    >
                        {tab.label}
                    </button>
                ))}
            </div>

            {activeTab === 'usuarios' && (
                <section className="space-y-4">
                    <MsgBanner msg={usersMessage.msg} />

                    <Card>
                        <CardHeader>
                            <div className="flex items-center justify-between gap-3">
                                <div>
                                    <CardTitle>Gestión de Usuarios</CardTitle>
                                    <CardDescription>Altas, edición, credenciales y estado de acceso</CardDescription>
                                </div>
                                <div className="flex items-center gap-2">
                                    <Label htmlFor="role-filter" className="text-xs text-muted-foreground">
                                        Filtrar por rol
                                    </Label>
                                    <select
                                        id="role-filter"
                                        className="h-9 rounded-md border border-input bg-background px-3 text-sm"
                                        value={userRoleFilter}
                                        onChange={(e) => setUserRoleFilter(e.target.value as UserRoleFilter)}
                                    >
                                        <option value="todos">Todos</option>
                                        {ROLE_OPTIONS.map((rol) => (
                                            <option key={rol} value={rol}>
                                                {rol}
                                            </option>
                                        ))}
                                    </select>
                                    <span className="text-xs text-muted-foreground">Realtime</span>
                                    <span
                                        className={`h-3 w-3 rounded-full ${realtimeConnected ? 'bg-primary animate-pulse' : 'bg-muted-foreground'
                                            }`}
                                        title={realtimeConnected ? 'Conectado' : 'Desconectado'}
                                    />
                                    <Button
                                        variant="outline"
                                        onClick={() => void Promise.all([loadUsuarios(), loadPadresEstudiantes()])}
                                        disabled={loadingUsuarios || loadingPadresEstudiantes}
                                    >
                                        <RefreshCw
                                            className={`h-4 w-4 mr-2 ${loadingUsuarios || loadingPadresEstudiantes ? 'animate-spin' : ''}`}
                                        />
                                        Refrescar
                                    </Button>
                                    <Button onClick={openCreateUserModal}>Nuevo usuario</Button>
                                </div>
                            </div>
                        </CardHeader>
                        <CardContent>
                            {loadingUsuarios ? (
                                <div className="flex justify-center py-8">
                                    <Loader2 className="h-6 w-6 animate-spin" />
                                </div>
                            ) : (
                                <div className="overflow-x-auto">
                                    <table className="w-full">
                                        <thead className="bg-muted/50">
                                            <tr>
                                                <th className="px-4 py-3 text-left text-sm font-medium">Nombre</th>
                                                <th className="px-4 py-3 text-left text-sm font-medium">Email</th>
                                                <th className="px-4 py-3 text-left text-sm font-medium">Rol</th>
                                                <th className="px-4 py-3 text-left text-sm font-medium">Estado</th>
                                                <th className="px-4 py-3 text-left text-sm font-medium">Acciones</th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y">
                                            {usuariosFiltrados.map((usuario) => {
                                                const isSelf = usuario.id === currentUserId
                                                const rowDeleting = deletingUserId === usuario.id
                                                const rowToggling = togglingUserId === usuario.id

                                                return (
                                                    <tr key={usuario.id} className="hover:bg-muted/30">
                                                        <td className="px-4 py-3 text-sm">{usuario.nombre_completo}</td>
                                                        <td className="px-4 py-3 text-sm">{usuario.email}</td>
                                                        <td className="px-4 py-3 text-sm">
                                                            <span className="px-2 py-1 rounded-full text-xs bg-primary/15 text-primary">
                                                                {usuario.rol}
                                                            </span>
                                                        </td>
                                                        <td className="px-4 py-3 text-sm">
                                                            <span
                                                                className={`px-2 py-1 rounded-full text-xs ${usuario.activo ? 'bg-secondary text-primary' : 'bg-destructive/10 text-destructive'
                                                                    }`}
                                                            >
                                                                {usuario.activo ? 'Activo' : 'Inactivo'}
                                                            </span>
                                                        </td>
                                                        <td className="px-4 py-3 text-sm">
                                                            <div className="flex flex-wrap gap-2">
                                                                <Button variant="outline" size="sm" onClick={() => openEditUserModal(usuario)}>
                                                                    Editar
                                                                </Button>
                                                                <Button
                                                                    variant="outline"
                                                                    size="icon"
                                                                    onClick={() => openChangeEmailModal(usuario)}
                                                                    title="Cambiar email"
                                                                >
                                                                    <Mail className="h-4 w-4" />
                                                                </Button>
                                                                <Button
                                                                    variant="outline"
                                                                    size="icon"
                                                                    onClick={() => openResetPasswordModal(usuario)}
                                                                    disabled={isSelf}
                                                                    title={isSelf ? 'No permitido para tu usuario' : 'Restablecer contraseña'}
                                                                >
                                                                    <KeyRound className="h-4 w-4" />
                                                                </Button>
                                                                <Button
                                                                    variant="outline"
                                                                    size="sm"
                                                                    onClick={() => void onToggleActive(usuario)}
                                                                    disabled={rowToggling || isSelf}
                                                                    title={isSelf ? 'No puedes desactivar tu usuario' : ''}
                                                                >
                                                                    {rowToggling && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
                                                                    {usuario.activo ? 'Desactivar' : 'Activar'}
                                                                </Button>
                                                                <Button
                                                                    variant="destructive"
                                                                    size="icon"
                                                                    onClick={() => void onDeleteUser(usuario)}
                                                                    disabled={rowDeleting || isSelf}
                                                                    title={isSelf ? 'No puedes eliminar tu usuario' : 'Eliminar usuario'}
                                                                >
                                                                    {rowDeleting ? (
                                                                        <Loader2 className="h-4 w-4 animate-spin" />
                                                                    ) : (
                                                                        <Trash2 className="h-4 w-4" />
                                                                    )}
                                                                </Button>
                                                            </div>
                                                        </td>
                                                    </tr>
                                                )
                                            })}
                                            {usuariosFiltrados.length === 0 && (
                                                <tr>
                                                    <td colSpan={5} className="px-4 py-6 text-center text-sm text-muted-foreground">
                                                        No hay usuarios para el rol seleccionado.
                                                    </td>
                                                </tr>
                                            )}
                                        </tbody>
                                    </table>
                                </div>
                            )}
                        </CardContent>
                    </Card>

                    <div className="grid gap-6 md:grid-cols-2">
                        <Card>
                            <CardHeader>
                                <CardTitle>Relacionar padre con estudiantes</CardTitle>
                                <CardDescription>
                                    Asigna uno o más estudiantes por padre para restringir su acceso de información
                                </CardDescription>
                            </CardHeader>
                            <CardContent>
                                <form onSubmit={onCreatePadreEstudiante} className="space-y-4">
                                    <div>
                                        <Label htmlFor="padre-select">Padre</Label>
                                        <select
                                            id="padre-select"
                                            className="w-full px-3 py-2 border rounded-md bg-background"
                                            value={padreSeleccionadoId}
                                            onChange={(e) => {
                                                setPadreSeleccionadoId(e.target.value)
                                                setEstudiantePadreSeleccionadoId('')
                                            }}
                                            required
                                        >
                                            <option value="">Seleccionar padre</option>
                                            {padresDisponibles.map((padre) => (
                                                <option key={padre.id} value={padre.id}>
                                                    {padre.nombre_completo} ({padre.email})
                                                </option>
                                            ))}
                                        </select>
                                    </div>

                                    <div>
                                        <Label htmlFor="hijo-select">Estudiante</Label>
                                        <select
                                            id="hijo-select"
                                            className="w-full px-3 py-2 border rounded-md bg-background"
                                            value={estudiantePadreSeleccionadoId}
                                            onChange={(e) => setEstudiantePadreSeleccionadoId(e.target.value)}
                                            required
                                        >
                                            <option value="">Seleccionar estudiante</option>
                                            {estudiantesDisponibles
                                                .filter((estudiante) => !estudiantesAsignadosAlPadre.has(estudiante.id))
                                                .map((estudiante) => (
                                                    <option key={estudiante.id} value={estudiante.id}>
                                                        {estudiante.nombre_completo} ({estudiante.email})
                                                    </option>
                                                ))}
                                        </select>
                                    </div>

                                    <div>
                                        <Label htmlFor="parentesco-input">Parentesco</Label>
                                        <Input
                                            id="parentesco-input"
                                            value={parentescoPadreEstudiante}
                                            onChange={(e) => setParentescoPadreEstudiante(e.target.value)}
                                            required
                                        />
                                    </div>

                                    <label className="flex items-center gap-2 text-sm">
                                        <input
                                            type="checkbox"
                                            checked={principalPadreEstudiante}
                                            onChange={(e) => setPrincipalPadreEstudiante(e.target.checked)}
                                        />
                                        <span>Marcar como contacto principal</span>
                                    </label>

                                    <Button type="submit" className="w-full" disabled={savingPadreEstudiante}>
                                        {savingPadreEstudiante && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
                                        Guardar relación
                                    </Button>
                                </form>
                            </CardContent>
                        </Card>

                        <Card>
                            <CardHeader>
                                <CardTitle>Relaciones registradas</CardTitle>
                                <CardDescription>Listado de padres con estudiantes relacionados</CardDescription>
                            </CardHeader>
                            <CardContent>
                                {loadingPadresEstudiantes ? (
                                    <div className="flex justify-center py-8">
                                        <Loader2 className="h-6 w-6 animate-spin" />
                                    </div>
                                ) : padresEstudiantes.length === 0 ? (
                                    <p className="text-sm text-muted-foreground text-center py-4">
                                        No hay relaciones padre-estudiante registradas.
                                    </p>
                                ) : (
                                    <div className="space-y-2 max-h-[420px] overflow-y-auto">
                                        {padresEstudiantes.map((relation) => (
                                            <div key={relation.id} className="flex items-center justify-between p-3 border rounded-lg">
                                                <div>
                                                    <p className="text-sm font-medium">
                                                        {relation.padre?.nombre_completo ?? 'Padre no disponible'} →{' '}
                                                        {relation.estudiante?.nombre_completo ?? 'Estudiante no disponible'}
                                                    </p>
                                                    <p className="text-xs text-muted-foreground">
                                                        {relation.parentesco}
                                                        {relation.principal ? ' · Principal' : ''}
                                                    </p>
                                                </div>
                                                <Button
                                                    variant="ghost"
                                                    size="sm"
                                                    onClick={() => void onDeletePadreEstudiante(relation.id)}
                                                    disabled={deletingPadreEstudianteId === relation.id}
                                                >
                                                    {deletingPadreEstudianteId === relation.id ? (
                                                        <Loader2 className="h-4 w-4 animate-spin" />
                                                    ) : (
                                                        <Trash2 className="h-4 w-4" />
                                                    )}
                                                </Button>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </CardContent>
                        </Card>
                    </div>
                </section>
            )}

            {activeTab === 'grados' && (
                <section className="grid gap-6 md:grid-cols-2">
                    <div className="md:col-span-2">
                        <MsgBanner msg={gradosMessage.msg} />
                    </div>

                    <Card>
                        <CardHeader>
                            <CardTitle>Crear nuevo grado</CardTitle>
                            <CardDescription>Registra un grado académico</CardDescription>
                        </CardHeader>
                        <CardContent>
                            <form onSubmit={onCreateGrado} className="space-y-4">
                                <div>
                                    <Label htmlFor="grado-nombre">Nombre del grado *</Label>
                                    <Input
                                        id="grado-nombre"
                                        value={newGrado.nombre}
                                        onChange={(e) => setNewGrado((prev) => ({ ...prev, nombre: e.target.value }))}
                                        required
                                    />
                                </div>
                                <div>
                                    <Label htmlFor="grado-nivel">Nivel *</Label>
                                    <Input
                                        id="grado-nivel"
                                        value={newGrado.nivel}
                                        onChange={(e) => setNewGrado((prev) => ({ ...prev, nivel: e.target.value }))}
                                        required
                                    />
                                </div>
                                <Button type="submit" className="w-full" disabled={creatingGrado}>
                                    {creatingGrado && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
                                    Crear grado
                                </Button>
                            </form>
                        </CardContent>
                    </Card>

                    <Card>
                        <CardHeader>
                            <CardTitle>Grados existentes</CardTitle>
                            <CardDescription>Listado actual de grados</CardDescription>
                        </CardHeader>
                        <CardContent>
                            {loadingGradosList ? (
                                <div className="flex justify-center py-8">
                                    <Loader2 className="h-6 w-6 animate-spin" />
                                </div>
                            ) : (
                                <div className="space-y-2">
                                    {grados.length === 0 ? (
                                        <p className="text-sm text-muted-foreground text-center py-4">No hay grados registrados.</p>
                                    ) : (
                                        grados.map((grado) => (
                                            <div key={grado.id} className="flex justify-between items-center p-3 border rounded-lg">
                                                <div>
                                                    <p className="font-medium">{grado.nombre}</p>
                                                    <p className="text-sm text-muted-foreground">{grado.nivel}</p>
                                                </div>
                                                <Button
                                                    variant="destructive"
                                                    size="sm"
                                                    onClick={() => void onDeleteGrado(grado.id)}
                                                    disabled={deletingGradoId === grado.id}
                                                >
                                                    {deletingGradoId === grado.id && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
                                                    Eliminar
                                                </Button>
                                            </div>
                                        ))
                                    )}
                                </div>
                            )}
                        </CardContent>
                    </Card>
                </section>
            )}

            {activeTab === 'asignaturas' && (
                <section className="grid gap-6 md:grid-cols-2">
                    <div className="md:col-span-2">
                        <MsgBanner msg={asignaturasMessage.msg} />
                    </div>

                    <Card>
                        <CardHeader>
                            <CardTitle>Crear nueva asignatura</CardTitle>
                            <CardDescription>Agrega una asignatura al catálogo</CardDescription>
                        </CardHeader>
                        <CardContent>
                            <form onSubmit={onCreateAsignatura} className="space-y-4">
                                <div>
                                    <Label htmlFor="asignatura-nombre">Nombre *</Label>
                                    <Input
                                        id="asignatura-nombre"
                                        value={newAsignatura.nombre}
                                        onChange={(e) => setNewAsignatura((prev) => ({ ...prev, nombre: e.target.value }))}
                                        required
                                    />
                                </div>
                                <div>
                                    <Label htmlFor="asignatura-codigo">Código</Label>
                                    <Input
                                        id="asignatura-codigo"
                                        value={newAsignatura.codigo}
                                        onChange={(e) => setNewAsignatura((prev) => ({ ...prev, codigo: e.target.value }))}
                                    />
                                </div>
                                <div>
                                    <Label htmlFor="asignatura-descripcion">Descripción</Label>
                                    <Input
                                        id="asignatura-descripcion"
                                        value={newAsignatura.descripcion}
                                        onChange={(e) => setNewAsignatura((prev) => ({ ...prev, descripcion: e.target.value }))}
                                    />
                                </div>
                                <div>
                                    <Label htmlFor="asignatura-docente">Docente que dictará</Label>
                                    <select
                                        id="asignatura-docente"
                                        className="w-full px-3 py-2 border rounded-md bg-background"
                                        value={asignaturaDocenteId}
                                        onChange={(e) => setAsignaturaDocenteId(e.target.value)}
                                    >
                                        <option value="">Sin asignar</option>
                                        {docentes.map((docente) => (
                                            <option key={docente.id} value={docente.id}>
                                                {docente.nombre_completo}
                                            </option>
                                        ))}
                                    </select>
                                </div>
                                <div>
                                    <Label>Grupos</Label>
                                    <div className="space-y-2 rounded-md border p-3">
                                        {grupos.length === 0 ? (
                                            <p className="text-sm text-muted-foreground">No hay grupos registrados.</p>
                                        ) : (
                                            grupos.map((grupo) => (
                                                <label key={grupo.id} className="flex items-center gap-2 text-sm">
                                                    <input
                                                        type="checkbox"
                                                        checked={asignaturaGrupoIds.includes(grupo.id)}
                                                        onChange={() => toggleAsignaturaGrupo(grupo.id)}
                                                    />
                                                    <span>
                                                        {grupo.grado?.nombre ?? 'Sin grado'} - Grupo {grupo.nombre}
                                                    </span>
                                                </label>
                                            ))
                                        )}
                                    </div>
                                </div>
                                <div>
                                    <Label htmlFor="asignatura-anio">Año académico</Label>
                                    <Input
                                        id="asignatura-anio"
                                        type="number"
                                        value={asignaturaAno}
                                        onChange={(e) =>
                                            setAsignaturaAno(Number.isNaN(Number(e.target.value))
                                                ? asignaturaAno
                                                : Number(e.target.value))
                                        }
                                    />
                                </div>
                                <Button type="submit" className="w-full" disabled={creatingAsignatura}>
                                    {creatingAsignatura && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
                                    Crear asignatura
                                </Button>
                            </form>
                        </CardContent>
                    </Card>

                    <Card>
                        <CardHeader>
                            <CardTitle>Asignaturas existentes</CardTitle>
                            <CardDescription>Listado de asignaturas registradas</CardDescription>
                        </CardHeader>
                        <CardContent>
                            {loadingAsignaturasList ? (
                                <div className="flex justify-center py-8">
                                    <Loader2 className="h-6 w-6 animate-spin" />
                                </div>
                            ) : (
                                <div className="space-y-2">
                                    {asignaturas.length === 0 ? (
                                        <p className="text-sm text-muted-foreground text-center py-4">No hay asignaturas registradas.</p>
                                    ) : (
                                        asignaturas.map((asignatura) => (
                                            <div key={asignatura.id} className="flex justify-between items-center p-3 border rounded-lg">
                                                <div>
                                                    <p className="font-medium">{asignatura.nombre}</p>
                                                    {asignatura.codigo && (
                                                        <p className="text-sm text-muted-foreground">Código: {asignatura.codigo}</p>
                                                    )}
                                                </div>
                                                <Button
                                                    variant="destructive"
                                                    size="sm"
                                                    onClick={() => void onDeleteAsignatura(asignatura.id)}
                                                    disabled={deletingAsignaturaId === asignatura.id}
                                                >
                                                    {deletingAsignaturaId === asignatura.id && (
                                                        <Loader2 className="h-4 w-4 animate-spin mr-2" />
                                                    )}
                                                    Eliminar
                                                </Button>
                                            </div>
                                        ))
                                    )}
                                </div>
                            )}
                        </CardContent>
                    </Card>
                </section>
            )}

            {activeTab === 'grupos' && (
                <section className="grid gap-6 md:grid-cols-2">
                    <div className="md:col-span-2">
                        <MsgBanner msg={gruposMessage.msg} />
                    </div>

                    <Card>
                        <CardHeader>
                            <CardTitle>Crear nuevo grupo</CardTitle>
                            <CardDescription>Relaciona grado, año académico y director</CardDescription>
                        </CardHeader>
                        <CardContent>
                            <form onSubmit={onCreateGrupo} className="space-y-4">
                                <div>
                                    <Label htmlFor="grupo-grado">Grado *</Label>
                                    <select
                                        id="grupo-grado"
                                        className="w-full px-3 py-2 border rounded-md bg-background"
                                        value={newGrupo.grado_id}
                                        onChange={(e) => setNewGrupo((prev) => ({ ...prev, grado_id: e.target.value }))}
                                        required
                                    >
                                        <option value="">Seleccionar grado</option>
                                        {grados.map((grado) => (
                                            <option key={grado.id} value={grado.id}>
                                                {grado.nombre} - {grado.nivel}
                                            </option>
                                        ))}
                                    </select>
                                </div>

                                <div>
                                    <Label htmlFor="grupo-nombre">Nombre del grupo *</Label>
                                    <Input
                                        id="grupo-nombre"
                                        value={newGrupo.nombre}
                                        onChange={(e) => setNewGrupo((prev) => ({ ...prev, nombre: e.target.value }))}
                                        required
                                    />
                                </div>

                                <div>
                                    <Label htmlFor="grupo-anio">Año académico *</Label>
                                    <Input
                                        id="grupo-anio"
                                        type="number"
                                        value={newGrupo.año_academico}
                                        onChange={(e) =>
                                            setNewGrupo((prev) => ({
                                                ...prev,
                                                año_academico: Number.isNaN(Number(e.target.value))
                                                    ? prev.año_academico
                                                    : Number(e.target.value)
                                            }))
                                        }
                                        required
                                    />
                                </div>

                                <div>
                                    <Label htmlFor="grupo-director">Director de grupo</Label>
                                    <select
                                        id="grupo-director"
                                        className="w-full px-3 py-2 border rounded-md bg-background"
                                        value={newGrupo.director_grupo_id}
                                        onChange={(e) => setNewGrupo((prev) => ({ ...prev, director_grupo_id: e.target.value }))}
                                    >
                                        <option value="">Sin asignar</option>
                                        {docentes.map((docente) => (
                                            <option key={docente.id} value={docente.id}>
                                                {docente.nombre_completo}
                                            </option>
                                        ))}
                                    </select>
                                </div>

                                <Button type="submit" className="w-full" disabled={creatingGrupo}>
                                    {creatingGrupo && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
                                    Crear grupo
                                </Button>
                            </form>
                        </CardContent>
                    </Card>

                    <Card className={selectedGrupoId ? 'md:col-span-2' : ''}>
                        <CardHeader>
                            <CardTitle>Grupos existentes</CardTitle>
                            <CardDescription>Listado de grupos por grado</CardDescription>
                        </CardHeader>
                        <CardContent>
                            {loadingGruposList ? (
                                <div className="flex justify-center py-8">
                                    <Loader2 className="h-6 w-6 animate-spin" />
                                </div>
                            ) : (
                                <div className="space-y-2">
                                    {grupos.length === 0 ? (
                                        <p className="text-sm text-muted-foreground text-center py-4">No hay grupos registrados.</p>
                                    ) : (
                                        grupos.map((grupo) => (
                                            <div key={grupo.id} className="flex justify-between items-center p-3 border rounded-lg">
                                                <div className="flex-1">
                                                    <p className="font-medium">
                                                        {grupo.grado?.nombre ?? 'Sin grado'} - Grupo {grupo.nombre}
                                                    </p>
                                                    <p className="text-sm text-muted-foreground">Año: {grupo.año_academico}</p>
                                                    {grupo.director_grupo && (
                                                        <p className="text-sm text-muted-foreground">
                                                            Director: {grupo.director_grupo.nombre_completo}
                                                        </p>
                                                    )}
                                                </div>
                                                <div className="flex gap-2">
                                                    <Button
                                                        variant="outline"
                                                        size="sm"
                                                        onClick={() => handleVerEstudiantes(grupo.id)}
                                                    >
                                                        Ver Estudiantes
                                                    </Button>
                                                    <Button
                                                        variant="destructive"
                                                        size="sm"
                                                        onClick={() => void onDeleteGrupo(grupo.id)}
                                                        disabled={deletingGrupoId === grupo.id}
                                                    >
                                                        {deletingGrupoId === grupo.id && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
                                                        Eliminar
                                                    </Button>
                                                </div>
                                            </div>
                                        ))
                                    )}
                                </div>
                            )}
                        </CardContent>
                    </Card>

                    {selectedGrupoId && (
                        <Card className="md:col-span-2 border-2 border-primary">
                            <CardHeader>
                                <div className="flex justify-between items-start">
                                    <div>
                                        <CardTitle>Estudiantes del grupo</CardTitle>
                                        <CardDescription>
                                            {grupos.find((g) => g.id === selectedGrupoId)?.grado?.nombre} -
                                            Grupo {grupos.find((g) => g.id === selectedGrupoId)?.nombre}
                                        </CardDescription>
                                    </div>
                                    <Button variant="outline" size="sm" onClick={handleCerrarEstudiantes}>
                                        Cerrar
                                    </Button>
                                </div>
                            </CardHeader>
                            <CardContent>
                                <div className="grid md:grid-cols-2 gap-6">
                                    <div>
                                        <h3 className="font-semibold mb-3">Asignar estudiante</h3>
                                        <form onSubmit={onAsignarEstudiante} className="space-y-4">
                                            <div>
                                                <Label htmlFor="estudiante-select">Seleccionar estudiante</Label>
                                                <select
                                                    id="estudiante-select"
                                                    className="w-full px-3 py-2 border rounded-md bg-background"
                                                    value={estudianteSeleccionado}
                                                    onChange={(e) => setEstudianteSeleccionado(e.target.value)}
                                                    required
                                                >
                                                    <option value="">Seleccionar estudiante</option>
                                                    {estudiantes
                                                        .filter((est) => !estudiantesEnGrupo.some((eg) => eg.id === est.id))
                                                        .map((estudiante) => (
                                                            <option key={estudiante.id} value={estudiante.id}>
                                                                {estudiante.nombre_completo} ({estudiante.email})
                                                            </option>
                                                        ))}
                                                </select>
                                            </div>
                                            <Button type="submit" className="w-full" disabled={asignandoEstudiante}>
                                                {asignandoEstudiante && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
                                                Asignar estudiante
                                            </Button>
                                        </form>
                                    </div>

                                    <div>
                                        <h3 className="font-semibold mb-3">Estudiantes asignados ({estudiantesEnGrupo.length})</h3>
                                        {loadingEstudiantes ? (
                                            <div className="flex justify-center py-8">
                                                <Loader2 className="h-6 w-6 animate-spin" />
                                            </div>
                                        ) : (
                                            <div className="space-y-2 max-h-96 overflow-y-auto">
                                                {estudiantesEnGrupo.length === 0 ? (
                                                    <p className="text-sm text-muted-foreground text-center py-4">
                                                        No hay estudiantes asignados a este grupo.
                                                    </p>
                                                ) : (
                                                    estudiantesEnGrupo.map((estudiante) => (
                                                        <div
                                                            key={estudiante.id}
                                                            className="flex justify-between items-center p-2 border rounded-md"
                                                        >
                                                            <div>
                                                                <p className="text-sm font-medium">{estudiante.nombre_completo}</p>
                                                                <p className="text-xs text-muted-foreground">{estudiante.email}</p>
                                                            </div>
                                                            <Button
                                                                variant="ghost"
                                                                size="sm"
                                                                onClick={() => void onEliminarEstudianteDeGrupo(estudiante.id)}
                                                                disabled={eliminandoEstudianteId === estudiante.id}
                                                            >
                                                                {eliminandoEstudianteId === estudiante.id ? (
                                                                    <Loader2 className="h-4 w-4 animate-spin" />
                                                                ) : (
                                                                    <Trash2 className="h-4 w-4" />
                                                                )}
                                                            </Button>
                                                        </div>
                                                    ))
                                                )}
                                            </div>
                                        )}
                                    </div>
                                </div>
                            </CardContent>
                        </Card>
                    )}
                </section>
            )}

            {userModal && (
                <div
                    className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4"
                    onClick={(e) => {
                        if (e.target === e.currentTarget) closeModal()
                    }}
                >
                    <Card className="w-full max-w-2xl max-h-[90vh] overflow-y-auto">
                        <CardHeader>
                            <CardTitle>{currentModalTitle}</CardTitle>
                            <CardDescription>Completa la información y confirma la operación.</CardDescription>
                        </CardHeader>
                        <CardContent>
                            {userModal.kind === 'create' && (
                                <form onSubmit={onCreateUser} className="space-y-4">
                                    <div className="grid md:grid-cols-2 gap-4">
                                        <div>
                                            <Label htmlFor="create-nombre">Nombre completo *</Label>
                                            <Input
                                                id="create-nombre"
                                                value={createForm.nombre_completo}
                                                onChange={(e) =>
                                                    setCreateForm((prev) => ({ ...prev, nombre_completo: e.target.value }))
                                                }
                                                required
                                            />
                                        </div>
                                        <div>
                                            <Label htmlFor="create-email">Email *</Label>
                                            <Input
                                                id="create-email"
                                                type="email"
                                                value={createForm.email}
                                                onChange={(e) => setCreateForm((prev) => ({ ...prev, email: e.target.value }))}
                                                required
                                            />
                                        </div>
                                    </div>

                                    <div className="grid md:grid-cols-2 gap-4">
                                        <div>
                                            <Label htmlFor="create-password">Contraseña *</Label>
                                            <Input
                                                id="create-password"
                                                type="password"
                                                value={createForm.password}
                                                onChange={(e) => setCreateForm((prev) => ({ ...prev, password: e.target.value }))}
                                                minLength={6}
                                                required
                                            />
                                        </div>
                                        <div>
                                            <Label htmlFor="create-rol">Rol *</Label>
                                            <select
                                                id="create-rol"
                                                className="w-full px-3 py-2 border rounded-md bg-background"
                                                value={createForm.rol}
                                                onChange={(e) =>
                                                    setCreateForm((prev) => ({ ...prev, rol: e.target.value as UserRole }))
                                                }
                                                required
                                            >
                                                {ROLE_OPTIONS.map((rol) => (
                                                    <option key={rol} value={rol}>
                                                        {rol}
                                                    </option>
                                                ))}
                                            </select>
                                        </div>
                                    </div>

                                    <div className="grid md:grid-cols-2 gap-4">
                                        <div>
                                            <Label htmlFor="create-telefono">Teléfono</Label>
                                            <Input
                                                id="create-telefono"
                                                value={createForm.telefono ?? ''}
                                                onChange={(e) =>
                                                    setCreateForm((prev) => ({ ...prev, telefono: e.target.value }))
                                                }
                                            />
                                        </div>
                                        <div>
                                            <Label htmlFor="create-direccion">Dirección</Label>
                                            <Input
                                                id="create-direccion"
                                                value={createForm.direccion ?? ''}
                                                onChange={(e) =>
                                                    setCreateForm((prev) => ({ ...prev, direccion: e.target.value }))
                                                }
                                            />
                                        </div>
                                    </div>

                                    <div className="flex justify-end gap-2">
                                        <Button type="button" variant="outline" onClick={closeModal}>
                                            Cancelar
                                        </Button>
                                        <Button type="submit" disabled={savingUser}>
                                            {savingUser && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
                                            Crear usuario
                                        </Button>
                                    </div>
                                </form>
                            )}

                            {userModal.kind === 'edit' && (
                                <form onSubmit={onEditUser} className="space-y-4">
                                    <div className="grid md:grid-cols-2 gap-4">
                                        <div>
                                            <Label htmlFor="edit-nombre">Nombre completo *</Label>
                                            <Input
                                                id="edit-nombre"
                                                value={editForm.nombre_completo}
                                                onChange={(e) => setEditForm((prev) => ({ ...prev, nombre_completo: e.target.value }))}
                                                required
                                            />
                                        </div>
                                        <div>
                                            <Label htmlFor="edit-rol">Rol *</Label>
                                            <select
                                                id="edit-rol"
                                                className="w-full px-3 py-2 border rounded-md bg-background"
                                                value={editForm.rol}
                                                onChange={(e) => setEditForm((prev) => ({ ...prev, rol: e.target.value as UserRole }))}
                                            >
                                                {ROLE_OPTIONS.map((rol) => (
                                                    <option key={rol} value={rol}>
                                                        {rol}
                                                    </option>
                                                ))}
                                            </select>
                                        </div>
                                    </div>

                                    <div className="grid md:grid-cols-2 gap-4">
                                        <div>
                                            <Label htmlFor="edit-telefono">Teléfono</Label>
                                            <Input
                                                id="edit-telefono"
                                                value={editForm.telefono}
                                                onChange={(e) => setEditForm((prev) => ({ ...prev, telefono: e.target.value }))}
                                            />
                                        </div>
                                        <div>
                                            <Label htmlFor="edit-direccion">Dirección</Label>
                                            <Input
                                                id="edit-direccion"
                                                value={editForm.direccion}
                                                onChange={(e) => setEditForm((prev) => ({ ...prev, direccion: e.target.value }))}
                                            />
                                        </div>
                                    </div>

                                    <div className="flex items-center gap-2">
                                        <input
                                            id="edit-activo"
                                            type="checkbox"
                                            checked={editForm.activo}
                                            onChange={(e) => setEditForm((prev) => ({ ...prev, activo: e.target.checked }))}
                                        />
                                        <Label htmlFor="edit-activo">Usuario activo</Label>
                                    </div>

                                    <div className="flex justify-end gap-2">
                                        <Button type="button" variant="outline" onClick={closeModal}>
                                            Cancelar
                                        </Button>
                                        <Button type="submit" disabled={savingUser}>
                                            {savingUser && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
                                            Guardar cambios
                                        </Button>
                                    </div>
                                </form>
                            )}

                            {userModal.kind === 'change-email' && (
                                <form onSubmit={onChangeEmail} className="space-y-4">
                                    <div>
                                        <Label htmlFor="change-email">Nuevo email *</Label>
                                        <Input
                                            id="change-email"
                                            type="email"
                                            value={emailForm}
                                            onChange={(e) => setEmailForm(e.target.value)}
                                            required
                                        />
                                    </div>

                                    <div className="flex justify-end gap-2">
                                        <Button type="button" variant="outline" onClick={closeModal}>
                                            Cancelar
                                        </Button>
                                        <Button type="submit" disabled={savingUser}>
                                            {savingUser && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
                                            Actualizar email
                                        </Button>
                                    </div>
                                </form>
                            )}

                            {userModal.kind === 'reset-password' && (
                                <form onSubmit={onResetPassword} className="space-y-4">
                                    <div>
                                        <Label htmlFor="reset-password">Nueva contraseña *</Label>
                                        <Input
                                            id="reset-password"
                                            type="password"
                                            value={passwordForm}
                                            onChange={(e) => setPasswordForm(e.target.value)}
                                            minLength={6}
                                            required
                                        />
                                    </div>

                                    <div className="flex justify-end gap-2">
                                        <Button type="button" variant="outline" onClick={closeModal}>
                                            Cancelar
                                        </Button>
                                        <Button type="submit" disabled={savingUser}>
                                            {savingUser && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
                                            Restablecer
                                        </Button>
                                    </div>
                                </form>
                            )}
                        </CardContent>
                    </Card>
                </div>
            )}
        </div>
    )
}
