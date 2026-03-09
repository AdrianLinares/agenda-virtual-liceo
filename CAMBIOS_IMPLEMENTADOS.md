# 📋 Cambios Implementados - Revisión y Mejoras

## Fecha: 8 de Marzo de 2026

---

## 1. ✅ Ajustes finales para despliegue en Netlify

### Archivos modificados:
- [netlify.toml](netlify.toml)

### Cambios:
- Configuración de build para Netlify (`pnpm build` + `dist`)
- Redirect SPA `/* -> /index.html` para evitar 404 en recarga de rutas internas

---

## 2. ✅ Ajustes de autenticación y sesión

### Archivos modificados:
- [src/lib/supabase.ts](src/lib/supabase.ts)
- [src/App.tsx](src/App.tsx)

### Cambios:
- Persistencia de sesión migrada a `sessionStorage` (la sesión se cierra al cerrar navegador/pestaña)
- Ruta `/login` ahora siempre muestra la pantalla de login
- Comentarios de rutas protegidas mejorados para facilitar mantenimiento por desarrolladores junior

---

## 3. ✅ Endurecimiento de control de acceso y navegación

### Archivos modificados:
- [src/App.tsx](src/App.tsx)
- [src/components/layout/DashboardLayout.tsx](src/components/layout/DashboardLayout.tsx)

### Cambios:
- Ruta `/dashboard/admin` protegida explícitamente con `RoleProtectedRoute` para `administrador`
- Menú lateral: si no hay rol cargado, no se muestran entradas por defecto
- Comentarios de seguridad y flujo de roles mejorados

---

## 4. ✅ Actualización de dependencias y seguridad

### Archivos modificados:
- [package.json](package.json)
- [pnpm-lock.yaml](pnpm-lock.yaml)

### Cambios:
- `jspdf` actualizado a `^4.2.0`
- `pnpm overrides` para usar `dompurify >= 3.3.2`
- Resultado: reducción de vulnerabilidades reportadas en `pnpm audit --prod`
- Riesgo residual: advisories HIGH en `xlsx` sin parche oficial publicado hasta la fecha

---

## Fecha: 1 de Marzo de 2026

---

## 1. ✅ Restricción de acceso en Boletines

### Archivos modificados:
- [src/App.tsx](src/App.tsx)
- [src/components/layout/DashboardLayout.tsx](src/components/layout/DashboardLayout.tsx)

### Cambios:
- Se restringió la ruta `/dashboard/boletines` al rol `administrador`
- Se ocultó el ítem de navegación de Boletines para roles no administradores

---

## 2. ✅ Mejoras UX en formularios (modo desplegable)

### Archivos modificados:
- [src/pages/AnunciosPage.tsx](src/pages/AnunciosPage.tsx)
- [src/pages/CalendarioPage.tsx](src/pages/CalendarioPage.tsx)
- [src/pages/PermisosPage.tsx](src/pages/PermisosPage.tsx)
- [src/pages/SeguimientoPage.tsx](src/pages/SeguimientoPage.tsx)
- [src/pages/CitacionesPage.tsx](src/pages/CitacionesPage.tsx)
- [src/pages/AsistenciaPage.tsx](src/pages/AsistenciaPage.tsx)

### Cambios:
- Formularios principales convertidos a tarjetas desplegables con botón
- Apertura automática del formulario cuando hay errores de validación/guardado
- Cierre automático al guardar (excepto Asistencia para carga continua)
- En Asistencia, el formulario permanece abierto tras registrar y retorna foco al selector de estudiante

---

## 3. ✅ Anuncios: destinatarios múltiples con checkboxes

### Archivo modificado:
- [src/pages/AnunciosPage.tsx](src/pages/AnunciosPage.tsx)

### Cambios:
- Reemplazo de selector único por lista de checkboxes
- Lógica de selección múltiple con regla `todos` exclusivo

---

## 4. ✅ Calendario: solo eventos próximos

### Archivo modificado:
- [src/pages/CalendarioPage.tsx](src/pages/CalendarioPage.tsx)

### Cambios:
- Eliminación del filtro manual por rango de fechas
- Listado enfocado en eventos vigentes/próximos (sin eventos pasados)
- Ordenamiento por proximidad de fecha

---

## 5. ✅ Corrección de borrado de anuncios (RLS)

