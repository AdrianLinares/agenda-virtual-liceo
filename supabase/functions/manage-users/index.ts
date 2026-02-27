import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3'

type UserRole = 'administrador' | 'administrativo' | 'docente' | 'estudiante' | 'padre'

type CreatePayload = {
    action: 'create'
    email: string
    password: string
    nombre_completo: string
    rol: UserRole
    telefono?: string
    direccion?: string
}

type DeletePayload = {
    action: 'delete'
    userId: string
}

type UpdateEmailPayload = {
    action: 'update-email'
    userId: string
    email: string
}

type ResetPasswordPayload = {
    action: 'reset-password'
    userId: string
    password: string
}

type RequestPayload = CreatePayload | DeletePayload | UpdateEmailPayload | ResetPasswordPayload

type ProfileRow = {
    id: string
    email: string
    nombre_completo: string
    rol: UserRole
    telefono: string | null
    direccion: string | null
    activo: boolean
}

const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
    'Access-Control-Allow-Methods': 'POST, OPTIONS'
}

function jsonResponse(body: Record<string, unknown>, status = 200) {
    return new Response(JSON.stringify(body), {
        status,
        headers: {
            ...corsHeaders,
            'Content-Type': 'application/json'
        }
    })
}

function getBearerToken(authHeader: string | null) {
    if (!authHeader) return null
    const [scheme, token] = authHeader.split(' ')
    if (scheme?.toLowerCase() !== 'bearer' || !token) return null
    return token
}

function decodeJWT(token: string): { sub?: string;[key: string]: unknown } | null {
    try {
        const parts = token.split('.')
        if (parts.length !== 3) return null
        const payload = parts[1]
        const decoded = atob(payload)
        return JSON.parse(decoded)
    } catch {
        return null
    }
}

