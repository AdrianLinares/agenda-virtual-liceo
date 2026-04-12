import { createClient, type SupabaseClient } from '@supabase/supabase-js'
import type { Database } from '../../src/types/database.types'

export type TestUser = { id: string; email: string }

function requireEnv(name: string): string {
  const value = process.env[name]
  if (!value) {
    throw new Error(`Missing required env var: ${name}`)
  }
  return value
}

function createAdminClient(): SupabaseClient<Database> {
  return createClient<Database>(
    requireEnv('VITE_SUPABASE_URL'),
    requireEnv('SUPABASE_SERVICE_ROLE_KEY'),
    {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    }
  )
}

export async function ensureTestUser(email: string, password: string): Promise<TestUser> {
  const supabase = createAdminClient()
  const normalizedEmail = email.trim().toLowerCase()

  const { data: listed, error: listError } = await supabase.auth.admin.listUsers({
    page: 1,
    perPage: 200,
  })

  if (listError) {
    throw new Error(listError.message || 'Failed to list users for E2E setup')
  }

  const existing = listed.users.find((user) => user.email?.toLowerCase() === normalizedEmail)

  if (existing) {
    const { error: updateError } = await supabase.auth.admin.updateUserById(existing.id, {
      password,
      email_confirm: true,
    })

    if (updateError) {
      throw new Error(updateError.message || 'Failed to reset existing E2E user password')
    }

    return { id: existing.id, email: normalizedEmail }
  }

  const { data: created, error: createError } = await supabase.auth.admin.createUser({
    email: normalizedEmail,
    password,
    email_confirm: true,
  })

  if (createError || !created.user) {
    throw new Error(createError?.message || 'Failed to create E2E test user')
  }

  return { id: created.user.id, email: normalizedEmail }
}

export async function ensureProfile(userId: string, email: string): Promise<void> {
  const supabase = createAdminClient()
  const normalizedEmail = email.trim().toLowerCase()
  const nowIso = new Date().toISOString()

  const { error } = await supabase
    .from('profiles')
    .upsert(
      {
        id: userId,
        email: normalizedEmail,
        nombre_completo: 'E2E Recovery User',
        rol: 'estudiante',
        activo: true,
        updated_at: nowIso,
      },
      { onConflict: 'id' }
    )

  if (error) {
    throw new Error(error.message || 'Failed to upsert E2E profile')
  }
}

export async function generateRecoveryLink(email: string, redirectTo: string): Promise<string> {
  const supabase = createAdminClient()
  const normalizedEmail = email.trim().toLowerCase()

  const { data, error } = await supabase.auth.admin.generateLink({
    type: 'recovery',
    email: normalizedEmail,
    options: {
      redirectTo,
    },
  })

  const actionLink = data?.properties?.action_link

  if (error || !actionLink) {
    throw new Error(error?.message || 'Failed to generate recovery link for E2E flow')
  }

  return actionLink
}

export async function resetPassword(userId: string, password: string): Promise<void> {
  const supabase = createAdminClient()
  const { error } = await supabase.auth.admin.updateUserById(userId, {
    password,
    email_confirm: true,
  })

  if (error) {
    throw new Error(error.message || 'Failed to reset E2E user password')
  }
}
