-- Garantizar lectura de citaciones para roles administrativos
-- sin importar quién las programó (campo creado_por).
-- Se agrega política explícita SELECT para administrador y administrativo,
-- siguiendo el mismo patrón de boletines y asistencias.

DROP POLICY IF EXISTS "Admin staff view all citaciones" ON public.citaciones;

CREATE POLICY "Admin staff view all citaciones"
ON public.citaciones
FOR SELECT
TO authenticated
USING (
    EXISTS (
        SELECT 1
        FROM public.profiles p
        WHERE p.id = auth.uid()
          AND p.rol IN ('administrador', 'administrativo')
    )
);
