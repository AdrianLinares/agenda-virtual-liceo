---
name: nueva-pagina
description: Crear una nueva página con todos los patrones requeridos (states, loading, error, success, timeout)
type: skill
---

# Skill: Nueva Página

Crear una página completa siguiendo los patrones del proyecto.

## Pasos a seguir

1. **Crear archivo** en `src/pages/{Nombre}Page.tsx`

2. **Imports requeridos**:
```typescript
import { useEffect, useState, useCallback } from 'react'
import { useAuthStore } from '@/lib/auth-store'
import { supabase } from '@/lib/supabase'
import { withTimeout } from '@/lib/async-utils'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Button } from '@/components/ui/button'
import { Loader2, AlertCircle } from 'lucide-react'
```

3. **Estados requeridos**:
```typescript
const [data, setData] = useState<T[]>([])
const [loading, setLoading] = useState(false)
const [error, setError] = useState<string | null>(null)
const [success, setSuccess] = useState<string | null>(null)
const { profile } = useAuthStore()
```

4. **Patrón loadData**:
```typescript
const loadData = useCallback(async () => {
  if (!profile) return
  setLoading(true)
  setError(null)
  try {
    const { data, error } = await withTimeout(
      supabase.from('tabla').select('*'),
      15000,
      'Tiempo de espera agotado al cargar datos'
    )
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

5. **Patrón handleSave**:
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
      15000,
      'Tiempo de espera agotado'
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

6. **Render con estados**:
```typescript
return (
  <div className="space-y-6">
    <div>
      <h1 className="text-3xl font-bold text-foreground">Título</h1>
      <p className="text-muted-foreground mt-1">Descripción</p>
    </div>

    {error && (
      <Alert variant="destructive">
        <AlertCircle className="h-4 w-4" />
        <AlertDescription>{error}</AlertDescription>
      </Alert>
    )}

    {success && (
      <Alert>
        <AlertDescription>{success}</AlertDescription>
      </Alert>
    )}

    {loading && (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    )}

    {!loading && /* contenido */}
  </div>
)
```

7. **Agregar ruta en App.tsx**:
```typescript
const NombrePage = lazy(() => import('@/pages/NombrePage'))

// En Routes:
<Route path="/dashboard/nombre" element={
  <ProtectedRoute>
    <DashboardLayout>
      <NombrePage />
    </DashboardLayout>
  </ProtectedRoute>
} />
```

8. **Agregar ítem en DashboardLayout.tsx** en `menuItems` con roles correspondientes.

## Verificaciones

- [ ] Tipos actualizados en `src/types/database.types.ts` si hay nueva tabla
- [ ] Política RLS creada en Supabase
- [ ] Timeout en todas las queries
- [ ] Filtrado por rol correcto
- [ ] Loading/Error/Success states presentes
