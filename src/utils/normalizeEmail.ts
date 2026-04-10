export function normalizeEmail(s?: string): string {
  // Always return a string (empty string when input is missing or whitespace-only)
  return (s ?? '').trim().toLowerCase()
}
