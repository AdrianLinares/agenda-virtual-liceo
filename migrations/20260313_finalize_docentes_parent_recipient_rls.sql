BEGIN;

-- Consolidación final de RLS para filtros de destinatarios (docentes -> padres).
-- Esta migración deja explícitamente obsoleto el enfoque previo de 20260313_allow_docentes_parent_recipient_filters.sql
-- y mantiene únicamente la versión anti-recursión basada en función SECURITY DEFINER.

CREATE OR REPLACE FUNCTION public.teacher_has_student_in_assigned_group(p_student_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
    SELECT EXISTS (
        SELECT 1
        FROM public.estudiantes_grupos eg
        JOIN public.asignaciones_docentes ad
          ON ad.grupo_id = eg.grupo_id
        WHERE ad.docente_id = auth.uid()
          AND eg.estudiante_id = p_student_id
          AND eg.estado = 'activo'
    );
$$;

REVOKE ALL ON FUNCTION public.teacher_has_student_in_assigned_group(UUID) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.teacher_has_student_in_assigned_group(UUID) TO authenticated;

-- Políticas finales en padres_estudiantes
DROP POLICY IF EXISTS "Teachers view assigned padres_estudiantes" ON public.padres_estudiantes;
CREATE POLICY "Teachers view assigned padres_estudiantes"
ON public.padres_estudiantes
FOR SELECT
USING (
    public.get_user_role() = 'docente'
    AND public.teacher_has_student_in_assigned_group(estudiante_id)
);

-- Políticas finales en profiles
DROP POLICY IF EXISTS "Teachers view parents of assigned students" ON public.profiles;
CREATE POLICY "Teachers view parents of assigned students"
ON public.profiles
FOR SELECT
USING (
    public.get_user_role() = 'docente'
    AND rol = 'padre'
    AND EXISTS (
        SELECT 1
        FROM public.padres_estudiantes pe
        WHERE pe.padre_id = profiles.id
          AND public.teacher_has_student_in_assigned_group(pe.estudiante_id)
    )
);

COMMENT ON FUNCTION public.teacher_has_student_in_assigned_group(UUID)
IS 'Helper anti-recursión RLS: valida si el docente autenticado tiene asignado al estudiante en algún grupo activo.';

COMMIT;
