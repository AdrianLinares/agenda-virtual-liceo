/**
 * Computes the grupo_id value for an announcement payload based on
 * the selected recipients and group targeting mode.
 *
 * Returns the selectedGroupId only when:
 * 1. The recipients include "estudiante"
 * 2. The target mode is "specific"
 * 3. A groupId is actually selected
 */
export function computeGrupoId(
  destinatarios: string[],
  targetGroupMode: 'all' | 'specific',
  selectedGroupId: string | null
): string | null {
  if (!destinatarios.includes('estudiante')) return null
  if (targetGroupMode !== 'specific') return null
  return selectedGroupId ?? null
}

/**
 * Formats the display name from a grupo query result.
 * Combines the grado nombre and grupo nombre, trimming whitespace.
 *
 * @param grupo - The grupo object from Supabase query or null
 * @returns The formatted display string, or null if grupo is null
 */
export function formatGrupoDisplayName(
  grupo: { nombre: string; grado?: { nombre: string } | null } | null
): string | null {
  if (!grupo) return null
  return `${grupo.grado?.nombre ?? ''} ${grupo.nombre}`.trim()
}