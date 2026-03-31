import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'path'

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [
    react({
      // Optimizar JSX para mejor rendimiento
      jsxRuntime: 'automatic',
    }),
  ],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  build: {
    // Optimizaciones para producción
    target: 'esnext',
    minify: 'esbuild',
    cssMinify: true,
    rollupOptions: {
      output: {
        // Code splitting optimizado
        manualChunks: {
          'react-vendor': ['react', 'react-dom', 'react-router-dom'],
          'supabase': ['@supabase/supabase-js'],
          'ui': [
            '@/components/ui/button',
            '@/components/ui/card',
            '@/components/ui/input',
            '@/components/ui/select',
            '@/components/ui/alert',
          ],
        },
        // Naming pattern con hash para cacheo
        entryFileNames: 'assets/[name].[hash].js',
        chunkFileNames: 'assets/[name].[hash].js',
        assetFileNames: 'assets/[name].[hash].[ext]',
      },
    },
    // Chunk size warning
    chunkSizeWarningLimit: 500,
    // Sourcemaps solo en desarrollo
    sourcemap: false,
    // CSS code splitting
    cssCodeSplit: true,
  },
  esbuild: {
    // Tree shaking agresivo
    drop: process.env.NODE_ENV === 'production' ? ['console', 'debugger'] : [],
  },
  // Optimizaciones de servidor de desarrollo
  server: {
    port: 5173,
    warmup: {
      // Pre-calentar módulos frecuentes
      clientFiles: [
        './src/main.tsx',
        './src/App.tsx',
        './src/lib/auth-store.ts',
        './src/lib/supabase.ts',
      ],
    },
  },
  // Optimizaciones de preview
  preview: {
    port: 4173,
  },
})
