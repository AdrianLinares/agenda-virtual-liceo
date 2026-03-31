---
name: nueva-migracion
description: Crear migración SQL con patrón correcto (BEGIN/COMMIT, DROP POLICY IF EXISTS)
type: skill
---

# Skill: Nueva Migración SQL

Crear migraciones SQL siguiendo el patrón del proyecto.

## Formato de archivo

- Ubicación: `migrations/`
- Nombre: `YYYYMMDD_descripcion.sql` (ej: `20260331_agregar_columna_tabla.sql`)

## Estructura requerida

```sql
BEGIN;

-- 1. Drop políticas existentes si aplica
DROP POLICY IF EXISTS nombre_policy ON tabla;

-- 2. Crear/alterar tablas
CREATE TABLE IF NOT EXISTS nombre_tabla (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3. Crear índices para rendimiento
CREATE INDEX IF NOT EXISTS idx_tabla_columna ON tabla(columna);

-- 4. Crear políticas RLS
ALTER TABLE tabla ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Nombre descriptivo"
  ON tabla
  FOR SELECT
  USING (
    -- Usar funciones SECURITY DEFINER para evitar recursión
    auth.uid() = id OR is_admin()
  );

-- 5. Grants si aplica
GRANT SELECT ON tabla TO authenticated;

COMMIT;
```

## Funciones helper para RLS

Para evitar recursión infinita en políticas de `profiles`:

```sql
CREATE OR REPLACE FUNCTION is_admin()
RETURNS BOOLEAN
LANGUAGE SQL
SECURITY DEFINER
AS $$
  SELECT rol = 'administrador'
  FROM profiles
  WHERE id = auth.uid()
$$;

CREATE OR REPLACE FUNCTION get_user_role()
RETURNS TEXT
LANGUAGE SQL
SECURITY DEFINER
AS $$
  SELECT rol
  FROM profiles
  WHERE id = auth.uid()
$$;
```

## Patrones RLS por rol

```sql
-- Admin: acceso total
USING (is_admin())

-- Docente: solo sus asignaciones
USING (
  EXISTS (
    SELECT 1 FROM asignaciones_docentes
    WHERE docente_id = auth.uid()
    AND grupo_id = tabla.grupo_id
  )
)

-- Padre: solo sus hijos
USING (
  EXISTS (
    SELECT 1 FROM padres_estudiantes
    WHERE padre_id = auth.uid()
    AND estudiante_id = tabla.estudiante_id
  )
)

-- Estudiante: solo propio
USING (estudiante_id = auth.uid())

-- Público autenticado
USING (auth.uid() IS NOT NULL)
```

## Verificaciones

- [ ] BEGIN/COMMIT wrapping toda la migración
- [ ] DROP POLICY IF EXISTS antes de crear políticas
- [ ] Índices creados para columns usadas en WHERE/JOIN
- [ ] RLS habilitado con `ALTER TABLE ... ENABLE ROW LEVEL SECURITY`
- [ ] Funciones SECURITY DEFINER para evitar recursión
