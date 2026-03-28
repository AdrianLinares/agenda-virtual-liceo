# Copilot Instructions — Agenda Virtual Liceo Ángel de la Guarda

## Descripción del Proyecto

Plataforma de gestión académica para el Liceo Ángel de la Guarda (Soacha, Colombia).
Stack: **React 18 + TypeScript + Vite + Tailwind CSS + Shadcn-ui + Supabase (PostgreSQL)**.

---

## Stack Tecnológico

| Capa | Tecnología |
|------|-----------|
| Frontend | React 18, TypeScript estricto, Vite |
| UI | Tailwind CSS, Shadcn-ui (Radix primitives) |
| Routing | React Router DOM v6 |
| Estado global | Zustand (`src/lib/auth-store.ts`) |
| Backend / BD | Supabase (PostgreSQL + RLS) |
| PDF | jsPDF v4 |
| Iconos | Lucide React |
| Deploy | **Cloudflare Pages** (SPA redirect en `public/_redirects`) |
| Email Cron | **Cloudflare Worker** con Cron Trigger (`cloudflare/workers/run-email-worker.js`) |

---

## Estructura del Proyecto

```
src/
├── App.tsx                    # Rutas con ProtectedRoute / RoleProtectedRoute
├── components/
│   ├── calculator/            # GradeCalculator, GradeInput, GradeTable, ResultsSection
│   ├── layout/DashboardLayout.tsx
│   └── ui/                    # Componentes Shadcn (button, card, select, input…)
├── lib/
│   ├── auth-store.ts          # Zustand store de autenticación
│   ├── supabase.ts            # Cliente Supabase (sessionStorage)
│   ├── admin-api.ts           # Funciones Edge Functions (manage-users)
│   └── async-utils.ts         # withTimeout, withRetry, isTransientConnectionError
├── pages/                     # Una página por módulo
├── types/
│   ├── database.types.ts      # Tipos TypeScript del schema Supabase
│   └── grades.ts              # Tipos de la calculadora de notas
└── utils/
    ├── calculations.ts        # calculateAverage, calculateWeighted, calculateResults
    └── grade-order.ts         # sortByGradeAndGroupName (orden de grados)
```

---

## Roles del Sistema

```typescript
type UserRole = 'administrador' | 'administrativo' | 'docente' | 'estudiante' | 'padre'
```

| Rol | Acceso clave |
|-----|-------------|
| `administrador` | Todo, incluyendo `/dashboard/admin` y `/dashboard/boletines` |
| `administrativo` | Gestión académica, aprobación de permisos |
| `docente` | Notas, asistencia, citaciones, seguimiento de sus grupos |
| `estudiante` | Solo lectura de sus propios datos |
| `padre` | Solo lectura de datos de sus hijos vinculados |

---

## Convenciones de Código

### Componentes React

- Exportación `default` en páginas, named en componentes reutilizables.
- Props tipadas con interfaces TypeScript explícitas.
- `useMemo` y `useCallback` para evitar re-renders costosos.
- Nunca usar `<form>` HTML; usar `onClick` / `onChange` directos.

```typescript
// ✅ Correcto
const handleSave = async () => { ... }
<Button onClick={handleSave}>Guardar</Button>

// ❌ Incorrecto
<form onSubmit={handleSave}>...</form>
```

### Supabase Queries

- Siempre usar `withTimeout` de `src/lib/async-utils.ts`.
- Para mutaciones usar `withRetry` cuando aplique.
- Los tipos del cliente vienen de `database.types.ts`.

```typescript
import { withTimeout, withRetry } from '@/lib/async-utils'

const { data, error } = await withTimeout(
  supabase.from('notas').select('*').eq('periodo_id', periodoId),
  15000,
  'Tiempo de espera agotado'
)
if (error) throw error
```

### RLS y Seguridad

- Toda tabla tiene Row Level Security activo.
- Las funciones `is_admin()`, `is_docente()`, `get_user_role()` son `SECURITY DEFINER` para evitar recursión.
- Nunca consultar datos de otra tabla dentro de una política RLS que ya consulta profiles (causa recursión infinita).

### Manejo de Errores

```typescript
try {
  // lógica
} catch (err) {
  const message = err instanceof Error ? err.message : 'Error desconocido'
  setError(message)
}
```

### Feedback al Usuario