Deno.serve(async (req) => {
    if (req.method === 'OPTIONS') {
        return new Response('ok', { headers: corsHeaders })
    }

    if (req.method !== 'POST') {
        return jsonResponse({ error: 'Método no permitido' }, 405)
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')
    const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? Deno.env.get('SERVICE_ROLE_KEY')

    if (!supabaseUrl || !serviceRoleKey) {
        return jsonResponse({ error: 'Configuración de Supabase incompleta en el servidor' }, 500)
    }

    const authHeader = req.headers.get('Authorization')
    const jwt = getBearerToken(authHeader)

    if (!jwt) {
        return jsonResponse({ error: 'No autenticado' }, 401)
    }

    const jwtPayload = decodeJWT(jwt)
    if (!jwtPayload?.sub) {
        return jsonResponse({ error: 'JWT inválido' }, 401)
    }

    const adminClient = createClient(supabaseUrl, serviceRoleKey)

    const { data: callerProfile, error: callerProfileError } = await adminClient
        .from('profiles')
        .select('id, rol')
        .eq('id', jwtPayload.sub)
        .single<{ id: string; rol: UserRole }>()

    if (callerProfileError || !callerProfile) {
        return jsonResponse({ error: 'No se pudo verificar el perfil del usuario' }, 403)
    }

    if (callerProfile.rol !== 'administrador') {
        return jsonResponse({ error: 'No autorizado' }, 403)
    }

    let payload: RequestPayload
    try {
        payload = (await req.json()) as RequestPayload
    } catch {
        return jsonResponse({ error: 'JSON inválido' }, 400)
    }

    if (!payload?.action) {
        return jsonResponse({ error: 'Falta el campo action' }, 400)
    }

    try {
        if (payload.action === 'create') {
            const { email, password, nombre_completo, rol, telefono, direccion } = payload

            if (!email || !password || !nombre_completo || !rol) {
                return jsonResponse({ error: 'Faltan campos obligatorios para crear usuario' }, 400)
            }

            if (password.length < 6) {
                return jsonResponse({ error: 'La contraseña debe tener al menos 6 caracteres' }, 400)
            }

            const { data: createdUserData, error: createUserError } = await adminClient.auth.admin.createUser({
                email,
                password,
                email_confirm: true
            })

            if (createUserError || !createdUserData.user) {
                return jsonResponse({ error: createUserError?.message ?? 'No se pudo crear el usuario' }, 400)
            }

            const newProfile = {
                id: createdUserData.user.id,
                email,
                nombre_completo,
                rol,
                telefono: telefono ?? null,
                direccion: direccion ?? null,
                activo: true
            }

            const { data: upsertedProfile, error: upsertError } = await adminClient
                .from('profiles')
                .upsert(newProfile)
                .select('id, email, nombre_completo, rol, telefono, direccion, activo')
                .single<ProfileRow>()

            if (upsertError) {
                await adminClient.auth.admin.deleteUser(createdUserData.user.id)
                return jsonResponse({ error: upsertError.message }, 400)
            }

            return jsonResponse(
                {
                    message: 'Usuario creado correctamente',
                    userId: createdUserData.user.id,
                    profile: upsertedProfile
                },
                201
            )
        }

        if (payload.action === 'delete') {
            const { userId } = payload

            if (!userId) {
                return jsonResponse({ error: 'Falta userId' }, 400)
            }

            if (userId === callerProfile.id) {
                return jsonResponse({ error: 'No puedes eliminar tu propio usuario' }, 400)
            }

            const cleanupUpdates: Array<Promise<{ error: { message: string } | null }>> = [
                adminClient.from('grupos').update({ director_grupo_id: null }).eq('director_grupo_id', userId),
                adminClient.from('notas').update({ docente_id: null }).eq('docente_id', userId),
                adminClient.from('boletines').update({ generado_por: null }).eq('generado_por', userId),
                adminClient.from('asistencias').update({ registrado_por: null }).eq('registrado_por', userId),
                adminClient.from('horarios').update({ docente_id: null }).eq('docente_id', userId),
                adminClient.from('permisos').update({ solicitado_por: null }).eq('solicitado_por', userId),
                adminClient.from('permisos').update({ revisado_por: null }).eq('revisado_por', userId),
                adminClient.from('seguimientos').update({ registrado_por: null }).eq('registrado_por', userId),
                adminClient.from('citaciones').update({ creado_por: null }).eq('creado_por', userId)
            ]

            const cleanupResults = await Promise.all(cleanupUpdates)
            const cleanupError = cleanupResults.find((result) => result.error)
            if (cleanupError?.error) {
                return jsonResponse({ error: cleanupError.error.message }, 400)
            }

            const { error: deleteAuthUserError } = await adminClient.auth.admin.deleteUser(userId)
            if (deleteAuthUserError) {
                return jsonResponse({ error: deleteAuthUserError.message }, 400)
            }

            return jsonResponse({ message: 'Usuario eliminado correctamente', userId })
        }

        if (payload.action === 'update-email') {
            const { userId, email } = payload

            if (!userId || !email) {
                return jsonResponse({ error: 'Faltan userId o email' }, 400)
            }

            const { error: updateAuthEmailError } = await adminClient.auth.admin.updateUserById(userId, { email })
            if (updateAuthEmailError) {
                return jsonResponse({ error: updateAuthEmailError.message }, 400)
            }

            const { error: updateProfileEmailError } = await adminClient
                .from('profiles')
                .update({ email })
                .eq('id', userId)

            if (updateProfileEmailError) {
                return jsonResponse({ error: updateProfileEmailError.message }, 400)
            }

            return jsonResponse({ message: 'Correo actualizado correctamente', userId, email })
        }

        if (payload.action === 'reset-password') {
            const { userId, password } = payload

            if (!userId || !password) {
                return jsonResponse({ error: 'Faltan userId o password' }, 400)
            }

            if (password.length < 6) {
                return jsonResponse({ error: 'La contraseña debe tener al menos 6 caracteres' }, 400)
            }

            const { error: updatePasswordError } = await adminClient.auth.admin.updateUserById(userId, {
                password
            })

            if (updatePasswordError) {
                return jsonResponse({ error: updatePasswordError.message }, 400)
            }

            return jsonResponse({ message: 'Contraseña restablecida correctamente', userId })
        }

        return jsonResponse({ error: 'Acción no soportada' }, 400)
    } catch (error) {
        const message = error instanceof Error ? error.message : 'Error interno del servidor'
        return jsonResponse({ error: message }, 500)
    }
})
