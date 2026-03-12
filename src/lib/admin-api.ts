import { supabase } from '@/lib/supabase'

export type CreateUserPayload = {
    email: string
    password: string
    nombre_completo: string
    rol: 'administrador' | 'administrativo' | 'docente' | 'estudiante' | 'padre'
    telefono?: string
    direccion?: string
}

export type BatchCreateUserPayload = {
    email: string
    password?: string
    nombre_completo: string
    rol: 'administrador' | 'administrativo' | 'docente' | 'estudiante' | 'padre'
    telefono?: string
    direccion?: string
}

export type BatchCreateUsersResponse = {
    message: string
    createdCount: number
    errorCount: number
    total: number
    results: Array<{
        index: number
        email: string | null
        status: 'created' | 'error'
        userId?: string
        message?: string
    }>
}

type EdgeError = {
    error?: string
    message?: string
}

type EdgeInvokeErrorLike = {
    message?: string
    context?: {
        clone?: () => {
            json?: () => Promise<unknown>
            text?: () => Promise<string>
        }
        json?: () => Promise<unknown>
        text?: () => Promise<string>
        status?: number
        statusText?: string
    }
}

function parseInvokeError(error: unknown, data: unknown, fallback: string, extra?: { status?: number; action?: string }) {
    const functionMessage =
        typeof data === 'object' && data !== null && 'error' in data
            ? String((data as EdgeError).error)
            : typeof data === 'object' && data !== null && 'message' in data
                ? String((data as EdgeError).message)
                : null

    if (functionMessage) {
        return functionMessage
    }

    const statusPrefix = extra?.status ? `HTTP ${extra.status}: ` : ''
    const actionSuffix = extra?.action ? ` (action: ${extra.action})` : ''

    if (error && typeof error === 'object' && 'message' in error) {
        const raw = String((error as { message?: string }).message ?? fallback)
        if (raw.includes('non-2xx status code')) {
            return `${statusPrefix}${fallback}${actionSuffix}`.trim()
        }
        return raw
    }

    return `${statusPrefix}${fallback}${actionSuffix}`.trim()
}

async function tryReadErrorBody(error: unknown) {
    const maybeError = error as EdgeInvokeErrorLike | null
    const context = maybeError?.context

    if (!context) return null

    const cloned = typeof context.clone === 'function' ? context.clone() : null
    const reader = cloned ?? context

    if (typeof reader.json === 'function') {
        try {
            return await reader.json()
        } catch {
            // ignore and try text fallback
        }
    }

    if (typeof reader.text === 'function') {
        try {
            const text = await reader.text()
            if (!text) return null
            try {
                return JSON.parse(text)
            } catch {
                return { error: text }
            }
        } catch {
            return null
        }
    }

    return null
}

async function invokeManageUsers<TPayload extends Record<string, unknown>, TResponse>(payload: TPayload) {
    const { data, error } = await supabase.functions.invoke<TResponse>('manage-users', {
        body: payload
    })

    if (error) {
        const invokeError = error as EdgeInvokeErrorLike
        const status = invokeError?.context?.status
        const action =
            typeof payload.action === 'string'
                ? payload.action
                : undefined
        const errorBody = await tryReadErrorBody(error)
        const message = parseInvokeError(error, errorBody ?? data, 'No se pudo completar la operación administrativa', {
            status,
            action
        })
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

export async function adminCreateUsersBatch(users: BatchCreateUserPayload[], defaultPassword?: string) {
    return invokeManageUsers<
        { action: 'create-batch'; users: BatchCreateUserPayload[]; defaultPassword?: string },
        BatchCreateUsersResponse
    >({
        action: 'create-batch',
        users,
        defaultPassword
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