### Archivos modificados:
- [src/pages/AnunciosPage.tsx](src/pages/AnunciosPage.tsx)
- [supabase-schema.sql](supabase-schema.sql)
- [migrations/20260301_fix_anuncios_delete_policy.sql](migrations/20260301_fix_anuncios_delete_policy.sql)

### Cambios:
- Validación frontend de borrado mejorada para evitar falsos positivos
- Ajuste de política SQL de `DELETE` para anuncios
- Migración nueva para aplicar corrección en entornos ya desplegados

---

## Fecha: 31 de Enero de 2026

---

## 1. ✅ Actualización de Periodos Académicos

### Archivos modificados:
- [supabase-schema.sql](supabase-schema.sql)
- [SUPABASE_SETUP.md](SUPABASE_SETUP.md)

### Cambios:
- **Se removió el Cuarto Periodo** (que iba de 2026-12-01 a 2027-01-31)
- **Los periodos ahora son 3:**
  1. Primer Periodo: 2026-02-01 a 2026-04-30
  2. Segundo Periodo: 2026-05-01 a 2026-08-30
  3. Tercer Periodo: 2026-09-01 a 2026-11-30

---

## 2. ✅ Validación de Promedio en Boletines

### Archivo modificado:
- [supabase-schema.sql](supabase-schema.sql) (tabla `boletines`)

### Cambios:
Se agregó un `CHECK constraint` al campo `promedio_general`:

```sql
promedio_general DECIMAL(5,2) CHECK (promedio_general IS NULL OR (promedio_general >= 10 AND promedio_general <= 100))
```

**Beneficio:** Garantiza que los promedios registrados estén siempre en el rango válido (10-100) o sean NULL.

---

## 3. ✅ Mejora de Manejo de Errores en Autenticación

### Archivo modificado:
- [src/lib/auth-store.ts](src/lib/auth-store.ts)

### Cambios implementados:

#### a) **Método `signIn`:**
- Ahora proporciona mensajes de error más descriptivos
- Valida y proporciona mensajes legibles al usuario
- Ejemplo: En lugar de lanzar un objeto error, ahora lanza un `Error` con mensaje personalizado

#### b) **Método `signOut`:**
- Mensajes de error mejorados y consistentes
- Mejor manejo de excepciones

#### c) **Método `initialize`:**
- Cambio de `console.error` a `console.warn` para errores no críticos
- Agregado manejo de errores en el listener de cambios de autenticación
- El proceso de inicialización no se interrumpe si no se puede obtener el perfil

### Ejemplo de mejora:
**Antes:**
```typescript
if (error) throw error
```

**Después:**
```typescript
if (error) {
  const errorMessage = error.message || 'Error desconocido al iniciar sesión'
  console.error('Error signing in:', error)
  throw new Error(errorMessage)
}
```

---

## 4. ✅ Agregar Archivo de Configuración ESLint

### Archivo creado:
- [.eslintrc.cjs](.eslintrc.cjs)

### Configuración:
- ESLint rules para TypeScript
- React hooks linting
- React refresh component validation

---

## 🔍 Resumen de Cambios

| Área | Estado | Descripción |
|------|--------|-------------|
| **Periodos Académicos** | ✅ Actualizado | 3 periodos de 2026 |
| **Validación de Datos** | ✅ Mejorado | CHECK constraint en promedio_general |
| **Manejo de Errores** | ✅ Mejorado | Mensajes claros y consistentes |
| **Linting** | ✅ Configurado | .eslintrc.cjs agregado |
| **Documentación** | ✅ Actualizada | SUPABASE_SETUP.md sincronizado |

---

## 🚀 Próximos Pasos Recomendados

1. **Implementar sistema de notificaciones** (React Hot Toast o similar) para mostrar errores de forma más visual
2. **Agregar validaciones de rango** en el lado del cliente para notas (10-100)
3. **Crear tests unitarios** para las funciones de autenticación
4. **Documentar las políticas RLS** con ejemplos de uso
5. **Implementar módulos pendientes** (Boletines, Asistencia, Notas, etc.)

---

## 📚 Referencias

- [Schema de Base de Datos](supabase-schema.sql)
- [Guía de Configuración Supabase](SUPABASE_SETUP.md)
- [Auth Store](src/lib/auth-store.ts)
- [ESLint Config](.eslintrc.cjs)

---

**Proyecto actualizado y listo para continuar desarrollo** ✨
