import { test, expect } from '@playwright/test'
import {
  ensureProfile,
  ensureTestUser,
  resetPassword,
  type TestUser,
} from './utils/supabaseAdmin'

const TEST_EMAIL = process.env.E2E_TEST_EMAIL ?? 'e2e.recovery@liceo.test'
const BASELINE_PASSWORD = process.env.E2E_TEST_PASSWORD ?? 'Baseline123*'

const missingRequiredEnv = !process.env.VITE_SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE_KEY

let testUser: TestUser | null = null

test.describe('Password recovery flow with hydration', () => {
  test.skip(
    missingRequiredEnv,
    'Missing required env vars for E2E recovery test: VITE_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY'
  )

  test.beforeEach(async () => {
    testUser = await ensureTestUser(TEST_EMAIL, BASELINE_PASSWORD)
    await ensureProfile(testUser.id, testUser.email)
  })

  test('recovery form preserves inputs during hydration changes', async ({ page }) => {
    await page.goto('/recuperar-contrasena')

    // Fill the recovery form
    await page.getByLabel(/correo electrónico/i).fill(TEST_EMAIL)

    // Simulate hydration change (like autofill trigger)
    await page.getByLabel(/correo electrónico/i).focus()

    // Verify the input value is preserved
    await expect(page.getByLabel(/correo electrónico/i)).toHaveValue(TEST_EMAIL)

    // Submit the form
    await page.getByRole('button', { name: /enviar enlace/i }).click()

    // Should show success message without losing state
    await expect(page.getByText(/si el correo está registrado/i)).toBeVisible()
  })

  test.afterEach(async () => {
    if (!testUser) return
    await resetPassword(testUser.id, BASELINE_PASSWORD)
    testUser = null
  })
})