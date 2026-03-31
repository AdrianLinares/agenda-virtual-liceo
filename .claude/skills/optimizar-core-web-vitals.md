---
name: optimizar-core-web-vitals
description: Optimizar LCP, INP y CLS para mobile (Chrome Android)
type: skill
---

# Skill: Optimizar Core Web Vitals

Enfocado en mejorar métricas para dispositivos móviles (Chrome Android).

## Métricas Objetivo

| Métrica | Objetivo Mobile | Umbral Bueno |
|---------|-----------------|--------------|
| LCP (Largest Contentful Paint) | < 2.5s | < 1.8s |
| INP (Interaction to Next Paint) | < 200ms | < 100ms |
| CLS (Cumulative Layout Shift) | < 0.1 | < 0.05 |

## Optimizaciones LCP

### 1. Critical CSS Inline
```html
<style>
  /* Critical CSS para above-the-fold */
  *{box-sizing:border-box;margin:0;padding:0}
  html{font-family:system-ui,-apple-system,sans-serif}
  body{min-height:100vh;background:hsl(36 31% 96%);color:hsl(8 42% 18%)}
  #root{min-height:100vh}
</style>
```

### 2. Preload de Recursos Críticos
```html
<!-- Preconnect a Supabase -->
<link rel="preconnect" href="https://<project>.supabase.co" crossorigin />

<!-- Preload de imagen LCP -->
<link rel="preload" as="image" href="/images/escudo.jpg" fetchpriority="high" />
```

### 3. Optimización de Imágenes
```tsx
// Usar loading="eager" y fetchPriority para LCP
<img
  src="/images/escudo.jpg"
  alt="..."
  loading="eager"
  fetchPriority="high"
  width="160"
  height="160"
/>

// Skeleton loading para perceived performance
<div className={imageLoaded ? '' : 'skeleton'}>
  <img onLoad={() => setImageLoaded(true)} />
</div>
```

## Optimizaciones INP

### 1. Memoización de Handlers
```tsx
// ✅ Correcto - useCallback
const handleClick = useCallback(() => {
  // lógica
}, [dependencies])

// ❌ Evitar - función inline en render
<Button onClick={() => doSomething()} />
```

### 2. Code Splitting por Ruta
```typescript
// App.tsx - lazy loading
const HomePage = lazy(() => import('@/pages/HomePage'))
const LoginPage = lazy(() => import('@/pages/LoginPage'))
```

### 3. Evitar Work en Render
```tsx
// ✅ Correcto - useMemo para cálculos
const filteredItems = useMemo(() => {
  return items.filter(item => item.active)
}, [items])

// ❌ Evitar - cálculo en render
const filteredItems = items.filter(item => item.active)
```

### 4. Touch Action para Mobile
```css
@media (max-width: 768px) {
  * {
    touch-action: manipulation;
  }
}
```

## Optimizaciones CLS

### 1. Dimensiones Explícitas
```tsx
// ✅ Correcto - width/height explícitos
<img width="160" height="160" />

// ✅ Correcto - aspect-ratio
<div className="aspect-square">
  <img className="object-cover" />
</div>
```

### 2. min-h-dvh para Mobile
```tsx
// ✅ Correcto - viewport dinámico
<div className="min-h-screen min-h-dvh">

// ❌ Evitar - solo min-h-screen
<div className="min-h-screen">
```

### 3. Reservar Espacio para Contenido Dinámico
```tsx
// Skeleton mientras carga
{loading ? (
  <div className="skeleton h-40 w-full" />
) : (
  <Content />
)}
```

### 4. Font Loading Strategy
```css
body {
  font-feature-settings: "rlig" 1, "calt" 1;
  text-rendering: optimizeLegibility;
  -webkit-font-smoothing: antialiased;
}
```

## Vite Config Optimizado

```typescript
export default defineConfig({
  build: {
    target: 'esnext',
    minify: 'esbuild',
    cssMinify: true,
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
  },
  esbuild: {
    drop: process.env.NODE_ENV === 'production' ? ['console'] : [],
  },
})
```

## Checklist de Verificación

### LCP
- [ ] Critical CSS inline en index.html
- [ ] Preconnect a dominios externos
- [ ] Imagen LCP con fetchPriority="high"
- [ ] Skeleton loading para imágenes
- [ ] Server response time < 600ms

### INP
- [ ] Handlers con useCallback
- [ ] Cálculos complejos con useMemo
- [ ] Code splitting implementado
- [ ] touch-action: manipulation
- [ ] Evitar layout thrashing

### CLS
- [ ] width/height explícitos en imágenes
- [ ] min-h-dvh para viewport mobile
- [ ] Skeleton para contenido dinámico
- [ ] Font-display: swap configurado
- [ ] Espacio reservado para ads/embeds

## Herramientas de Medición

```bash
# Lighthouse CLI
lighthouse https://tu-sitio.com --view --output=html

# Chrome DevTools
# Performance tab > Web Vitals

# PageSpeed Insights API
curl "https://www.googleapis.com/pagespeedonline/v5/runPagespeed?url=https://tu-sitio.com&strategy=mobile"
```

## Recursos

- [Web Vitals Guidelines](https://web.dev/vitals/)
- [Chrome User Experience Report](https://chrome.google.com/webstore/chrome-web-store)
- [PageSpeed Insights](https://pagespeed.web.dev/)
