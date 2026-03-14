BEGIN;

ALTER TABLE public.padres_estudiantes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Teachers view assigned padres_estudiantes" ON public.padres_estudiantes;
CREATE POLICY "Teachers view assigned padres_estudiantes"
ON public.padres_estudiantes
FOR SELECT
USING (
    EXISTS (
        SELECT 1
        FROM public.estudiantes_grupos eg
        JOIN public.asignaciones_docentes ad
          ON ad.grupo_id = eg.grupo_id
        WHERE ad.docente_id = auth.uid()
          AND eg.estudiante_id = padres_estudiantes.estudiante_id
          AND eg.estado = 'activo'
    )
);

DROP POLICY IF EXISTS "Teachers view parents of assigned students" ON public.profiles;
CREATE POLICY "Teachers view parents of assigned students"
ON public.profiles
FOR SELECT
USING (
    rol = 'padre'
    AND EXISTS (
        SELECT 1
        FROM public.padres_estudiantes pe
        JOIN public.estudiantes_grupos eg
          ON eg.estudiante_id = pe.estudiante_id
        JOIN public.asignaciones_docentes ad
          ON ad.grupo_id = eg.grupo_id
        WHERE pe.padre_id = profiles.id
          AND ad.docente_id = auth.uid()
          AND eg.estado = 'activo'
    )
);

COMMIT;
