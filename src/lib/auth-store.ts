import { create } from 'zustand'
import { User } from '@supabase/supabase-js'
import { supabase } from '@/lib/supabase'
import { withRetry, withTimeout } from '@/lib/async-utils'
import { normalizeEmail } from '@/utils/normalizeEmail'
import type { Database } from '@/types/database.types'

type Profile = Database['public']['Tables']['profiles']['Row']

let isInitializingAuth = false
let hasAuthStateListener = false
let isSyncingSession = false
let initializePromise: Promise<void> | null = null

const AUTH_TIMEOUT_MS = 25000
const AUTH_RETRY_ATTEMPTS = 2
const AUTH_RETRY_DELAY_MS = 700

// Helper detectors for auth error messages. Keep these conservative and
// focused on common English/Spanish fragments returned by Supabase.
function normalizeMessage(input: unknown) {
  return String(input ?? '').toLowerCase()
}

function isAuthSessionMissingMessage(msg: unknown) {
  const m = normalizeMessage(msg)
  return (
    m.includes('auth session missing') ||
    m.includes('session missing') ||
    m.includes('session expired') ||
    (m.includes('recovery') && m.includes('session')) ||
    m.includes('invalid or expired') ||
    m.includes('invalid link')
  )
}

function isTransientNetworkError(msg: unknown) {
  const m = normalizeMessage(msg)
  return /timeout|tiempo de espera|network|fetch|temporar/.test(m)
}

function isSamePasswordMessage(msg: unknown) {
  const m = normalizeMessage(msg)
  return /same(\s+as)?|cannot.*same|different.*(old|actual)|igual|mismo/.test(m)
}

interface AuthState {
  user: User | null
  profile: Profile | null
  loading: boolean
  initialized: boolean
  resumeVersion: number
  setUser: (user: User | null) => void
  setProfile: (profile: Profile | null) => void
  setLoading: (loading: boolean) => void
  markAppResumed: () => void
  signIn: (email: string, password: string) => Promise<void>
  changePassword: (currentPassword: string, newPassword: string) => Promise<void>
  requestPasswordReset: (email: string, redirectTo: string) => Promise<void>
  updatePasswordWithRecovery: (newPassword: string) => Promise<void>
  signOut: () => Promise<void>
  initialize: () => Promise<void>
  syncSession: (reason?: 'visibilitychange' | 'online' | 'manual') => Promise<void>
}

