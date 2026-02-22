-- SOLUCIÓN: Permitir que todos los usuarios puedan ver otros perfiles activos
-- para poder enviar mensajes entre sí

-- Agregar política para que usuarios autenticados puedan ver otros perfiles activos
CREATE POLICY "Users can view active profiles for messaging"
    ON profiles FOR SELECT
    USING (
        auth.uid() IS NOT NULL AND activo = true
    );

-- Verificar políticas existentes
SELECT policyname, cmd, qual 
FROM pg_policies 
WHERE tablename = 'profiles' 
ORDER BY policyname;
