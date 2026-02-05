-- =====================================================
-- DIAGNÓSTICO Y SOLUCIÓN: PROFILE NULL
-- =====================================================
-- User ID del console.log: 33f2e51f-3959-4af6-a59f-81bb8d5ece73
-- Email: admin@liceo.edu

-- PASO 1: Verificar si existe el perfil en la tabla profiles
SELECT * FROM profiles WHERE id = '33f2e51f-3959-4af6-a59f-81bb8d5ece73';

-- PASO 2: Si no existe, crearlo manualmente
INSERT INTO profiles (id, email, nombre_completo, rol, telefono, direccion, activo)
VALUES (
  '33f2e51f-3959-4af6-a59f-81bb8d5ece73',
  'admin@liceo.edu',
  'Carlos Rodríguez',
  'administrador',
  '3001234567',
  'Calle 10 #20-30',
  true
)
ON CONFLICT (id) DO UPDATE SET
  email = EXCLUDED.email,
  nombre_completo = EXCLUDED.nombre_completo,
  rol = EXCLUDED.rol,
  telefono = EXCLUDED.telefono,
  direccion = EXCLUDED.direccion,
  activo = EXCLUDED.activo;

-- PASO 3: Verificar políticas RLS para la tabla profiles
-- Esta query debe funcionar cuando estés autenticado
SELECT * FROM profiles WHERE id = auth.uid();

-- PASO 4: Si la query anterior falla, necesitas habilitar la política RLS
-- Verifica que exista esta política (ejecuta como admin):
SELECT * FROM pg_policies WHERE tablename = 'profiles' AND policyname = 'Users can view own profile';

-- PASO 5: Si no existe la política, créala:
DROP POLICY IF EXISTS "Users can view own profile" ON profiles;

CREATE POLICY "Users can view own profile"
  ON profiles
  FOR SELECT
  USING (auth.uid() = id);

-- PASO 6: Verificar todas las políticas de profiles
SELECT schemaname, tablename, policyname, permissive, roles, cmd, qual
FROM pg_policies 
WHERE tablename = 'profiles';
