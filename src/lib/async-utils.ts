export const DEFAULT_REQUEST_TIMEOUT_MS = 15000

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
