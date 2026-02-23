-- =====================================================
-- CORREGIR POLÍTICAS RLS - SIN RECURSIÓN INFINITA
-- =====================================================
-- Ejecutar este script en Supabase SQL Editor
-- para corregir el error "infinite recursion detected in policy"

BEGIN;

-- =====================================================
-- 1. ELIMINAR TODAS LAS POLÍTICAS EXISTENTES
-- =====================================================

DROP POLICY IF EXISTS "Users can view own profile" ON profiles;
DROP POLICY IF EXISTS "Admins can view all profiles" ON profiles;
DROP POLICY IF EXISTS "Teachers view their students" ON profiles;
DROP POLICY IF EXISTS "Parents view their children" ON profiles;
DROP POLICY IF EXISTS "Only admins modify profiles" ON profiles;

DROP POLICY IF EXISTS "Students view own grades" ON notas;
DROP POLICY IF EXISTS "Parents view children grades" ON notas;
DROP POLICY IF EXISTS "Teachers manage their subject grades" ON notas;
DROP POLICY IF EXISTS "Staff view all grades" ON notas;

DROP POLICY IF EXISTS "Students view own attendance" ON asistencias;
DROP POLICY IF EXISTS "Parents view children attendance" ON asistencias;
DROP POLICY IF EXISTS "Teachers manage attendance" ON asistencias;

DROP POLICY IF EXISTS "Staff create announcements" ON anuncios;
DROP POLICY IF EXISTS "Staff review permissions" ON permisos;
DROP POLICY IF EXISTS "Staff manage boletines" ON boletines;
DROP POLICY IF EXISTS "Staff manage seguimientos" ON seguimientos;
DROP POLICY IF EXISTS "Staff manage citaciones" ON citaciones;

DROP POLICY IF EXISTS "Admin modify grados" ON grados;
DROP POLICY IF EXISTS "Admin modify grupos" ON grupos;
DROP POLICY IF EXISTS "Admin modify asignaturas" ON asignaturas;
DROP POLICY IF EXISTS "Admin modify periodos" ON periodos;
DROP POLICY IF EXISTS "Admin modify estudiantes_grupos" ON estudiantes_grupos;
DROP POLICY IF EXISTS "Admin modify padres_estudiantes" ON padres_estudiantes;
DROP POLICY IF EXISTS "Admin modify asignaciones" ON asignaciones_docentes;
DROP POLICY IF EXISTS "Staff manage horarios" ON horarios;

-- =====================================================
-- 2. CREAR/RECREAR FUNCIONES HELPER (SIN RECURSIÓN)
-- =====================================================

CREATE OR REPLACE FUNCTION public.get_user_role()
RETURNS user_role
LANGUAGE sql
SECURITY DEFINER
STABLE
SET search_path = public
AS $$
    SELECT rol FROM public.profiles WHERE id = auth.uid() LIMIT 1;
$$;

CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
STABLE
SET search_path = public
AS $$
    SELECT COALESCE((SELECT rol FROM public.profiles WHERE id = auth.uid() LIMIT 1) = 'administrador', false);
$$;

CREATE OR REPLACE FUNCTION public.is_admin_or_staff()
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
STABLE
SET search_path = public
AS $$
    SELECT COALESCE(
        (SELECT rol FROM public.profiles WHERE id = auth.uid() LIMIT 1) 
        IN ('administrador', 'administrativo'),
        false
    );
$$;

CREATE OR REPLACE FUNCTION public.is_docente()
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
STABLE
SET search_path = public
AS $$
    SELECT COALESCE((SELECT rol FROM public.profiles WHERE id = auth.uid() LIMIT 1) = 'docente', false);
$$;

CREATE OR REPLACE FUNCTION public.is_staff_or_teacher()
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
STABLE
SET search_path = public
AS $$
    SELECT COALESCE(
        (SELECT rol FROM public.profiles WHERE id = auth.uid() LIMIT 1) 
        IN ('administrador', 'administrativo', 'docente'),
        false
    );
$$;

-- =====================================================
-- 3. POLÍTICAS PARA PROFILES (SIN RECURSIÓN)
-- =====================================================

-- Los usuarios pueden ver su propio perfil
CREATE POLICY "Users can view own profile"
    ON profiles FOR SELECT
    USING (auth.uid() = id);

-- Los administradores pueden ver todos los perfiles
CREATE POLICY "Admins can view all profiles"
    ON profiles FOR SELECT
    USING (public.is_admin());

-- Docentes pueden ver estudiantes de sus grupos
CREATE POLICY "Teachers view their students"
    ON profiles FOR SELECT
    USING (
        public.is_docente() AND (
            rol = 'estudiante' AND EXISTS (
                SELECT 1 FROM estudiantes_grupos eg
                JOIN asignaciones_docentes ad ON ad.grupo_id = eg.grupo_id
                WHERE eg.estudiante_id = profiles.id
                AND ad.docente_id = auth.uid()
            )
        )
    );

-- Padres pueden ver el perfil de sus hijos
CREATE POLICY "Parents view their children"
    ON profiles FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM padres_estudiantes
            WHERE padre_id = auth.uid() AND estudiante_id = profiles.id
        )
    );

-- Solo administradores pueden modificar perfiles
CREATE POLICY "Only admins modify profiles"
    ON profiles FOR ALL
    USING (public.is_admin())
    WITH CHECK (public.is_admin());

