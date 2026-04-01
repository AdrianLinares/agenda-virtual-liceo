---
name: Core Web Vitals Optimizations
description: Optimizaciones de LCP, INP y CLS implementadas en marzo 2026 - resultados y técnicas aplicadas
type: project
---

## Core Web Vitals - Estado Marzo 2026

**Resultados Lighthouse (2026-03-31):**
- Performance Score: 82/100
- LCP: 3.6s (score 60/100) - ⚠️ Necesita mejorar
- FCP: 3.2s (score 42/100) - ❌ Deficiente
- CLS: 0 (score 100/100) - ✅ Excelente
- TBT: score 98/100 - ✅ Excelente
- TTI: 3.6s (score 91/100) - ✅ Bueno

**Optimizaciones Implementadas:**

1. **index.html**:
   - Critical CSS inline para above-the-fold
   - Preconnect a Supabase y dominio principal
   - Preload de imagen hero (`/images/escudo.jpg`) con `fetchpriority="high"`
   - Modulepreload para `/src/main.tsx`
   - Viewport optimizado (maximum-scale=1.0, user-scalable=no)
   - PWA manifest link

2. **vite.config.ts**:
   - Code splitting con manualChunks (react-vendor, supabase, ui)
   - Minificación esbuild
   - CSS code splitting
   - Tree shaking agresivo (drop console en producción)
   - Warmup de módulos frecuentes en dev

3. **globals.css**:
   - font-feature-settings para stable font loading
   - aspect-ratio en imágenes
   - touch-action: manipulation para mobile
   - Skeleton loading animation
   - min-h-dvh para viewport dinámico
   - will-change hints para animaciones

4. **LoginPage.tsx**:
   - Preload de imagen desde index.html (no useEffect)
   - Skeleton loading mientras carga
   - loading="eager" y fetchpriority="high"
   - width/height explícitos (160x160)
   - decoding="async" para non-blocking decode

5. **DashboardLayout.tsx**:
   - useCallback para handlers (handleSignOut)
   - useMemo para filtros (filteredMenuItems)
   - min-h-screen min-h-dvh para mobile
   - will-change-transform en header/sidebar
   - touch-manipulation en botones
   - Prevent bounce en mobile scroll

**Técnicas que NO funcionaron como esperado:**
- El preload de imagen con useEffect en LoginPage era demasiado tarde (se ejecuta post-render)
- Solución: mover preload a index.html con `<link rel="preload">`

**Próximos pasos para mejorar LCP/FCP:**
1. Critical CSS más agresivo - extraer CSS above-the-fold del build
2. Lazy loading más agresivo en rutas - más componentes con lazy()
3. Reducir bundle inicial de React + React Router
4. Considerar SSR o streaming para contenido crítico

**Por qué:** Las métricas de CLS e INP están excelentes pero LCP y FCP siguen altos porque el bundle inicial de React tarda en hidratar y la imagen hero aunque tiene preload compite con la carga del JS.

**Cómo aplicar:** Para futuras optimizaciones, priorizar: (1) reducir JS inicial, (2) critical CSS más completo, (3) streaming SSR si es posible.
