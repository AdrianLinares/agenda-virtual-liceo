---
name: fix-rls-policy
description: Diagnosticar y corregir errores de políticas RLS en Supabase
type: skill
---

# Skill: Fix RLS Policy

Diagnosticar y corregir errores comunes de Row Level Security en Supabase.

## Errores comunes y soluciones

### 1. "infinite recursion detected in policy for relation profiles"

**Causa**: Una política RLS de `profiles` hace `SELECT FROM profiles` dentro de su condición.

**Solución**: Usar funciones `SECURITY DEFINER`:

```sql
-- Función helper para verificar si es admin
CREATE OR REPLACE FUNCTION is_admin()
RETURNS BOOLEAN
LANGUAGE SQL
SECURITY DEFINER
STABLE
AS $$
  SELECT rol = 'administrador'
  FROM profiles
  WHERE id = auth.uid()
$$;

-- Función para obtener rol del usuario
CREATE OR REPLACE FUNCTION get_user_role()
RETURNS TEXT
LANGUAGE SQL
SECURITY DEFINER
STABLE
AS $$
  SELECT rol
  FROM profiles
  WHERE id = auth.uid()
$$;

-- Política corregida
CREATE POLICY "Usuarios pueden ver su propio perfil"
  ON profiles
  FOR SELECT
  USING (
    id = auth.uid() OR is_admin()
  );
```

### 2. Políticas para docentes

```sql
-- Docentes pueden ver estudiantes de sus grupos asignados
CREATE POLICY "Docentes ven estudiantes de sus grupos"
  ON estudiantes_grupos
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM asignaciones_docentes
      WHERE docente_id = auth.uid()
      AND grupo_id = estudiantes_grupos.grupo_id
    )
  );
```

### 3. Políticas para padres

```sql
-- Padres pueden ver información de sus hijos
CREATE POLICY "Padres ven información de sus hijos"
  ON notas
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM padres_estudiantes
      WHERE padre_id = auth.uid()
      AND estudiante_id = notas.estudiante_id
    )
  );
```

### 4. Jerarquía de políticas por rol

```sql
-- Admin: acceso total
USING (is_admin())

-- Administrativo: similar a admin pero sin gestión de usuarios
USING (get_user_role() = 'administrativo' OR is_admin())

-- Docente: solo sus asignaciones
USING (
  get_user_role() = 'docente'
  AND EXISTS (
    SELECT 1 FROM asignaciones_docentes
    WHERE docente_id = auth.uid()
    AND grupo_id = tabla.grupo_id
    AND asignatura_id = tabla.asignatura_id
  )
)

-- Padre: solo sus hijos
USING (
  get_user_role() = 'padre'
  AND EXISTS (
    SELECT 1 FROM padres_estudiantes
    WHERE padre_id = auth.uid()
    AND estudiante_id = tabla.estudiante_id
  )
)

-- Estudiante: solo propio
USING (estudiante_id = auth.uid())
```

### 5. Drop y recrear políticas

```sql
BEGIN;

-- 1. Drop existente
DROP POLICY IF EXISTS nombre_policy ON tabla;

-- 2. Crear nueva política
CREATE POLICY "nombre_policy"
  ON tabla
  FOR ALL
  TO authenticated
  USING (
    -- condición de lectura
    id = auth.uid() OR is_admin()
  )
  WITH CHECK (
    -- condición de escritura
    id = auth.uid()
  );

COMMIT;
```

### 6. Debug de políticas

```sql
-- Ver políticas existentes
SELECT schemaname, tablename, policyname, permissive, roles, cmd, qual, with_check
FROM pg_policies
WHERE tablename = 'nombre_tabla';

-- Verificar si RLS está habilitado
SELECT relname, relrowsecurity, relforcerowsecurity
FROM pg_class
WHERE relname = 'nombre_tabla';

-- Testear política como usuario específico
SET LOCAL ROLE authenticated;
SET LOCAL "request.jwt.claims" TO '{"sub": "user-uuid"}';
SELECT * FROM tabla;
```

## Verificaciones post-fix

- [ ] `DROP POLICY IF EXISTS` antes de crear
- [ ] Funciones helper son `SECURITY DEFINER`
- [ ] Funciones helper son `STABLE` para query optimization
- [ ] Políticas tienen nombres descriptivos
- [ ] `ALTER TABLE ... ENABLE ROW LEVEL SECURITY` aplicado
- [ ] Grants correctos: `GRANT SELECT/INSERT/UPDATE ON tabla TO authenticated`
