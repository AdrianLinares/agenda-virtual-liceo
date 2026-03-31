# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

---

Archivo de contexto para Claude Code. Describe convenciones, patrones y reglas del proyecto.

---

## Deploy — Cloudflare Pages

```bash
# Build de producción (mismo comando que Netlify)
pnpm build   # genera /dist

# Deploy del email worker (Cloudflare Worker con Cron Trigger)
wrangler deploy --config wrangler.worker.toml
```

**Variables de entorno** — configurar en Cloudflare Dashboard → Pages → Settings → Environment variables:
- `VITE_SUPABASE_URL`
- `VITE_SUPABASE_ANON_KEY`

**Variables del Worker** — configurar en Workers → agenda-virtual-email-worker → Settings → Variables:
- `SUPABASE_PROJECT_REF` (texto)
- `SUPABASE_CRON_SECRET` (secret)

**SPA Routing** → `public/_redirects`:
```
/* /index.html 200
```

> El archivo `netlify.toml` puede mantenerse pero ya no aplica. Cloudflare lo ignora.

---

## Comandos de Desarrollo

```bash
pnpm install        # Instalar dependencias
pnpm dev            # Servidor de desarrollo (http://localhost:5173)
pnpm build          # Build de producción (tsc && vite build)
pnpm lint           # ESLint con TypeScript
pnpm preview        # Preview del build
```

## Variables de Entorno

```env
VITE_SUPABASE_URL=https://<project>.supabase.co
VITE_SUPABASE_ANON_KEY=<anon-key>
```

Copiar `.env.example` a `.env` y completar con credenciales del proyecto Supabase.

---

## Arquitectura

### Autenticación y Sesión

- Cliente Supabase configurado con `sessionStorage` → sesión expira al cerrar el navegador/pestaña.
- Store en `src/lib/auth-store.ts` (Zustand) con métodos: `signIn`, `signOut`, `initialize`, `syncSession`, `changePassword`, `requestPasswordReset`, `updatePasswordWithRecovery`.
- La inicialización ocurre una sola vez en `App.tsx` via `useEffect(() => { initialize() }, [initialize])`.
- Listener `onAuthStateChange` maneja `SIGNED_IN`, `SIGNED_OUT`, `TOKEN_REFRESHED`, `USER_UPDATED`.

### Rutas Protegidas

```typescript
// ProtectedRoute → verifica user autenticado
// RoleProtectedRoute → verifica rol específico
<Route path="/dashboard/admin" element={
  <ProtectedRoute>
    <RoleProtectedRoute allowedRoles={['administrador']}>
      <DashboardLayout><AdminPage /></DashboardLayout>
    </RoleProtectedRoute>
  </ProtectedRoute>
} />
```

Rutas con `RoleProtectedRoute` restringido solo a `administrador`:
- `/dashboard/admin`
- `/dashboard/boletines`

---

## Patrones Críticos

### Patrones de Estado Comunes

**Formularios Desplegables** — Los formularios usan estado `formOpen` con botón toggle:

```typescript
const [formOpen, setFormOpen] = useState(false)

<Button onClick={() => setFormOpen(prev => !prev)}>
  {formOpen ? 'Ocultar formulario' : 'Registrar X'}
</Button>
{formOpen && <Card>...</Card>}
```

**Filtros Encadenados** — Patrón grupo → asignatura → estudiante (Notas, Asistencia, Horarios):

```typescript
// Al cambiar grupo, limpiar asignatura y estudiante dependientes
useEffect(() => {
  setSelectedAsignatura('')
  setSelectedEstudiante('')
  if (selectedGrupo) loadAsignaturasForGrupo()
}, [selectedGrupo])
```

**Optimistic Updates** — Usado en AdminPage para evitar delays:

```typescript
const previousData = data
setData(prev => prev.map(item => item.id === id ? { ...item, ...changes } : item))
try {
  await supabase.from('tabla').update(changes).eq('id', id)
} catch {
  setData(previousData) // revert
}
```

### Queries Supabase Siempre con Timeout

```typescript
import { withTimeout } from '@/lib/async-utils'

const { data, error } = await withTimeout(
  supabase.from('tabla').select('*'),
  15000,
  'Tiempo de espera agotado al cargar datos'
)
if (error) throw error
```