- `setError(string | null)` + `setSuccess(string | null)` en cada página.
- Mostrar `<Alert variant="destructive">` para errores.
- Mostrar `<Alert>` normal para éxitos.
- Usar `<Loader2 className="animate-spin" />` durante operaciones async.

---

## Patrones de Estado

### Formularios Desplegables

Los formularios usan estado `formOpen` con un botón toggle:

```typescript
const [formOpen, setFormOpen] = useState(false)

<Button onClick={() => setFormOpen(prev => !prev)}>
  {formOpen ? 'Ocultar formulario' : 'Registrar X'}
</Button>
{formOpen && <Card>...</Card>}
```

### Filtros Encadenados

Patrón grupo → asignatura → estudiante usado en Notas, Asistencia, Horarios:

```typescript
// Al cambiar grupo, limpiar asignatura y estudiante dependientes
useEffect(() => {
  setSelectedAsignatura('')
  setSelectedEstudiante('')
  if (selectedGrupo) loadAsignaturasForGrupo()
}, [selectedGrupo])
```

### Optimistic Updates

Usado en AdminPage para evitar delays perceptibles:

```typescript
const previousData = data
setData(prev => prev.map(item => item.id === id ? { ...item, ...changes } : item))
try {
  await supabase.from('tabla').update(changes).eq('id', id)
} catch {
  setData(previousData) // revert
}
```

---

## Calculadora de Notas

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

---

## Base de Datos — Tablas Principales

```
profiles          → usuarios (extiende auth.users)
grados            → 0° a 11°
grupos            → grado + nombre + año_academico
asignaturas       → catálogo de materias
estudiantes_grupos → relación estudiante ↔ grupo (UNIQUE estudiante+año)
padres_estudiantes → relación padre ↔ hijo
asignaciones_docentes → docente ↔ grupo ↔ asignatura ↔ año
periodos          → 3 periodos por año académico
notas             → UNIQUE (estudiante, asignatura, periodo)
boletines         → UNIQUE (estudiante, periodo) — auto-sync via trigger
asistencias       → UNIQUE (estudiante, fecha, asignatura)
mensajes          → bandeja interna (enviado/leido/archivado)
anuncios          → destinatarios: TEXT[] con roles
eventos           → calendario con destinatarios: TEXT[]
permisos          → flujo pendiente→aprobado|rechazado
seguimientos      → historial académico/disciplinario
citaciones        → programadas con flag asistio
horarios          → bloques semanales por grupo
```

---

## Año Académico Activo

```typescript
// Siempre usar 2026 como año académico activo
.eq('año_academico', 2026)
```

Periodos 2026:
- Primer Periodo: 01 Feb – 30 Abr
- Segundo Periodo: 01 May – 30 Ago
- Tercer Periodo: 01 Sep – 30 Nov

---

## Imports y Alias

```typescript
// Usar siempre el alias @/
import { supabase } from '@/lib/supabase'
import { useAuthStore } from '@/lib/auth-store'
import { Button } from '@/components/ui/button'
import { withTimeout } from '@/lib/async-utils'
import { sortByGradeAndGroupName } from '@/utils/grade-order'
```

---

## Estilos y UI

- **No usar** `style={{}}` inline; preferir clases Tailwind.
- Colores semánticos vía CSS variables: `text-primary`, `bg-muted`, `text-destructive`.
- Componentes Shadcn disponibles: `Button`, `Card`, `Input`, `Label`, `Select`, `Alert`, `Avatar`, `DropdownMenu`.
- Para ordenar grados académicos usar siempre `sortByGradeAndGroupName` de `@/utils/grade-order`.

---

## Edge Functions (Supabase)

| Función | Propósito |
|---------|-----------|
| `manage-users` | CRUD de usuarios con service role (admin only) |
| `send-message-emails` | Worker de notificaciones email (feature flag) |

Llamadas desde `src/lib/admin-api.ts` usando `supabase.functions.invoke`.

---

## Lo que NO hacer

- ❌ No usar `localStorage` ni `sessionStorage` directamente (el cliente Supabase ya maneja la sesión en `sessionStorage`).
- ❌ No usar `<form>` HTML.
- ❌ No consultar `profiles` dentro de políticas RLS de `profiles` (recursión infinita).
- ❌ No usar `as any` a menos que sea estrictamente necesario por tipos incompletos.
- ❌ No hardcodear IDs de usuarios o recursos.
- ❌ No hacer fetch sin `withTimeout`.
- ❌ No mostrar datos de un rol a otro (respetar RLS en frontend también).
