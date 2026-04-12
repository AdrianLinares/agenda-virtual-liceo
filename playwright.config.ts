import { defineConfig } from '@playwright/test'

const isCI = Boolean(process.env.CI)

export default defineConfig({
  testDir: './e2e',
  testIgnore: ['**/__tests__/**'],
  retries: isCI ? 1 : 0,
  use: {
    baseURL: process.env.E2E_BASE_URL ?? 'http://localhost:5173',
    trace: 'retain-on-failure',
  },
  webServer: {
    command: 'pnpm dev',
    url: process.env.E2E_BASE_URL ?? 'http://localhost:5173',
    reuseExistingServer: !isCI,
    timeout: 120_000,
  },
})
