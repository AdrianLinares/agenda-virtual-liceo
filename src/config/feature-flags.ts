/**
 * Feature flags for auth and app behavior.
 * These can be overridden via environment variables.
 */

/**
 * Gets the auth resume strategy.
 * - 'stable': Sync session on visibility change (default)
 * - Other values may disable resume behavior
 * Rollback: Set to falsy value to disable resume syncing.
 */
export const getAuthResumeStrategy = () => {
  return import.meta.env.VITE_AUTH_RESUME_STRATEGY || 'stable'
}

/**
 * Gets the auth hydrate window in milliseconds.
 * Used to debounce auth state changes during login autofill/hydration.
 * Rollback: Increase value or set to 0 to disable debouncing.
 */
export const getAuthHydrateWindowMs = () => {
  return Number(import.meta.env.VITE_AUTH_HYDRATE_WINDOW_MS) || 800
}