-- =====================================================
-- 4. POLÍTICAS PARA NOTAS (SIN RECURSIÓN)
-- =====================================================

-- Estudiantes ven sus propias notas
CREATE POLICY "Students view own grades"
    ON notas FOR SELECT
    USING (estudiante_id = auth.uid());

-- Padres ven notas de sus hijos
CREATE POLICY "Parents view children grades"
    ON notas FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM padres_estudiantes
            WHERE padre_id = auth.uid() AND estudiante_id = notas.estudiante_id
        )
    );

-- Docentes gestionan notas de sus asignaturas
CREATE POLICY "Teachers manage their subject grades"
    ON notas FOR ALL
    USING (
        EXISTS (
            SELECT 1 FROM asignaciones_docentes
            WHERE docente_id = auth.uid()
            AND grupo_id = notas.grupo_id
            AND asignatura_id = notas.asignatura_id
        )
    );

-- Administrativos ven todas las notas
CREATE POLICY "Staff view all grades"
    ON notas FOR SELECT
    USING (public.is_admin_or_staff());

-- =====================================================
-- 5. POLÍTICAS PARA ASISTENCIAS (SIN RECURSIÓN)
-- =====================================================

-- Estudiantes ven su propia asistencia
CREATE POLICY "Students view own attendance"
    ON asistencias FOR SELECT
    USING (estudiante_id = auth.uid());

-- Padres ven asistencia de sus hijos
CREATE POLICY "Parents view children attendance"
    ON asistencias FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM padres_estudiantes
            WHERE padre_id = auth.uid() AND estudiante_id = asistencias.estudiante_id
        )
    );

-- Docentes gestionan asistencia de sus grupos
CREATE POLICY "Teachers manage attendance"
    ON asistencias FOR ALL
    USING (
        EXISTS (
            SELECT 1 FROM asignaciones_docentes
            WHERE docente_id = auth.uid() AND grupo_id = asistencias.grupo_id
        )
    );

-- =====================================================
-- 6. POLÍTICAS PARA ANUNCIOS (SIN RECURSIÓN)
-- =====================================================

-- Docentes y administrativos crean anuncios
CREATE POLICY "Staff create announcements"
    ON anuncios FOR INSERT
    WITH CHECK (public.is_staff_or_teacher());

-- =====================================================
-- 7. POLÍTICAS PARA PERMISOS (SIN RECURSIÓN)
-- =====================================================

-- Staff revisa permisos
CREATE POLICY "Staff review permissions"
    ON permisos FOR UPDATE
    USING (public.is_staff_or_teacher());

-- =====================================================
-- 8. POLÍTICAS PARA ESTRUCTURA ACADÉMICA (SIN RECURSIÓN)
-- =====================================================

-- Solo admin modifica estructura
CREATE POLICY "Admin modify grados" ON grados FOR ALL
    USING (public.is_admin_or_staff())
    WITH CHECK (public.is_admin_or_staff());

CREATE POLICY "Admin modify grupos" ON grupos FOR ALL
    USING (public.is_admin_or_staff())
    WITH CHECK (public.is_admin_or_staff());

CREATE POLICY "Admin modify asignaturas" ON asignaturas FOR ALL
    USING (public.is_admin_or_staff())
    WITH CHECK (public.is_admin_or_staff());

CREATE POLICY "Admin modify periodos" ON periodos FOR ALL
    USING (public.is_admin_or_staff())
    WITH CHECK (public.is_admin_or_staff());

-- Admin modifica relaciones
CREATE POLICY "Admin modify estudiantes_grupos" ON estudiantes_grupos FOR ALL
    USING (public.is_admin_or_staff())
    WITH CHECK (public.is_admin_or_staff());

CREATE POLICY "Admin modify padres_estudiantes" ON padres_estudiantes FOR ALL
    USING (public.is_admin_or_staff())
    WITH CHECK (public.is_admin_or_staff());

CREATE POLICY "Admin modify asignaciones" ON asignaciones_docentes FOR ALL
    USING (public.is_admin_or_staff())
    WITH CHECK (public.is_admin_or_staff());

-- =====================================================
-- 9. POLÍTICAS PARA HORARIOS (SIN RECURSIÓN)
-- =====================================================

CREATE POLICY "Staff manage horarios" ON horarios FOR ALL
    USING (public.is_staff_or_teacher())
    WITH CHECK (public.is_staff_or_teacher());

-- =====================================================
-- 9. POLÍTICAS PARA BOLETINES (SIN RECURSIÓN)
-- =====================================================

CREATE POLICY "Staff manage boletines" ON boletines FOR ALL
    USING (public.is_admin_or_staff())
    WITH CHECK (public.is_admin_or_staff());

-- =====================================================
-- 10. POLÍTICAS PARA SEGUIMIENTOS (SIN RECURSIÓN)
-- =====================================================

CREATE POLICY "Staff manage seguimientos" ON seguimientos FOR ALL
    USING (public.is_staff_or_teacher())
    WITH CHECK (public.is_staff_or_teacher());

-- =====================================================
-- 11. POLÍTICAS PARA CITACIONES (SIN RECURSIÓN)
-- =====================================================

CREATE POLICY "Staff manage citaciones" ON citaciones FOR ALL
    USING (public.is_staff_or_teacher())
    WITH CHECK (public.is_staff_or_teacher());

COMMIT;
