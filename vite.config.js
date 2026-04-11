import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';
// https://vitejs.dev/config/
export default defineConfig({
    plugins: [
        react({
            // Optimizar JSX para mejor rendimiento
            jsxRuntime: 'automatic',
        }),
        // Plugin compacto para corregir inyecciones de modulepreload inline
        // que llegan con un media-type incorrecto (application/octet-stream)
        // en algunas plataformas de despliegue. Reemplaza el prefijo MIME
        // por application/javascript en el index.html generado.
        {
            name: 'fix-inline-module-mime',
            transformIndexHtml: function (html) {
                return html.replace(/data:application\/octet-stream;/g, 'data:application/javascript;');
            },
        },
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
                manualChunks: function (id) {
                    if (id.includes('node_modules')) {
                        if (id.includes('react') || id.includes('scheduler')) {
                            return 'react-vendor';
                        }
                        if (id.includes('@supabase')) {
                            return 'supabase';
                        }
                        if (id.includes('lucide-react')) {
                            return 'icons';
                        }
                        if (id.includes('jspdf')) {
                            return 'pdf';
                        }
                        if (id.includes('zustand')) {
                            return 'state';
                        }
                    }
                    if (id.includes('/components/ui/')) {
                        return 'ui';
                    }
                    if (id.includes('/components/calculator/')) {
                        return 'calculator';
                    }
                    if (id.includes('/components/layout/')) {
                        return 'layout';
                    }
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
});