### Tipos del Cliente Supabase

Para operaciones de escritura en tablas con restricciones TypeScript complejas:

```typescript
import type { SupabaseClient } from '@supabase/supabase-js'

type WritableDatabase = {
  public: {
    Tables: {
      [K in keyof Database['public']['Tables']]: Database['public']['Tables'][K] & { Relationships: [] }
    }
    Enums: Database['public']['Enums']
  }
}

const dbClient = supabase as unknown as SupabaseClient<WritableDatabase>
```

### Carga de Datos en Páginas

Patrón estándar para cargar datos al montar:

```typescript
const [data, setData] = useState<T[]>([])
const [loading, setLoading] = useState(false)
const [error, setError] = useState<string | null>(null)

const loadData = useCallback(async () => {
  if (!profile) return
  setLoading(true)
  setError(null)
  try {
    const { data, error } = await withTimeout(supabase.from('tabla').select('*'), 15000, '...')
    if (error) throw error
    setData(data || [])
  } catch (err) {
    setError(err instanceof Error ? err.message : 'Error desconocido')
  } finally {
    setLoading(false)
  }
}, [profile])

useEffect(() => {
  if (profile) void loadData()
}, [loadData, profile])
```

### Guardar Datos

```typescript
const [saving, setSaving] = useState(false)

const handleSave = async () => {
  if (!validación) { setError('mensaje'); return }
  setSaving(true)
  setError(null)
  setSuccess(null)
  try {
    const { error } = await withTimeout(
      (supabase as any).from('tabla').insert(payload),
      15000, '...'
    )
    if (error) throw error
    setSuccess('Guardado correctamente')
    await loadData()
  } catch (err) {
    setError(err instanceof Error ? err.message : 'Error al guardar')
  } finally {
    setSaving(false)
  }
}
```

---

## Arquitectura de Módulos

### Calculadora de Notas

Tres categorías con pesos configurables:

| Categoría | Key | Default |
|-----------|-----|---------|
| Actitudinal | `A` | 10% |
| Procedimental | `P` | 40% |
| Cognitiva | `C` | 50% |

```typescript
// Fórmula:
Promedio_cat = Σ notas / cantidad
Ponderación_cat = Promedio_cat × (Peso / 100)
Nota_final = Σ Ponderaciones
```

Las notas se guardan en `notas.observaciones` como JSON con desglose completo.

Componentes en `src/components/calculator/`:
- `GradeCalculator.tsx` — estado principal y lógica
- `GradeInput.tsx` — inputs de notas por categoría
- `GradeTable.tsx` — tabla de estudiantes
- `ResultsSection.tsx` — resultados y totales

Tipos en `src/types/grades.ts`, utilidades en `src/utils/calculations.ts` y `src/utils/grade-order.ts`.

---

## Relaciones Importantes de la BD

```
profiles (1) ──── (N) estudiantes_grupos ──── (N) grupos
profiles (1) ──── (N) padres_estudiantes ──── (N) profiles (estudiante)
profiles (1) ──── (N) asignaciones_docentes ──── grupos + asignaturas
notas.observaciones = JSON con desglose de calculadora (actitudinal/procedimental/cognitiva)
boletines se sincronizan automáticamente via trigger cuando cambian notas
```

### Carga de Relaciones por Rol

Para **docente**: filtrar siempre por `asignaciones_docentes.docente_id = profile.id`.  
Para **padre**: primero obtener `padres_estudiantes.estudiante_id` → luego filtrar por esos IDs.  
Para **estudiante**: filtrar directamente por `profile.id`.  
Para **admin/administrativo**: sin filtro adicional.

---

## Convenciones de Código

### Imports

Siempre usar el alias `@/` para imports del proyecto:

```typescript
import { supabase } from '@/lib/supabase'
import { useAuthStore } from '@/lib/auth-store'
import { Button } from '@/components/ui/button'
import { withTimeout } from '@/lib/async-utils'
```

### Componentes React

- Exportación `default` en páginas, named en componentes reutilizables
- Props tipadas con interfaces TypeScript explícitas
- `useMemo` y `useCallback` para evitar re-renders costosos
- **Nunca usar `<form>` HTML**; usar `onClick` / `onChange` directos

