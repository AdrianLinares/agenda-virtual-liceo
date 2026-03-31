---
name: revisar-cambios
description: Revisar cambios antes de commit usando git diff y patrones del proyecto
type: skill
---

# Skill: Revisar Cambios

Revisar cambios antes de hacer commit para asegurar calidad y consistencia.

## Pasos de revisión

### 1. Ver cambios pendientes

```bash
git status
git diff
```

### 2. Checklist de revisión

#### Código TypeScript/React

- [ ] No hay `any` implícitos o explícitos sin justificación
- [ ] Todos los imports usan `@/` alias
- [ ] No hay `<form>` HTML (usar onClick/onChange directos)
- [ ] No hay estilos inline `style={{}}`
- [ ] `useMemo` y `useCallback` usados apropiadamente
- [ ] Props tipadas con interfaces explícitas

#### Queries Supabase

- [ ] Todas las queries usan `withTimeout`
- [ ] Timeout message descriptivo
- [ ] Manejo de errores con try/catch
- [ ] Error messages informativos

#### Estados y UI

- [ ] Loading state con `<Loader2 className="animate-spin" />`
- [ ] Error state con `<Alert variant="destructive">`
- [ ] Success state con `<Alert>` normal
- [ ] Estados inicializados correctamente

#### Autenticación y RLS

- [ ] Filtrado por rol del usuario
- [ ] No se accede a datos de otros roles
- [ ] `profile` verificado antes de usar

### 3. Comandos de validación

```bash
# TypeScript check
pnpm tsc --noEmit

# Lint
pnpm lint

# Build preview
pnpm build
```

### 4. Patrones comunes a verificar

#### Patrón loadData correcto
```typescript
// ✅ Correcto
const loadData = useCallback(async () => {
  if (!profile) return
  setLoading(true)
  setError(null)
  try {
    const { data, error } = await withTimeout(...)
    if (error) throw error
    setData(data || [])
  } catch (err) {
    setError(err instanceof Error ? err.message : 'Error desconocido')
  } finally {
    setLoading(false)
  }
}, [profile])
```

#### Patrón handleSave correcto
```typescript
// ✅ Correcto
const handleSave = async () => {
  if (!validación) { setError('mensaje'); return }
  setSaving(true)
  setError(null)
  setSuccess(null)
  try {
    const { error } = await withTimeout(...)
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

### 5. Errores frecuentes a buscar

| Error | Solución |
|-------|----------|
| `infinite recursion detected` | Usar funciones SECURITY DEFINER |
| `duplicate key violates unique constraint` | Verificar duplicados antes de insertar |
| `new row violates check constraint` | Nota debe estar entre 10-100 |
| `timeout` sin mensaje | Agregar mensaje descriptivo |
| `as any` sin comentario | Agregar eslint-disable con razón |

## Output esperado

Lista de cambios con:
- Archivos modificados
- Posibles issues encontrados
- Sugerencias de mejora
- Confirmación de que pasa lint/build