export const useAuthStore = create<AuthState>((set, get) => ({
  user: null,
  profile: null,
  loading: true,
  initialized: false,
  resumeVersion: 0,

  setUser: (user) => set({ user }),
  setProfile: (profile) => set({ profile }),
  setLoading: (loading) => set({ loading }),
  markAppResumed: () => set((state) => ({ resumeVersion: state.resumeVersion + 1 })),

  signIn: async (email: string, password: string) => {
    try {
      set({ loading: true })
      const normalizedEmail = normalizeEmail(email)

      if (!normalizedEmail) {
        throw new Error('Debes ingresar un correo electrónico válido')
      }

      const { data, error } = await withRetry(
        () => withTimeout(
          supabase.auth.signInWithPassword({
            email: normalizedEmail,
            password,
          }),
          AUTH_TIMEOUT_MS,
          'Tiempo de espera agotado al iniciar sesión'
        ),
        AUTH_RETRY_ATTEMPTS,
        AUTH_RETRY_DELAY_MS
      )

      if (error) {
        const errorMessage = error.message || 'Error desconocido al iniciar sesión'
        console.error('Error signing in:', error)
        throw new Error(errorMessage)
      }

      if (data.user) {
        // Obtener el perfil del usuario
        const { data: profileData, error: profileError } = await withRetry(
          () => withTimeout(
            supabase
              .from('profiles')
              .select('*')
              .eq('id', data.user.id)
              .maybeSingle(),
            AUTH_TIMEOUT_MS,
            'Tiempo de espera agotado al cargar el perfil'
          ),
          AUTH_RETRY_ATTEMPTS,
          AUTH_RETRY_DELAY_MS
        )

        if (profileError) {
          console.warn('Error fetching profile during sign-in (non-blocking):', profileError)
          set({ user: data.user, profile: null })
          return
        }

        set({ user: data.user, profile: profileData || null })
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Error al iniciar sesión'
      console.error('Error signing in:', error)
      throw new Error(errorMessage)
    } finally {
      set({ loading: false })
    }
  },

  changePassword: async (currentPassword: string, newPassword: string) => {
    try {
      set({ loading: true })

      if (!currentPassword || !newPassword) {
        throw new Error('Debes completar todos los campos')
      }

      if (currentPassword === newPassword) {
        throw new Error('La nueva contraseña debe ser diferente a la actual')
      }

      const {
        data: { user },
        error: userError,
      } = await withRetry(
        () => withTimeout(supabase.auth.getUser(), 15000, 'Tiempo de espera agotado al validar la sesión'),
        AUTH_RETRY_ATTEMPTS,
        AUTH_RETRY_DELAY_MS
      )

      if (userError) {
        throw new Error(userError.message || 'No se pudo validar la sesión actual')
      }

      if (!user?.email) {
        throw new Error('No se pudo identificar el usuario autenticado')
      }

      const userEmail = user.email

      const { data: reauthData, error: reauthError } = await withRetry(
        () => withTimeout(
          supabase.auth.signInWithPassword({
            email: userEmail,
            password: currentPassword,
          }),
          15000,
          'Tiempo de espera agotado al validar la contraseña actual'
        ),
        AUTH_RETRY_ATTEMPTS,
        AUTH_RETRY_DELAY_MS
      )

      if (reauthError || !reauthData.user || reauthData.user.id !== user.id) {
        throw new Error('La contraseña actual es incorrecta')
      }

      let updateAttempt = 0
      await withRetry(
        async () => {
          updateAttempt += 1

          const { error: updateError } = await withTimeout(
            supabase.auth.updateUser({ password: newPassword }),
            15000,
            'Tiempo de espera agotado al actualizar la contraseña'
          )

          if (!updateError) {
            return
          }

          const updateMessage = updateError.message || 'No se pudo actualizar la contraseña'

          if (updateAttempt > 1 && isSamePasswordMessage(updateMessage)) {
            return
          }

          throw new Error(updateMessage)
        },
        AUTH_RETRY_ATTEMPTS,
        AUTH_RETRY_DELAY_MS,
        (retryError) => isTransientNetworkError(retryError instanceof Error ? retryError.message : retryError)
      )
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Error al cambiar contraseña'
      console.error('Error changing password:', error)
      throw new Error(errorMessage)
    } finally {
      set({ loading: false })
    }
  },

  requestPasswordReset: async (email: string, redirectTo: string) => {
    try {
      set({ loading: true })

      const normalizedEmail = normalizeEmail(email)

      if (!normalizedEmail) {
        throw new Error('Debes ingresar un correo electrónico')
      }

      if (!redirectTo) {
        throw new Error('No se configuró la URL de redirección para recuperación')
      }

      const { error } = await withRetry(
        () => withTimeout(
          supabase.auth.resetPasswordForEmail(normalizedEmail, { redirectTo }),
          15000,
          'Tiempo de espera agotado al solicitar recuperación de contraseña'
        ),
        AUTH_RETRY_ATTEMPTS,
        AUTH_RETRY_DELAY_MS
      )

      if (error) {
        throw new Error(error.message || 'No se pudo enviar el correo de recuperación')
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Error al solicitar recuperación de contraseña'
      console.error('Error requesting password reset:', error)
      throw new Error(errorMessage)
    } finally {
      set({ loading: false })
    }
  },

  updatePasswordWithRecovery: async (newPassword: string) => {
    try {
      set({ loading: true })

      if (!newPassword) {
        throw new Error('Debes ingresar una nueva contraseña')
      }

      // Defensive check: ensure a recovery session is actually present before attempting update.
      try {
        const { data: { session: maybeSession } } = await withRetry(
          () => withTimeout(supabase.auth.getSession(), AUTH_TIMEOUT_MS, 'Tiempo de espera agotado al validar sesión de recuperación'),
          AUTH_RETRY_ATTEMPTS,
          AUTH_RETRY_DELAY_MS
        )
        if (!maybeSession?.user) {
          throw new Error('No se encontró una sesión de recuperación activa. Abre nuevamente el enlace enviado al correo.')
        }
      } catch (sessionErr) {
        throw new Error(sessionErr instanceof Error ? sessionErr.message : 'No se pudo validar la sesión de recuperación')
      }

      let updateAttempt = 0

      await withRetry(
        async () => {
          updateAttempt += 1

          const { error } = await withTimeout(
            supabase.auth.updateUser({ password: newPassword }),
            AUTH_TIMEOUT_MS,
            'Tiempo de espera agotado al restablecer la contraseña'
          )

          if (!error) {
            return
          }

          const updateMessage = error.message || 'No se pudo restablecer la contraseña'

          if (isAuthSessionMissingMessage(updateMessage)) {
            throw new Error('La sesión de recuperación expiró. Solicita un nuevo enlace para restablecer la contraseña.')
          }

          if (updateAttempt > 1 && isSamePasswordMessage(updateMessage)) {
            return
          }

          throw new Error(updateMessage)
        },
        AUTH_RETRY_ATTEMPTS,
        AUTH_RETRY_DELAY_MS,
        (retryError) => isTransientNetworkError(retryError instanceof Error ? retryError.message : retryError)
      )

      // End recovery flow with a clean local session before returning to login.
      try {
        const { error: localSignOutError } = await withRetry(
          () => withTimeout(
            supabase.auth.signOut({ scope: 'local' }),
            12000,
            'Tiempo de espera agotado al cerrar sesión local tras recuperación'
          ),
          AUTH_RETRY_ATTEMPTS,
          AUTH_RETRY_DELAY_MS
        )
        if (localSignOutError) {
          // Some supabase client versions may not accept 'scope' — fall through to fallback.
          throw localSignOutError
        }
      } catch (signOutErr) {
        // Fallback: try a standard signOut() which is broadly supported.
        try {
          const { error: fallbackError } = await withRetry(
            () => withTimeout(
              supabase.auth.signOut(),
              12000,
              'Tiempo de espera agotado al cerrar sesión tras recuperación'
            ),
            AUTH_RETRY_ATTEMPTS,
            AUTH_RETRY_DELAY_MS
          )
          if (fallbackError) {
            console.warn('Non-blocking local sign-out fallback after recovery failed:', fallbackError)
          }
        } catch (fallbackErr) {
          console.warn('Non-blocking local sign-out final fallback failed (ignored):', fallbackErr)
        }
      }

      set({ user: null, profile: null })
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Error al restablecer contraseña'
      console.error('Error updating password with recovery:', error)
      throw new Error(errorMessage)
    } finally {
      set({ loading: false })
    }
  },

  signOut: async () => {
    try {
      set({ loading: true })
      const { error } = await withRetry(
        () => withTimeout(
          supabase.auth.signOut(),
          12000,
          'Tiempo de espera agotado al cerrar sesión'
        ),
        AUTH_RETRY_ATTEMPTS,
        AUTH_RETRY_DELAY_MS
      )

      if (error) {
        throw error
      }

      set({ user: null, profile: null })
    } catch (error) {
      console.warn('Remote sign-out failed, falling back to local sign-out:', error)

      try {
        await withRetry(
          () => withTimeout(
            supabase.auth.signOut({ scope: 'local' }),
            8000,
            'Tiempo de espera agotado al cerrar sesión local'
          ),
          AUTH_RETRY_ATTEMPTS,
          AUTH_RETRY_DELAY_MS
        )
      } catch (localError) {
        console.info('Local sign-out fallback failed (non-blocking):', localError)
      }

      // Always clear local auth state to avoid blocking the UI.
      set({ user: null, profile: null })
    } finally {
      set({ loading: false })
    }
  },

  syncSession: async (reason = 'manual') => {
    if (isSyncingSession) {
      return
    }

    isSyncingSession = true

    try {
      if (import.meta.env.DEV) {
        console.info('[auth] syncing session after resume trigger:', reason)
      }

      const { data: { session }, error: sessionError } = await withRetry(
        () => withTimeout(supabase.auth.getSession(), 20000, 'Tiempo de espera agotado al validar sesión'),
        AUTH_RETRY_ATTEMPTS,
        AUTH_RETRY_DELAY_MS
      )

      if (sessionError) {
        throw sessionError
      }

      if (!session?.user) {
        if (get().user) {
          set({ user: null, profile: null })
        }
        return
      }

      const currentUserId = get().user?.id
      const profileUserId = get().profile?.id
      const shouldRefreshProfile = currentUserId !== session.user.id || profileUserId !== session.user.id

      if (!shouldRefreshProfile) {
        set({ user: session.user })
        return
      }

      const { data: profileData, error: profileError } = await withRetry(
        () => withTimeout(
          supabase
            .from('profiles')
            .select('*')
            .eq('id', session.user.id)
            .single(),
          AUTH_TIMEOUT_MS,
          'Tiempo de espera agotado al cargar el perfil'
        ),
        AUTH_RETRY_ATTEMPTS,
        AUTH_RETRY_DELAY_MS
      )

      if (profileError) {
        console.warn('Error refreshing profile on session sync:', profileError)
        set({ user: session.user, profile: null })
        return
      }

      set({ user: session.user, profile: profileData || null })
    } catch (syncError) {
      console.warn('Non-blocking session sync error:', syncError)
    } finally {
      isSyncingSession = false
    }
  },

  initialize: async () => {
    if (initializePromise) {
      return initializePromise
    }

    if (isInitializingAuth || get().initialized) {
      return
    }

    initializePromise = (async () => {
      isInitializingAuth = true

      try {
        set({ loading: true })

        // Step 1: restore a previous session (if it exists) when the app boots.
        const { data: { session } } = await withRetry(
          () => withTimeout(supabase.auth.getSession(), 15000, 'Tiempo de espera agotado al validar sesión'),
          AUTH_RETRY_ATTEMPTS,
          AUTH_RETRY_DELAY_MS
        )

        if (session?.user) {
          // Step 2: load profile data tied to the authenticated user id.
          const { data: profileData, error: profileError } = await withRetry(
            () => withTimeout(
              supabase
                .from('profiles')
                .select('*')
                .eq('id', session.user.id)
                .single(),
              15000,
              'Tiempo de espera agotado al cargar el perfil'
            ),
            AUTH_RETRY_ATTEMPTS,
            AUTH_RETRY_DELAY_MS
          )

          if (profileError) {
            console.warn('Error fetching profile:', profileError)
            // Do not block login if profile fetch fails; route guards still rely on auth user.
          }

          set({
            user: session.user,
            profile: profileData || null,
            initialized: true
          })
        } else {
          set({ user: null, profile: null, initialized: true })
        }

        if (!hasAuthStateListener) {
          // Keep store synced with auth events and avoid profile queries on password update events.
          supabase.auth.onAuthStateChange(async (event, session) => {
            if (event === 'SIGNED_OUT') {
              set({ user: null, profile: null })
              return
            }

            if (!session?.user) {
              return
            }

            if (event === 'USER_UPDATED' || event === 'TOKEN_REFRESHED' || event === 'PASSWORD_RECOVERY') {
              set({ user: session.user })
              return
            }

            if (event === 'SIGNED_IN' || event === 'INITIAL_SESSION') {
              try {
                const { data: profileData, error: profileError } = await withRetry(
                  () => withTimeout(
                    supabase
                      .from('profiles')
                      .select('*')
                      .eq('id', session.user.id)
                      .single(),
                    AUTH_TIMEOUT_MS,
                    'Tiempo de espera agotado al cargar el perfil'
                  ),
                  AUTH_RETRY_ATTEMPTS,
                  AUTH_RETRY_DELAY_MS
                )

                if (profileError) {
                  console.warn('Error fetching profile on auth change:', profileError)
                }

                set({ user: session.user, profile: profileData || null })
              } catch (authChangeError) {
                console.warn('Non-blocking profile refresh error on auth change:', authChangeError)
                set({ user: session.user })
              }
              return
            }

            set({ user: session.user })
          })

          hasAuthStateListener = true
        }
      } catch (error) {
        console.error('Error initializing auth:', error)
        set({ initialized: true })
      } finally {
        set({ loading: false })
        isInitializingAuth = false
        initializePromise = null
      }
    })()

    return initializePromise
  },
}))