```typescript
// ✅ Correcto
const handleSave = async () => { ... }
<Button onClick={handleSave}>Guardar</Button>

// ❌ Incorrecto
<form onSubmit={handleSave}>...</form>
```

### Estilos

- **No usar** `style={{}}` inline; preferir clases Tailwind
- Colores semánticos vía CSS variables: `text-primary`, `bg-muted`, `text-destructive`
- Para ordenar grados académicos usar siempre `sortByGradeAndGroupName` de `@/utils/grade-order`

### Año Académico

```typescript
// Siempre usar 2026 como año académico activo
.eq('año_academico', 2026)
```

---

## Convenciones de Archivos

### Nuevas Páginas

1. Crear en `src/pages/NombrePage.tsx`
2. Agregar `lazy(() => import('@/pages/NombrePage'))` en `App.tsx`
3. Agregar ruta en `<Routes>` con `<ProtectedRoute>`
4. Agregar ítem en `menuItems` de `DashboardLayout.tsx` con los roles correspondientes

### Nuevos Componentes UI Reutilizables

- Colocar en `src/components/ui/` si es genérico (Shadcn-style)
- Colocar en `src/components/<feature>/` si es específico de un módulo

### Nuevas Migraciones SQL

- Nombrar como `migrations/YYYYMMDD_descripcion.sql`
- Siempre dentro de `BEGIN; ... COMMIT;`
- Incluir `DROP POLICY IF EXISTS` antes de crear políticas nuevas

---

## Errores Frecuentes y Soluciones

### "infinite recursion detected in policy for relation profiles"

Causa: una política RLS de `profiles` hace `EXISTS (SELECT 1 FROM profiles ...)`.
Solución: usar funciones `SECURITY DEFINER` como `is_admin()` o `get_user_role()`.

### "duplicate key value violates unique constraint" en notas

Cada estudiante solo puede tener una nota por `(estudiante_id, asignatura_id, periodo_id)`.
Verificar duplicado antes de insertar o usar `ON CONFLICT DO UPDATE`.

### "new row violates check constraint" en notas

La nota debe estar entre 10 y 100: `CHECK (nota >= 10 AND nota <= 100)`.

### Tipos TypeScript en inserts Supabase

Si hay error de tipos en `.insert()`, usar cast `as any` solo en ese punto y documentarlo:

```typescript
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const { error } = await (supabase as any).from('tabla').insert(payload)
```

---

## Lo que NO hacer

- ❌ No usar `localStorage` ni `sessionStorage` directamente (el cliente Supabase ya maneja la sesión en `sessionStorage`)
- ❌ No usar `<form>` HTML
- ❌ No consultar `profiles` dentro de políticas RLS de `profiles` (recursión infinita)
- ❌ No usar `as any` a menos que sea estrictamente necesario por tipos incompletos
- ❌ No hardcodear IDs de usuarios o recursos
- ❌ No hacer fetch sin `withTimeout`
- ❌ No mostrar datos de un rol a otro (respetar RLS en frontend también)
- ❌ No usar `style={{}}` inline; preferir clases Tailwind

---

## Checklist para Nuevas Features

- [ ] Tipos en `src/types/database.types.ts` actualizados si hay nueva tabla
- [ ] Política RLS creada en Supabase para la tabla
- [ ] Migración SQL en `migrations/` si hay cambio de schema
- [ ] Página protegida con `ProtectedRoute` y roles correctos
- [ ] Loading state con `Loader2 animate-spin`
- [ ] Error state con `Alert variant="destructive"`
- [ ] Success state con `Alert` normal
- [ ] Timeout en todas las queries con `withTimeout`
- [ ] Filtrado por rol (docente solo sus grupos, padre solo sus hijos, etc.)
- [ ] Ítem en `menuItems` de `DashboardLayout` con roles correctos

## Checklist de Deploy (Cloudflare)

- [ ] `VITE_SUPABASE_URL` y `VITE_SUPABASE_ANON_KEY` configuradas en Cloudflare Pages
- [ ] `public/_redirects` presente con `/* /index.html 200`
- [ ] Worker desplegado si se modificó `cloudflare/workers/run-email-worker.js`
- [ ] Supabase Auth → Site URL actualizada al dominio de Cloudflare Pages
- [ ] Secrets de GitHub actualizados (`CLOUDFLARE_WORKER_URL`) si aplica
