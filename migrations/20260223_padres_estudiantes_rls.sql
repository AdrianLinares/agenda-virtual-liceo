BEGIN;

ALTER TABLE public.padres_estudiantes ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Public read padres_estudiantes" ON public.padres_estudiantes;
DROP POLICY IF EXISTS "Read own padres_estudiantes" ON public.padres_estudiantes;

CREATE POLICY "Read own padres_estudiantes"
ON public.padres_estudiantes
FOR SELECT
USING (
    padre_id = auth.uid()
    OR estudiante_id = auth.uid()
    OR COALESCE(public.get_user_role() IN ('administrador', 'administrativo'), false)
);

COMMIT;
