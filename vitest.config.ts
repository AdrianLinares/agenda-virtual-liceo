import { defineConfig } from 'vitest/config'
import react from '@vitejs/plugin-react'
import path from 'path'

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  test: {
    environment: 'jsdom',
    globals: true,
    setupFiles: ['./src/test/setup.ts'],
    include: ['src/**/*.spec.{ts,tsx}', 'src/**/*.test.{ts,tsx}', 'e2e/__tests__/**/*.spec.ts'],
    clearMocks: true,
    pool: 'threads',
    poolOptions: {
      threads: {
        minThreads: 1,
        maxThreads: 1,
      },
    },
  },
})
