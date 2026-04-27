import { createClient } from '@supabase/supabase-js'
import type { Database } from '@/types/database.types'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error('Missing Supabase environment variables')
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
  periodo_id?: string
  grupo_id?: string
  asignatura_id?: string
  estudiante_id?: string
  search?: string
}): Promise<number> {
  try {
    const { data, error } = await supabase.rpc('notas_count', params || {})
    if (error) throw error
    return typeof data === 'number' ? data : parseInt(String(data), 10) || 0
  } catch (error) {
    console.error('Error calling notas_count RPC:', error)
    return 0
  }
}
