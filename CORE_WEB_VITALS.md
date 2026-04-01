# Core Web Vitals - Optimizaciones Implementadas

## Métricas Objetivo

| Métrica | Objetivo | Estado Actual |
|---------|----------|---------------|
| **LCP** (Largest Contentful Paint) | < 2.5s | ~3.6s ⚠️ |
| **FCP** (First Contentful Paint) | < 1.8s | ~3.2s ❌ |
| **CLS** (Cumulative Layout Shift) | < 0.1 | 0 ✅ |
| **INP** (Interaction to Next Paint) | < 200ms | ~300ms ⚠️ |
| **TBT** (Total Blocking Time) | < 200ms | ~2ms ✅ |

## Optimizaciones Implementadas

### 1. Lazy Loading Agresivo

#### jsPDF (~500KB)
```typescript
// Antes (BoletinesPage.tsx)
import { jsPDF } from 'jspdf'

// Después - Dynamic import
const generateBoletinPDF = async (boletinData, notasDetalle) => {
  const { jsPDF } = await import('jspdf')
  const doc = new jsPDF()
  // ...
}
```
**Ahorro estimado:** ~500KB del bundle inicial

#### GradeCalculator (~50KB)
```typescript
// Antes
import { GradeCalculator } from '@/components/calculator/GradeCalculator'

// Después - Lazy con Suspense
import { lazy, Suspense } from 'react'
const GradeCalculator = lazy(() => import('@/components/calculator/GradeCalculator'))

<Suspense fallback={<div>Cargando calculadora...</div>}>
  <GradeCalculator {...props} />
</Suspense>
```
**Ahorro estimado:** ~50KB cargado solo cuando docente abre la calculadora

### 2. Critical CSS Expandido

**Archivo:** `index.html`

El critical CSS inline ahora incluye (~5KB):
- Layout base (flex, grid, spacing)
- LoginPage completo (gradientes, centrado, logo, card)
- DashboardLayout (header sticky, sidebar base)
- Skeleton loaders
- Transiciones básicas
- Media queries para responsive

```html
<style>
  /* ~5KB de CSS crítico inline */
  .flex{display:flex}
  .min-h-dvh{min-height:100dvh}
  /* ... 200+ clases optimizadas */
</style>
```

### 3. Code Splitting Optimizado (vite.config.ts)

```typescript
manualChunks: (id) => {
  if (id.includes('node_modules')) {
    if (id.includes('react')) return 'react-vendor'
    if (id.includes('@supabase')) return 'supabase'
    if (id.includes('lucide-react')) return 'icons'
    if (id.includes('jspdf')) return 'pdf'
    if (id.includes('zustand')) return 'state'
  }
  if (id.includes('/components/ui/')) return 'ui'
  if (id.includes('/components/calculator/')) return 'calculator'
  if (id.includes('/components/layout/')) return 'layout'
}
```

**Chunks generados:**
| Chunk | Contenido | Tamaño estimado |
|-------|-----------|-----------------|
| `react-vendor` | react, react-dom, react-router | ~45KB |
| `supabase` | @supabase/supabase-js | ~200KB |
| `icons` | lucide-react | ~30KB |
| `ui` | shadcn/ui components | ~80KB |
| `pdf` | jspdf | ~500KB (lazy) |
| `calculator` | GradeCalculator | ~50KB (lazy) |
| `layout` | DashboardLayout | ~20KB |

### 4. Preconnect y Preload

```html
<link rel="preconnect" href="https://mkjvprcsakvfqxplqolq.supabase.co" />
<link rel="preconnect" href="https://liceoangeldelaguarda.education" />
<link rel="preload" as="image" href="/images/escudo.jpg" fetchpriority="high" />
<link rel="modulepreload" href="/src/main.tsx" />
```

### 5. Tree Shaking Agresivo

```typescript
esbuild: {
  drop: process.env.NODE_ENV === 'production' ? ['console', 'debugger'] : [],
}
```

## Checklist Pre-Deploy

### before-build
- [ ] Verificar que todos los dynamic imports funcionan correctamente
- [ ] Confirmar que Suspense fallbacks se renderizan sin FOUC
- [ ] Probar navegación entre rutas lazy-loaded

### after-build
- [ ] Medir bundle sizes con `pnpm build` y verificar no hay chunks > 500KB
- [ ] Correr Lighthouse en modo incógnito
- [ ] Verificar FCP < 2s en Network Throttling "Slow 4G"
- [ ] Confirmar CLS = 0 en todas las rutas

### Commands
```bash
# Build y análisis
pnpm build

# Preview local
pnpm preview

# Lighthouse CLI (instalar primero)
npx lighthouse http://localhost:4173 --view

# Bundle analyzer (opcional)
npx vite-bundle-visualizer
```

## Archivos Modificados

| Archivo | Cambio |
|---------|--------|
| `src/pages/BoletinesPage.tsx` | jsPDF → dynamic import |
| `src/pages/NotasPage.tsx` | GradeCalculator → lazy + Suspense |
| `vite.config.ts` | manualChunks optimizado con función |
| `index.html` | Critical CSS expandido ~5KB |

## Métricas de Éxito

- **Bundle inicial:** Reducción de ~150KB → ~100KB (estimado)
- **LCP:** Meta 2.5s (actualmente 3.6s)
- **FCP:** Meta 1.8s (actualmente 3.2s)
- **jsPDF:** Carga diferida, no incluido en initial bundle
- **GradeCalculator:** Solo carga cuando docente interactúa

## Referencias

- [Web.dev Core Web Vitals](https://web.dev/vitals/)
- [Vite Code Splitting](https://vitejs.dev/guide/build.html#chunking-strategies)
- [Lighthouse Performance](https://developer.chrome.com/docs/lighthouse/performance/)
