-- =====================================================
-- LIMPIAR POLÍTICAS RLS RECURSIVAS EN PROFILES
-- =====================================================
-- Eliminar políticas que causan recursión (usan EXISTS con profiles)
DROP POLICY IF EXISTS "Admins view all profiles" ON profiles;
DROP POLICY IF EXISTS "Admins update any profile" ON profiles;

-- Las políticas correctas que deben quedarse son:
-- 1. "Enable read access for own profile" - (auth.uid() = id)
-- 2. "Enable insert for service role only" - service_role
-- 3. "Enable insert for authenticated users" - authenticated
-- 4. "Enable update for users based on id" - (auth.uid() = id)
-- 5. "Admins can view all profiles" - is_admin() ✓ SECURITY DEFINER
-- 6. "Teachers view their students" - is_docente() ✓ SECURITY DEFINER
-- 7. "Parents view their children" - padres_estudiantes (sin recursión)
-- 8. "Only admins modify profiles" - is_admin() ✓ SECURITY DEFINER
-- 9. "Users can view own profile" - (auth.uid() = id) - REDUNDANTE pero harmless

-- Verificar que quedaron las políticas correctas
SELECT schemaname, tablename, policyname, permissive, roles, cmd, qual
FROM pg_policies 
WHERE tablename = 'profiles'
ORDER BY policyname;
