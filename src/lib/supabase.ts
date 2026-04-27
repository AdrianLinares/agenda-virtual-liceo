import { createClient } from '@supabase/supabase-js'
import type { Database } from '@/types/database.types'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error('Faltan las variables de entorno de Supabase')
}

export const supabase = createClient<Database>(supabaseUrl, supabaseAnonKey, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true,
    // Keep auth in localStorage to avoid session loss on mobile app/background transitions.
    storage: typeof window !== 'undefined' ? window.localStorage : undefined
  }
})

export async function rpcCountNotas(params?: {
  periodo_id?: string | string[]
  grupo_id?: string | string[]
  asignatura_id?: string | string[]
  estudiante_id?: string
  search?: string
}): Promise<number | undefined> {
  try {
    const { data, error } = await supabase.rpc('notas_count', params || {})
    if (error) throw error
    const count = typeof data === 'number' ? data : parseInt(String(data), 10)
    return isNaN(count) ? undefined : count
  } catch (error) {
    console.error('Error al llamar RPC notas_count:', error)
    return undefined
  }
}
