# Optimizaciones Core Web Vitals

Implementadas para mejorar experiencia mobile (Chrome Android).

## Cambios Realizados

### 1. index.html

```html
<!-- Viewport optimizado para mobile -->
<meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no" />

<!-- Preconnect a Supabase -->
<link rel="preconnect" href="https://mkjvprcsakvfqxplqolq.supabase.co" crossorigin />

<!-- Critical CSS inline -->
<style>
  /* Critical CSS para above-the-fold */
  *{box-sizing:border-box;margin:0;padding:0}
  html{font-family:system-ui,-apple-system,sans-serif}
  body{min-height:100vh;background:hsl(36 31% 96%);color:hsl(8 42% 18%)}
</style>

<!-- PWA Manifest -->
<link rel="manifest" href="/manifest.json" />
```

### 2. vite.config.ts

```typescript
build: {
  target: 'esnext',
  minify: 'esbuild',
  rollupOptions: {
    output: {
      manualChunks: {
        'react-vendor': ['react', 'react-dom', 'react-router-dom'],
        'supabase': ['@supabase/supabase-js'],
      },
    },
  },
  sourcemap: false,
  cssCodeSplit: true,
}
```

### 3. globals.css

```css
/* Prevenir CLS por font loading */
body {
  font-feature-settings: "rlig" 1, "calt" 1;
  text-rendering: optimizeLegibility;
  -webkit-font-smoothing: antialiased;
}

/* Prevenir CLS en imágenes */
img {
  aspect-ratio: 1 / 1;
  object-fit: cover;
}

/* Prevenir zoom en mobile al hacer tap */
@media (max-width: 768px) {
  * {
    touch-action: manipulation;
  }
}

/* Skeleton loading */
.skeleton {
  background: linear-gradient(90deg, hsl(var(--border)) 25%, hsl(var(--muted)) 50%, hsl(var(--border)) 75%);
  background-size: 200% 100%;
  animation: skeleton-loading 1.5s infinite;
}
```

### 4. LoginPage.tsx

```tsx
// Preload de imagen LCP
useEffect(() => {
  const img = new Image()
  img.src = '/images/escudo.jpg'
  img.onload = () => setImageLoaded(true)
}, [])

// Skeleton + imagen optimizada
<div className={!imageLoaded ? 'skeleton' : ''}>
  <img
    src="/images/escudo.jpg"
    loading="eager"
    fetchPriority="high"
    width="160"
    height="160"
  />
</div>
```

### 5. DashboardLayout.tsx

```tsx
// useCallback para handlers
const handleSignOut = useCallback(async () => {
  // lógica
}, [signOut, navigate])

// useMemo para filtros
const filteredMenuItems = useMemo(() => {
  // filtro
}, [profile?.rol])

// min-h-dvh para mobile
<div className="min-h-screen min-h-dvh">

// will-change para animaciones
<header className="will-change-transform">
<aside className="will-change-transform">

// Touch manipulation
<Button className="touch-manipulation" />
```

## Métricas Objetivo

| Métrica | Actual | Objetivo |
|---------|--------|----------|
| LCP (Mobile) | ~4s | < 2.5s |
| INP (Mobile) | ~300ms | < 200ms |
| CLS (Mobile) | ~0.15 | < 0.1 |

## Cómo Medir

### Lighthouse
```bash
npx lighthouse https://tu-dominio.com --view --output=html --form-factor=mobile
```

### Chrome DevTools
1. Abrir DevTools (F12)
2. Ir a pestaña "Performance"
3. Activar "Web Vitals" en settings
4. Reload de la página

### PageSpeed Insights
```bash
curl "https://www.googleapis.com/pagespeedonline/v5/runPagespeed?url=https://tu-dominio.com&strategy=mobile"
```

## Próximas Optimizaciones Sugeridas

1. **Image CDN** - Usar Cloudflare Images o similar para optimización automática
2. **Font Subsetting** - Cargar solo caracteres necesarios
3. **HTTP/2 Push** - Configurar en Cloudflare Pages
4. **Early Hints** - Preload headers para recursos críticos
5. **Service Worker** - Cacheo offline con Workbox

## Verificación Post-Deploy

1. Deploy en Cloudflare Pages
2. Esperar 5 minutos para propagación
3. Correr Lighthouse en URL de producción
4. Verificar métricas en Chrome UX Report
5. Monitorear en Google Search Console > Core Web Vitals
