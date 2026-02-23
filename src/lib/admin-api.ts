import { supabase } from '@/lib/supabase'

export type CreateUserPayload = {
    email: string
    password: string
    nombre_completo: string
    rol: 'administrador' | 'administrativo' | 'docente' | 'estudiante' | 'padre'
    telefono?: string
    direccion?: string
}

type EdgeError = {
    error?: string
    message?: string
}

function parseInvokeError(error: unknown, data: unknown, fallback: string) {
    const functionMessage =
        typeof data === 'object' && data !== null && 'error' in data
            ? String((data as EdgeError).error)
            : typeof data === 'object' && data !== null && 'message' in data
                ? String((data as EdgeError).message)
                : null

    if (functionMessage) {
        return functionMessage
    }

    if (error && typeof error === 'object' && 'message' in error) {
        return String((error as { message?: string }).message ?? fallback)
    }

    return fallback
}

async function invokeManageUsers<TPayload extends Record<string, unknown>, TResponse>(payload: TPayload) {
    const { data, error } = await supabase.functions.invoke<TResponse>('manage-users', {
        body: payload
    })

    if (error) {
        const message = parseInvokeError(error, data, 'No se pudo completar la operación administrativa')
        throw new Error(message)
    }

    if (data && typeof data === 'object' && 'error' in (data as Record<string, unknown>)) {
        const message = parseInvokeError(error, data, 'No se pudo completar la operación administrativa')
        throw new Error(message)
    }

    return data
}

export async function adminCreateUser(payload: CreateUserPayload) {
    return invokeManageUsers<CreateUserPayload & { action: 'create' }, { message: string; userId: string }>({
        action: 'create',
        ...payload
    })
}

export async function adminDeleteUser(userId: string) {
    return invokeManageUsers<{ action: 'delete'; userId: string }, { message: string; userId: string }>({
        action: 'delete',
        userId
    })
}

export async function adminUpdateEmail(userId: string, email: string) {
    return invokeManageUsers<
        { action: 'update-email'; userId: string; email: string },
        { message: string; userId: string; email: string }
    >({
        action: 'update-email',
        userId,
        email
    })
}

export async function adminResetPassword(userId: string, password: string) {
    return invokeManageUsers<
        { action: 'reset-password'; userId: string; password: string },
        { message: string; userId: string }
    >({
        action: 'reset-password',
        userId,
        password
    })
}
