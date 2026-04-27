export const getAuthResumeStrategy = () => {
  return import.meta.env.VITE_AUTH_RESUME_STRATEGY || 'stable'
}

export const getAuthHydrateWindowMs = () => {
  return Number(import.meta.env.VITE_AUTH_HYDRATE_WINDOW_MS) || 800
}