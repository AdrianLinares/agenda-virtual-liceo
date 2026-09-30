export const SIGNATURE_ROLES = ['docente', 'administrativo', 'administrador'] as const

export type SignatureRole = (typeof SIGNATURE_ROLES)[number]

export type SignatureProfile = {
    nombre_completo: string | null
    titulo_profesional?: string | null
    rol: string | null
}

/**
 * Colapsa espacios y saltos de linea para que la firma ocupe exactamente dos lineas.
 */
function normalizeSignatureLine(value: string): string {
    return value.replace(/\s+/g, ' ').trim()
}

/**
 * Compone la firma institucional a partir del perfil del remitente.
 * Devuelve null si el remitente no corresponde a un rol con firma o no tiene nombre.
 */
export function buildMessageSignature(
    profile: SignatureProfile | null | undefined
): string | null {
    if (!profile) return null

    const role = profile.rol as SignatureRole | null
    if (!role || !SIGNATURE_ROLES.includes(role)) return null

    const nombre = profile.nombre_completo
        ? normalizeSignatureLine(profile.nombre_completo)
        : ''
    if (!nombre) return null

    const titulo = profile.titulo_profesional
        ? normalizeSignatureLine(profile.titulo_profesional)
        : ''

    return titulo ? `${nombre}\n${titulo}` : nombre
}
