---
name: analizar-query-supabase
description: Analizar y optimizar queries de Supabase para rendimiento y seguridad
type: skill
---

# Skill: Analizar Query Supabase

Analizar queries de Supabase para identificar problemas de rendimiento, seguridad o tipos.

## Checklist de análisis

### 1. Timeout siempre presente

```typescript
// ❌ Incorrecto - sin timeout
const { data } = await supabase.from('tabla').select('*')

// ✅ Correcto - con timeout
import { withTimeout } from '@/lib/async-utils'

const { data, error } = await withTimeout(
  supabase.from('tabla').select('*'),
  15000,
  'Tiempo de espera agotado al cargar datos'
)
```

### 2. Tipos TypeScript correctos

```typescript
// ❌ Evitar any sin razón
const { error } = await (supabase as any).from('tabla').insert(payload)

// ✅ Correcto - con cast documentado
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const { error } = await (supabase as any)
  .from('tabla')
  .insert(payload)
```

### 3. Selects con relaciones anidadas

```typescript
// Patrón correcto para relaciones
const { data } = await supabase
  .from('notas')
  .select(`
    *,
    estudiante:estudiante_id (nombre_completo, email),
    asignatura:asignatura_id (nombre, codigo),
    grupo:grupo_id (nombre, grado:grado_id (nombre))
  `)
```

### 4. Filtrado por rol

```typescript
// Docente - filtrar por asignaciones
if (profile.rol === 'docente') {
  const { data: asignaciones } = await supabase
    .from('asignaciones_docentes')
    .select('grupo_id, asignatura_id')
    .eq('docente_id', profile.id)

  query = query.in('grupo_id', gruposAsignados)
}

// Padre - filtrar por hijos
if (profile.rol === 'padre') {
  const { data: hijos } = await supabase
    .from('padres_estudiantes')
    .select('estudiante_id')
    .eq('padre_id', profile.id)

  query = query.in('estudiante_id', hijosIds)
}

// Estudiante - solo propio
if (profile.rol === 'estudiante') {
  query = query.eq('estudiante_id', profile.id)
}
```

### 5. Manejo de errores

```typescript
try {
  const { data, error } = await withTimeout(...)
  if (error) throw error
  setData(data || [])
} catch (err) {
  // ✅ Correcto - mensaje descriptivo
  setError(err instanceof Error ? err.message : 'Error desconocido')
}
```

### 6. Optimización con índices

Verificar que las columns usadas en `.eq()`, `.in()`, `.order()` tengan índices:

```sql
-- Índices comunes necesarios
CREATE INDEX IF NOT EXISTS idx_notas_periodo ON notas(periodo_id);
CREATE INDEX IF NOT EXISTS idx_notas_estudiante ON notas(estudiante_id);
CREATE INDEX IF NOT EXISTS idx_asignaciones_docente ON asignaciones_docentes(docente_id);
CREATE INDEX IF NOT EXISTS idx_padres_estudiante ON padres_estudiantes(padre_id, estudiante_id);
```

### 7. Patrón con retry para operaciones críticas

```typescript
import { withRetry, withTimeout } from '@/lib/async-utils'

const { data, error } = await withRetry(
  () => withTimeout(
    supabase.auth.signInWithPassword({ email, password }),
    25000,
    'Tiempo de espera agotado al iniciar sesión'
  ),
  2,  // max attempts
  700 // delay ms
)
```

## Códigos de error comunes

| Código | Significado | Acción |
|--------|-------------|--------|
| `42501` | Insufficient privilege | Verificar RLS y permisos |
| `23505` | Unique violation | Verificar duplicados antes de insert |
| `23503` | Foreign key violation | Verificar IDs existen |
| `23502` | Not null violation | Verificar todos los required fields |
| `42P01` | Undefined table | Verificar nombre de tabla |
| `42703` | Undefined column | Verificar nombre de columna |

## Output del análisis

Al analizar una query, proporcionar:

1. **Estado del timeout**: ¿Presente? ¿Mensaje descriptivo?
2. **Tipos**: ¿Casts necesarios? ¿Documentados?
3. **Filtrado por rol**: ¿Correcto para el rol actual?
4. **Relaciones**: ¿Selects anidados correctos?
5. **Índices**: ¿Faltan índices para columns filtradas?
6. **Errores potenciales**: Basado en la operación
