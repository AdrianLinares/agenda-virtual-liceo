BEGIN;

ALTER TABLE public.estudiantes_grupos ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.asignaciones_docentes ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Public read estudiantes_grupos" ON public.estudiantes_grupos;
DROP POLICY IF EXISTS "Public read asignaciones_docentes" ON public.asignaciones_docentes;
DROP POLICY IF EXISTS "Admin staff view estudiantes_grupos" ON public.estudiantes_grupos;
DROP POLICY IF EXISTS "Teachers view assigned estudiantes_grupos" ON public.estudiantes_grupos;
DROP POLICY IF EXISTS "Students view own estudiantes_grupos" ON public.estudiantes_grupos;
DROP POLICY IF EXISTS "Parents view children estudiantes_grupos" ON public.estudiantes_grupos;
DROP POLICY IF EXISTS "Admin staff view asignaciones_docentes" ON public.asignaciones_docentes;
DROP POLICY IF EXISTS "Teachers view own asignaciones_docentes" ON public.asignaciones_docentes;

CREATE POLICY "Admin staff view estudiantes_grupos"
ON public.estudiantes_grupos
FOR SELECT
USING (
    COALESCE(public.get_user_role() IN ('administrador', 'administrativo'), false)
);

CREATE POLICY "Teachers view assigned estudiantes_grupos"
ON public.estudiantes_grupos
FOR SELECT
USING (
    EXISTS (
        SELECT 1
        FROM public.asignaciones_docentes ad
        WHERE ad.docente_id = auth.uid()
          AND ad.grupo_id = estudiantes_grupos.grupo_id
    )
);

CREATE POLICY "Students view own estudiantes_grupos"
ON public.estudiantes_grupos
FOR SELECT
USING (estudiante_id = auth.uid());

CREATE POLICY "Parents view children estudiantes_grupos"
ON public.estudiantes_grupos
FOR SELECT
USING (
    EXISTS (
        SELECT 1
        FROM public.padres_estudiantes pe
        WHERE pe.padre_id = auth.uid()
          AND pe.estudiante_id = estudiantes_grupos.estudiante_id
    )
);

CREATE POLICY "Admin staff view asignaciones_docentes"
ON public.asignaciones_docentes
FOR SELECT
USING (
    COALESCE(public.get_user_role() IN ('administrador', 'administrativo'), false)
);

CREATE POLICY "Teachers view own asignaciones_docentes"
ON public.asignaciones_docentes
FOR SELECT
USING (docente_id = auth.uid());

COMMIT;
