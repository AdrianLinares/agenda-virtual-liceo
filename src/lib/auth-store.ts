import { create } from 'zustand'
import { User } from '@supabase/supabase-js'
import { supabase } from '@/lib/supabase'
import { withTimeout } from '@/lib/async-utils'
import type { Database } from '@/types/database.types'

type Profile = Database['public']['Tables']['profiles']['Row']

interface AuthState {
  user: User | null
  profile: Profile | null
  loading: boolean
  initialized: boolean
  setUser: (user: User | null) => void
  setProfile: (profile: Profile | null) => void
  setLoading: (loading: boolean) => void
  signIn: (email: string, password: string) => Promise<void>
  changePassword: (currentPassword: string, newPassword: string) => Promise<void>
  requestPasswordReset: (email: string, redirectTo: string) => Promise<void>
  updatePasswordWithRecovery: (newPassword: string) => Promise<void>
  signOut: () => Promise<void>
  initialize: () => Promise<void>
}

export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  profile: null,
  loading: true,
  initialized: false,

  setUser: (user) => set({ user }),
  setProfile: (profile) => set({ profile }),
  setLoading: (loading) => set({ loading }),

  signIn: async (email: string, password: string) => {
    try {
      set({ loading: true })
      const { data, error } = await withTimeout(supabase.auth.signInWithPassword({
        email,
        password,
      }), 15000, 'Tiempo de espera agotado al iniciar sesión')

      if (error) {
        const errorMessage = error.message || 'Error desconocido al iniciar sesión'
        console.error('Error signing in:', error)
        throw new Error(errorMessage)
      }

      if (data.user) {
        // Obtener el perfil del usuario
        const { data: profileData, error: profileError } = await withTimeout(supabase
          .from('profiles')
          .select('*')
          .eq('id', data.user.id)
          .single(), 15000, 'Tiempo de espera agotado al cargar el perfil')

        if (profileError) {
          console.error('Error fetching profile:', profileError)
          throw new Error('No se pudo obtener el perfil del usuario')
        }

        set({ user: data.user, profile: profileData })
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
      } = await withTimeout(supabase.auth.getUser(), 15000, 'Tiempo de espera agotado al validar la sesión')

      if (userError) {
        throw new Error(userError.message || 'No se pudo validar la sesión actual')
      }

      if (!user?.email) {
        throw new Error('No se pudo identificar el usuario autenticado')
      }

      const { data: reauthData, error: reauthError } = await withTimeout(supabase.auth.signInWithPassword({
        email: user.email,
        password: currentPassword,
      }), 15000, 'Tiempo de espera agotado al validar la contraseña actual')

      if (reauthError || !reauthData.user || reauthData.user.id !== user.id) {
        throw new Error('La contraseña actual es incorrecta')
      }

      const { error: updateError } = await withTimeout(supabase.auth.updateUser({
        password: newPassword,
      }), 15000, 'Tiempo de espera agotado al actualizar la contraseña')

      if (updateError) {
        throw new Error(updateError.message || 'No se pudo actualizar la contraseña')
      }
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

      if (!email) {
        throw new Error('Debes ingresar un correo electrónico')
      }

      if (!redirectTo) {
        throw new Error('No se configuró la URL de redirección para recuperación')
      }

      const { error } = await withTimeout(
        supabase.auth.resetPasswordForEmail(email, { redirectTo }),
        15000,
        'Tiempo de espera agotado al solicitar recuperación de contraseña'
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

      const { error } = await withTimeout(supabase.auth.updateUser({
        password: newPassword,
      }), 15000, 'Tiempo de espera agotado al restablecer la contraseña')

      if (error) {
        throw new Error(error.message || 'No se pudo restablecer la contraseña')
      }
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
      const { error } = await withTimeout(supabase.auth.signOut(), 15000, 'Tiempo de espera agotado al cerrar sesión')
      if (error) {
        const errorMessage = error.message || 'Error desconocido al cerrar sesión'
        console.error('Error signing out:', error)
        throw new Error(errorMessage)
      }
      set({ user: null, profile: null })
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Error al cerrar sesión'
      console.error('Error signing out:', error)
      throw new Error(errorMessage)
    } finally {
      set({ loading: false })
    }
  },

  initialize: async () => {
    try {
      set({ loading: true })

      // Obtener la sesión actual
      const { data: { session } } = await withTimeout(supabase.auth.getSession(), 15000, 'Tiempo de espera agotado al validar sesión')

      if (session?.user) {
        // Obtener el perfil del usuario
        const { data: profileData, error: profileError } = await withTimeout(supabase
          .from('profiles')
          .select('*')
          .eq('id', session.user.id)
          .single(), 15000, 'Tiempo de espera agotado al cargar el perfil')

        if (profileError) {
          console.warn('Error fetching profile:', profileError)
          // No lanzar error, solo continuar sin perfil
        }

        set({
          user: session.user,
          profile: profileData || null,
          initialized: true
        })
      } else {
        set({ user: null, profile: null, initialized: true })
      }

      // Escuchar cambios en la autenticación
      supabase.auth.onAuthStateChange(async (_event, session) => {
        if (session?.user) {
          const { data: profileData, error: profileError } = await withTimeout(supabase
            .from('profiles')
            .select('*')
            .eq('id', session.user.id)
            .single(), 15000, 'Tiempo de espera agotado al refrescar el perfil')

          if (profileError) {
            console.warn('Error fetching profile on auth change:', profileError)
          }

          set({ user: session.user, profile: profileData || null })
        } else {
          set({ user: null, profile: null })
        }
      })
    } catch (error) {
      console.error('Error initializing auth:', error)
      set({ initialized: true })
    } finally {
      set({ loading: false })
    }
  },
}))
