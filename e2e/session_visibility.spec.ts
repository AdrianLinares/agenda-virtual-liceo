import { test, expect } from '@playwright/test'
import {
  ensureProfile,
  ensureTestUser,
  type TestUser,
} from './utils/supabaseAdmin'

const TEST_EMAIL = process.env.E2E_TEST_EMAIL ?? 'e2e.session@liceo.test'
const TEST_PASSWORD = process.env.E2E_TEST_PASSWORD ?? 'SessionTest123*'

const missingRequiredEnv = !process.env.VITE_SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE_KEY

let testUser: TestUser | null = null

test.describe('Session visibility preservation', () => {
  test.skip(
    missingRequiredEnv,
    'Missing required env vars for E2E session test: VITE_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY'
  )

  test.beforeEach(async () => {
    testUser = await ensureTestUser(TEST_EMAIL, TEST_PASSWORD)
    await ensureProfile(testUser.id, testUser.email)
  })

  test('session preserved and form state maintained when tab visibility changes', async ({ page }) => {
    // Login first
    await page.goto('/login')
    await page.getByLabel(/correo electrónico/i).fill(TEST_EMAIL)
    await page.getByRole('button', { name: /iniciar sesión/i }).click()
    await page.waitForURL('**/dashboard')

    // Navigate to announcements page
    await page.goto('/dashboard/anuncios')

    // Open the create announcement form
    await page.getByRole('button', { name: /publicar anuncio/i }).click()

    // Fill the form with draft content
    const testTitle = 'Draft Announcement ' + Date.now()
    const testContent = 'This is a test draft content for session preservation test.'

    await page.getByLabel(/título/i).fill(testTitle)
    await page.getByLabel(/contenido/i).fill(testContent)

    // Simulate tab becoming hidden (user switches tabs)
    await page.evaluate(() => {
      Object.defineProperty(document, 'hidden', { value: true, writable: true })
      document.dispatchEvent(new Event('visibilitychange'))
    })

    // Wait a moment
    await page.waitForTimeout(1000)

    // Simulate tab becoming visible again
    await page.evaluate(() => {
      Object.defineProperty(document, 'hidden', { value: false, writable: true })
      document.dispatchEvent(new Event('visibilitychange'))
    })

    // Verify form state is preserved
    await expect(page.getByLabel(/título/i)).toHaveValue(testTitle)
    await expect(page.getByLabel(/contenido/i)).toHaveValue(testContent)

    // Verify still on the same page (no remount/logout)
    await expect(page).toHaveURL('**/dashboard/anuncios')
  })

  test.afterEach(async () => {
    testUser = null
  })
})