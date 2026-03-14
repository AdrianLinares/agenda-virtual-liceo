export const DEFAULT_REQUEST_TIMEOUT_MS = 15000

export function isTransientConnectionError(error: unknown): boolean {
    if (!(error instanceof Error)) {
        return false
    }

    const message = error.message.toLowerCase()

    return (
        message.includes('timeout') ||
        message.includes('tiempo de espera') ||
        message.includes('network') ||
        message.includes('fetch') ||
        message.includes('failed to fetch') ||
        message.includes('connection') ||
        message.includes('conexión')
    )
}

export async function withTimeout<T>(
    promise: PromiseLike<T> | Promise<T>,
    timeoutMs: number = DEFAULT_REQUEST_TIMEOUT_MS,
    timeoutMessage = 'La operación tardó demasiado. Verifica tu conexión e inténtalo de nuevo.'
): Promise<T> {
    let timeoutHandle: ReturnType<typeof setTimeout> | null = null

    const timeoutPromise = new Promise<never>((_, reject) => {
        timeoutHandle = setTimeout(() => {
            reject(new Error(timeoutMessage))
        }, timeoutMs)
    })

    try {
        return await Promise.race([promise, timeoutPromise])
    } finally {
        if (timeoutHandle) {
            clearTimeout(timeoutHandle)
        }
    }
}

export async function withRetry<T>(
    task: () => Promise<T>,
    maxAttempts = 2,
    delayMs = 400,
    shouldRetry: (error: unknown) => boolean = isTransientConnectionError
): Promise<T> {
    let lastError: unknown

    for (let attempt = 1; attempt <= maxAttempts; attempt += 1) {
        try {
            return await task()
        } catch (error) {
            lastError = error

            if (attempt >= maxAttempts || !shouldRetry(error)) {
                throw error
            }

            await new Promise((resolve) => setTimeout(resolve, delayMs * attempt))
        }
    }

    throw lastError instanceof Error ? lastError : new Error('No se pudo completar la operación')
}
