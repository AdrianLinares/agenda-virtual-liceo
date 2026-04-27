import { test, expect } from '@playwright/test'
import {
  ensureProfile,
  ensureTestUser,
  type TestUser,
} from './utils/supabaseAdmin'

const TEST_EMAIL = process.env.E2E_TEST_EMAIL ?? 'e2e.login@liceo.test'
const TEST_PASSWORD = process.env.E2E_TEST_PASSWORD ?? 'LoginTest123*'
const WRONG_PASSWORD = 'WrongPass123*'

const missingRequiredEnv = !process.env.VITE_SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE_KEY

let testUser: TestUser | null = null

test.describe('Login autofill and submit', () => {
  test.skip(
    missingRequiredEnv,
    'Missing required env vars for E2E login test: VITE_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY'
  )

  test.beforeEach(async () => {
    testUser = await ensureTestUser(TEST_EMAIL, TEST_PASSWORD)
    await ensureProfile(testUser.id, testUser.email)
  })

  test('login succeeds with autofill simulation and redirects to dashboard with profile loaded', async ({ page }) => {
    await page.goto('/login')

    // Simulate autofill by filling the fields (autofill would do this)
    await page.getByLabel(/correo electrónico/i).fill(TEST_EMAIL)
    await page.getByLabel(/contraseña/i).fill(TEST_PASSWORD)

    // Submit the form
    await page.getByRole('button', { name: /iniciar sesión/i }).click()

    // Wait for redirect to dashboard
    await page.waitForURL('**/dashboard')

    // Verify profile loads - check for profile information section
    await expect(page.getByText('Información de tu perfil')).toBeVisible()
  })

  test('login fails with wrong password and shows error', async ({ page }) => {
    await page.goto('/login')

    // Fill with correct email but wrong password
    await page.getByLabel(/correo electrónico/i).fill(TEST_EMAIL)
    await page.getByLabel(/contraseña/i).fill(WRONG_PASSWORD)

    // Submit the form
    await page.getByRole('button', { name: /iniciar sesión/i }).click()

    // Verify error is shown and still on login page
    await expect(page.getByText(/error al iniciar sesión/i)).toBeVisible()
    await expect(page).toHaveURL(/\/login/)
  })

  test.afterEach(async () => {
    testUser = null
  })
})