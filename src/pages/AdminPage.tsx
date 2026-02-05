import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import { useAuthStore } from '@/lib/auth-store'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Alert, AlertDescription } from '@/components/ui/alert'
import type { Database } from '@/types/database.types'

type Profile = Database['public']['Tables']['profiles']['Row']
type Grado = Database['public']['Tables']['grados']['Row']
type Asignatura = Database['public']['Tables']['asignaturas']['Row']
type Grupo = Database['public']['Tables']['grupos']['Row'] & {
    grado?: { nombre: string }
    director_grupo?: { nombre_completo: string }
}

export default function AdminPage() {
    const { profile } = useAuthStore()
    const [activeTab, setActiveTab] = useState<'usuarios' | 'grados' | 'asignaturas' | 'grupos'>('usuarios')

    // Estados para usuarios
    const [usuarios, setUsuarios] = useState<Profile[]>([])
    const [loadingUsuarios, setLoadingUsuarios] = useState(true)

    // Estados para grados
    const [grados, setGrados] = useState<Grado[]>([])
    const [loadingGrados, setLoadingGrados] = useState(false)
    const [newGrado, setNewGrado] = useState({ nombre: '', nivel: '' })

    // Estados para asignaturas
    const [asignaturas, setAsignaturas] = useState<Asignatura[]>([])
    const [loadingAsignaturas, setLoadingAsignaturas] = useState(false)
    const [newAsignatura, setNewAsignatura] = useState({ nombre: '', codigo: '', descripcion: '' })

    // Estados para grupos
    const [grupos, setGrupos] = useState<Grupo[]>([])
    const [loadingGrupos, setLoadingGrupos] = useState(false)
    const [docentes, setDocentes] = useState<Profile[]>([])
    const [newGrupo, setNewGrupo] = useState({
        grado_id: '',
        nombre: '',
        año_academico: new Date().getFullYear(),
        director_grupo_id: ''
    })

    // Estados generales
    const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null)

    // Verificar que el usuario sea administrador
    useEffect(() => {
        if (profile && profile.rol !== 'administrador') {
            setMessage({ type: 'error', text: 'No tienes permisos para acceder a esta sección' })
        }
    }, [profile])

    // Cargar usuarios
    useEffect(() => {
        loadUsuarios()
    }, [])

    // Cargar datos según la pestaña activa
    useEffect(() => {
        if (activeTab === 'grados') {
            loadGrados()
        } else if (activeTab === 'asignaturas') {
            loadAsignaturas()
        } else if (activeTab === 'grupos') {
            loadGrupos()
            loadDocentes()
            loadGrados()
        }
    }, [activeTab])

    const loadUsuarios = async () => {
        try {
            setLoadingUsuarios(true)
            const { data, error } = await supabase
                .from('profiles')
                .select('*')
                .order('nombre_completo')

            if (error) throw error
            setUsuarios((data || []) as Profile[])
        } catch (error: any) {
            setMessage({ type: 'error', text: error.message })
        } finally {
            setLoadingUsuarios(false)
        }
    }

    const loadGrados = async () => {
        try {
            setLoadingGrados(true)
            const { data, error } = await supabase
                .from('grados')
                .select('*')
                .order('nivel, nombre')

            if (error) throw error
            setGrados((data || []) as Grado[])
        } catch (error: any) {
            setMessage({ type: 'error', text: error.message })
        } finally {
            setLoadingGrados(false)
        }
    }

    const loadAsignaturas = async () => {
        try {
            setLoadingAsignaturas(true)
            const { data, error } = await supabase
                .from('asignaturas')
                .select('*')
                .order('nombre')

            if (error) throw error
            setAsignaturas((data || []) as Asignatura[])
        } catch (error: any) {
            setMessage({ type: 'error', text: error.message })
        } finally {
            setLoadingAsignaturas(false)
        }
    }

    const loadGrupos = async () => {
        try {
            setLoadingGrupos(true)
            const { data, error } = await supabase
                .from('grupos')
                .select(`
          *,
          grado:grados(nombre),
          director_grupo:profiles(nombre_completo)
        `)
                .order('año_academico', { ascending: false })
                .order('nombre')

            if (error) throw error
            setGrupos((data || []) as Grupo[])
        } catch (error: any) {
            setMessage({ type: 'error', text: error.message })
        } finally {
            setLoadingGrupos(false)
        }
    }

    const loadDocentes = async () => {
        try {
            const { data, error } = await supabase
                .from('profiles')
                .select('*')
                .eq('rol', 'docente')
                .eq('activo', true)
                .order('nombre_completo')

            if (error) throw error
            setDocentes((data || []) as Profile[])
        } catch (error: any) {
            console.error('Error cargando docentes:', error)
        }
    }

    const handleToggleUsuarioActivo = async (userId: string, currentActivo: boolean) => {
        try {
            const { error } = await (supabase as any)
                .from('profiles')
                .update({ activo: !currentActivo })
                .eq('id', userId)

            if (error) throw error
            setMessage({ type: 'success', text: 'Usuario actualizado correctamente' })
            loadUsuarios()
        } catch (error: any) {
            setMessage({ type: 'error', text: error.message })
        }
    }

    const handleCreateGrado = async (e: React.FormEvent) => {
        e.preventDefault()
        if (!newGrado.nombre || !newGrado.nivel) return

        try {
            const { error } = await (supabase as any)
                .from('grados')
                .insert([{
                    nombre: newGrado.nombre,
                    nivel: newGrado.nivel
                }])

            if (error) throw error
            setMessage({ type: 'success', text: 'Grado creado correctamente' })
            setNewGrado({ nombre: '', nivel: '' })
            loadGrados()
        } catch (error: any) {
            setMessage({ type: 'error', text: error.message })
        }
    }

    const handleDeleteGrado = async (gradoId: string) => {
        if (!confirm('¿Estás seguro de eliminar este grado? Se eliminarán todos los grupos asociados.')) return

        try {
            const { error } = await supabase
                .from('grados')
                .delete()
                .eq('id', gradoId)

            if (error) throw error
            setMessage({ type: 'success', text: 'Grado eliminado correctamente' })
            loadGrados()
        } catch (error: any) {
            setMessage({ type: 'error', text: error.message })
        }
    }

    const handleCreateAsignatura = async (e: React.FormEvent) => {
        e.preventDefault()
        if (!newAsignatura.nombre) return

        try {
            const { error } = await (supabase as any)
                .from('asignaturas')
                .insert([{
                    nombre: newAsignatura.nombre,
                    codigo: newAsignatura.codigo || null,
                    descripcion: newAsignatura.descripcion || null
                }])

            if (error) throw error
            setMessage({ type: 'success', text: 'Asignatura creada correctamente' })
            setNewAsignatura({ nombre: '', codigo: '', descripcion: '' })
            loadAsignaturas()
        } catch (error: any) {
            setMessage({ type: 'error', text: error.message })
        }
    }

    const handleDeleteAsignatura = async (asignaturaId: string) => {
        if (!confirm('¿Estás seguro de eliminar esta asignatura?')) return

        try {
            const { error } = await supabase
                .from('asignaturas')
                .delete()
                .eq('id', asignaturaId)

            if (error) throw error
            setMessage({ type: 'success', text: 'Asignatura eliminada correctamente' })
            loadAsignaturas()
        } catch (error: any) {
            setMessage({ type: 'error', text: error.message })
        }
    }

    const handleCreateGrupo = async (e: React.FormEvent) => {
        e.preventDefault()
        if (!newGrupo.grado_id || !newGrupo.nombre) return

        try {
            const { error } = await (supabase as any)
                .from('grupos')
                .insert([{
                    grado_id: newGrupo.grado_id,
                    nombre: newGrupo.nombre,
                    año_academico: newGrupo.año_academico,
                    director_grupo_id: newGrupo.director_grupo_id || null
                }])

            if (error) throw error
            setMessage({ type: 'success', text: 'Grupo creado correctamente' })
            setNewGrupo({
                grado_id: '',
                nombre: '',
                año_academico: new Date().getFullYear(),
                director_grupo_id: ''
            })
            loadGrupos()
        } catch (error: any) {
            setMessage({ type: 'error', text: error.message })
        }
    }

    const handleDeleteGrupo = async (grupoId: string) => {
        if (!confirm('¿Estás seguro de eliminar este grupo?')) return

        try {
            const { error } = await supabase
                .from('grupos')
                .delete()
                .eq('id', grupoId)

            if (error) throw error
            setMessage({ type: 'success', text: 'Grupo eliminado correctamente' })
            loadGrupos()
        } catch (error: any) {
            setMessage({ type: 'error', text: error.message })
        }
    }

    if (profile?.rol !== 'administrador') {
        return (
            <div className="p-6">
                <Alert variant="destructive">
                    <AlertDescription>
                        No tienes permisos para acceder a esta sección. Solo los administradores pueden editar la configuración del sitio.
                    </AlertDescription>
                </Alert>
            </div>
        )
    }

    return (
        <div className="p-6 max-w-7xl mx-auto">
            <div className="mb-6">
                <h1 className="text-3xl font-bold mb-2">Panel de Administración</h1>
                <p className="text-gray-600">Gestiona usuarios, grados, asignaturas y grupos del sistema</p>
            </div>

            {message && (
                <Alert variant={message.type === 'error' ? 'destructive' : 'default'} className="mb-6">
                    <AlertDescription>{message.text}</AlertDescription>
                </Alert>
            )}

            {/* Tabs Navigation */}
            <div className="flex gap-2 mb-6 border-b">
                <button
                    onClick={() => setActiveTab('usuarios')}
                    className={`px-4 py-2 font-medium transition-colors ${activeTab === 'usuarios'
                            ? 'border-b-2 border-blue-600 text-blue-600'
                            : 'text-gray-600 hover:text-gray-900'
                        }`}
                >
                    Usuarios
                </button>
                <button
                    onClick={() => setActiveTab('grados')}
                    className={`px-4 py-2 font-medium transition-colors ${activeTab === 'grados'
                            ? 'border-b-2 border-blue-600 text-blue-600'
                            : 'text-gray-600 hover:text-gray-900'
                        }`}
                >
                    Grados
                </button>
                <button
                    onClick={() => setActiveTab('asignaturas')}
                    className={`px-4 py-2 font-medium transition-colors ${activeTab === 'asignaturas'
                            ? 'border-b-2 border-blue-600 text-blue-600'
                            : 'text-gray-600 hover:text-gray-900'
                        }`}
                >
                    Asignaturas
                </button>
                <button
                    onClick={() => setActiveTab('grupos')}
                    className={`px-4 py-2 font-medium transition-colors ${activeTab === 'grupos'
                            ? 'border-b-2 border-blue-600 text-blue-600'
                            : 'text-gray-600 hover:text-gray-900'
                        }`}
                >
                    Grupos
                </button>
            </div>

            {/* Usuarios Tab */}
            {activeTab === 'usuarios' && (
                <Card>
                    <CardHeader>
                        <CardTitle>Gestión de Usuarios</CardTitle>
                        <CardDescription>Administra los usuarios del sistema</CardDescription>
                    </CardHeader>
                    <CardContent>
                        {loadingUsuarios ? (
                            <div className="text-center py-8">
                                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
                            </div>
                        ) : (
                            <div className="overflow-x-auto">
                                <table className="w-full">
                                    <thead className="bg-gray-50">
                                        <tr>
                                            <th className="px-4 py-3 text-left text-sm font-medium text-gray-700">Nombre</th>
                                            <th className="px-4 py-3 text-left text-sm font-medium text-gray-700">Email</th>
                                            <th className="px-4 py-3 text-left text-sm font-medium text-gray-700">Rol</th>
                                            <th className="px-4 py-3 text-left text-sm font-medium text-gray-700">Estado</th>
                                            <th className="px-4 py-3 text-left text-sm font-medium text-gray-700">Acciones</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-gray-200">
                                        {usuarios.map((usuario) => (
                                            <tr key={usuario.id} className="hover:bg-gray-50">
                                                <td className="px-4 py-3 text-sm">{usuario.nombre_completo}</td>
                                                <td className="px-4 py-3 text-sm">{usuario.email}</td>
                                                <td className="px-4 py-3 text-sm">
                                                    <span className="px-2 py-1 bg-blue-100 text-blue-800 rounded-full text-xs">
                                                        {usuario.rol}
                                                    </span>
                                                </td>
                                                <td className="px-4 py-3 text-sm">
                                                    <span
                                                        className={`px-2 py-1 rounded-full text-xs ${usuario.activo
                                                                ? 'bg-green-100 text-green-800'
                                                                : 'bg-red-100 text-red-800'
                                                            }`}
                                                    >
                                                        {usuario.activo ? 'Activo' : 'Inactivo'}
                                                    </span>
                                                </td>
                                                <td className="px-4 py-3 text-sm">
                                                    <Button
                                                        variant="outline"
                                                        size="sm"
                                                        onClick={() => handleToggleUsuarioActivo(usuario.id, usuario.activo)}
                                                    >
                                                        {usuario.activo ? 'Desactivar' : 'Activar'}
                                                    </Button>
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        )}
                    </CardContent>
                </Card>
            )}

            {/* Grados Tab */}
            {activeTab === 'grados' && (
                <div className="grid gap-6 md:grid-cols-2">
                    <Card>
                        <CardHeader>
                            <CardTitle>Crear Nuevo Grado</CardTitle>
                            <CardDescription>Agrega un nuevo grado académico</CardDescription>
                        </CardHeader>
                        <CardContent>
                            <form onSubmit={handleCreateGrado} className="space-y-4">
                                <div>
                                    <Label htmlFor="grado-nombre">Nombre del Grado *</Label>
                                    <Input
                                        id="grado-nombre"
                                        placeholder="Ej: 1°, 2°, 3°"
                                        value={newGrado.nombre}
                                        onChange={(e) => setNewGrado({ ...newGrado, nombre: e.target.value })}
                                        required
                                    />
                                </div>
                                <div>
                                    <Label htmlFor="grado-nivel">Nivel *</Label>
                                    <Input
                                        id="grado-nivel"
                                        placeholder="Ej: Primaria, Secundaria"
                                        value={newGrado.nivel}
                                        onChange={(e) => setNewGrado({ ...newGrado, nivel: e.target.value })}
                                        required
                                    />
                                </div>
                                <Button type="submit" className="w-full">Crear Grado</Button>
                            </form>
                        </CardContent>
                    </Card>

                    <Card>
                        <CardHeader>
                            <CardTitle>Grados Existentes</CardTitle>
                            <CardDescription>Lista de grados académicos</CardDescription>
                        </CardHeader>
                        <CardContent>
                            {loadingGrados ? (
                                <div className="text-center py-8">
                                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
                                </div>
                            ) : (
                                <div className="space-y-2">
                                    {grados.length === 0 ? (
                                        <p className="text-gray-500 text-center py-4">No hay grados registrados</p>
                                    ) : (
                                        grados.map((grado) => (
                                            <div
                                                key={grado.id}
                                                className="flex justify-between items-center p-3 border rounded-lg hover:bg-gray-50"
                                            >
                                                <div>
                                                    <p className="font-medium">{grado.nombre}</p>
                                                    <p className="text-sm text-gray-600">{grado.nivel}</p>
                                                </div>
                                                <Button
                                                    variant="destructive"
                                                    size="sm"
                                                    onClick={() => handleDeleteGrado(grado.id)}
                                                >
                                                    Eliminar
                                                </Button>
                                            </div>
                                        ))
                                    )}
                                </div>
                            )}
                        </CardContent>
                    </Card>
                </div>
            )}

            {/* Asignaturas Tab */}
            {activeTab === 'asignaturas' && (
                <div className="grid gap-6 md:grid-cols-2">
                    <Card>
                        <CardHeader>
                            <CardTitle>Crear Nueva Asignatura</CardTitle>
                            <CardDescription>Agrega una nueva asignatura al sistema</CardDescription>
                        </CardHeader>
                        <CardContent>
                            <form onSubmit={handleCreateAsignatura} className="space-y-4">
                                <div>
                                    <Label htmlFor="asignatura-nombre">Nombre de la Asignatura *</Label>
                                    <Input
                                        id="asignatura-nombre"
                                        placeholder="Ej: Matemáticas, Español"
                                        value={newAsignatura.nombre}
                                        onChange={(e) => setNewAsignatura({ ...newAsignatura, nombre: e.target.value })}
                                        required
                                    />
                                </div>
                                <div>
                                    <Label htmlFor="asignatura-codigo">Código</Label>
                                    <Input
                                        id="asignatura-codigo"
                                        placeholder="Ej: MAT01"
                                        value={newAsignatura.codigo}
                                        onChange={(e) => setNewAsignatura({ ...newAsignatura, codigo: e.target.value })}
                                    />
                                </div>
                                <div>
                                    <Label htmlFor="asignatura-descripcion">Descripción</Label>
                                    <Input
                                        id="asignatura-descripcion"
                                        placeholder="Descripción breve"
                                        value={newAsignatura.descripcion}
                                        onChange={(e) => setNewAsignatura({ ...newAsignatura, descripcion: e.target.value })}
                                    />
                                </div>
                                <Button type="submit" className="w-full">Crear Asignatura</Button>
                            </form>
                        </CardContent>
                    </Card>

                    <Card>
                        <CardHeader>
                            <CardTitle>Asignaturas Existentes</CardTitle>
                            <CardDescription>Lista de asignaturas del sistema</CardDescription>
                        </CardHeader>
                        <CardContent>
                            {loadingAsignaturas ? (
                                <div className="text-center py-8">
                                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
                                </div>
                            ) : (
                                <div className="space-y-2">
                                    {asignaturas.length === 0 ? (
                                        <p className="text-gray-500 text-center py-4">No hay asignaturas registradas</p>
                                    ) : (
                                        asignaturas.map((asignatura) => (
                                            <div
                                                key={asignatura.id}
                                                className="flex justify-between items-center p-3 border rounded-lg hover:bg-gray-50"
                                            >
                                                <div>
                                                    <p className="font-medium">{asignatura.nombre}</p>
                                                    {asignatura.codigo && (
                                                        <p className="text-sm text-gray-600">Código: {asignatura.codigo}</p>
                                                    )}
                                                </div>
                                                <Button
                                                    variant="destructive"
                                                    size="sm"
                                                    onClick={() => handleDeleteAsignatura(asignatura.id)}
                                                >
                                                    Eliminar
                                                </Button>
                                            </div>
                                        ))
                                    )}
                                </div>
                            )}
                        </CardContent>
                    </Card>
                </div>
            )}

            {/* Grupos Tab */}
            {activeTab === 'grupos' && (
                <div className="grid gap-6 md:grid-cols-2">
                    <Card>
                        <CardHeader>
                            <CardTitle>Crear Nuevo Grupo</CardTitle>
                            <CardDescription>Agrega un nuevo grupo al sistema</CardDescription>
                        </CardHeader>
                        <CardContent>
                            <form onSubmit={handleCreateGrupo} className="space-y-4">
                                <div>
                                    <Label htmlFor="grupo-grado">Grado *</Label>
                                    <select
                                        id="grupo-grado"
                                        className="w-full px-3 py-2 border border-gray-300 rounded-md"
                                        value={newGrupo.grado_id}
                                        onChange={(e) => setNewGrupo({ ...newGrupo, grado_id: e.target.value })}
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
                                    <Label htmlFor="grupo-nombre">Nombre del Grupo *</Label>
                                    <Input
                                        id="grupo-nombre"
                                        placeholder="Ej: A, B, C"
                                        value={newGrupo.nombre}
                                        onChange={(e) => setNewGrupo({ ...newGrupo, nombre: e.target.value })}
                                        required
                                    />
                                </div>
                                <div>
                                    <Label htmlFor="grupo-año">Año Académico *</Label>
                                    <Input
                                        id="grupo-año"
                                        type="number"
                                        value={newGrupo.año_academico}
                                        onChange={(e) => setNewGrupo({ ...newGrupo, año_academico: parseInt(e.target.value) })}
                                        required
                                    />
                                </div>
                                <div>
                                    <Label htmlFor="grupo-director">Director de Grupo</Label>
                                    <select
                                        id="grupo-director"
                                        className="w-full px-3 py-2 border border-gray-300 rounded-md"
                                        value={newGrupo.director_grupo_id}
                                        onChange={(e) => setNewGrupo({ ...newGrupo, director_grupo_id: e.target.value })}
                                    >
                                        <option value="">Sin asignar</option>
                                        {docentes.map((docente) => (
                                            <option key={docente.id} value={docente.id}>
                                                {docente.nombre_completo}
                                            </option>
                                        ))}
                                    </select>
                                </div>
                                <Button type="submit" className="w-full">Crear Grupo</Button>
                            </form>
                        </CardContent>
                    </Card>

                    <Card>
                        <CardHeader>
                            <CardTitle>Grupos Existentes</CardTitle>
                            <CardDescription>Lista de grupos del sistema</CardDescription>
                        </CardHeader>
                        <CardContent>
                            {loadingGrupos ? (
                                <div className="text-center py-8">
                                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
                                </div>
                            ) : (
                                <div className="space-y-2">
                                    {grupos.length === 0 ? (
                                        <p className="text-gray-500 text-center py-4">No hay grupos registrados</p>
                                    ) : (
                                        grupos.map((grupo) => (
                                            <div
                                                key={grupo.id}
                                                className="flex justify-between items-center p-3 border rounded-lg hover:bg-gray-50"
                                            >
                                                <div>
                                                    <p className="font-medium">
                                                        {grupo.grado?.nombre} - Grupo {grupo.nombre}
                                                    </p>
                                                    <p className="text-sm text-gray-600">Año: {grupo.año_academico}</p>
                                                    {grupo.director_grupo && (
                                                        <p className="text-sm text-gray-600">
                                                            Director: {grupo.director_grupo.nombre_completo}
                                                        </p>
                                                    )}
                                                </div>
                                                <Button
                                                    variant="destructive"
                                                    size="sm"
                                                    onClick={() => handleDeleteGrupo(grupo.id)}
                                                >
                                                    Eliminar
                                                </Button>
                                            </div>
                                        ))
                                    )}
                                </div>
                            )}
                        </CardContent>
                    </Card>
                </div>
            )}
        </div>
    )
}
