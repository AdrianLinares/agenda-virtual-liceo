-- Fix: garantizar lectura de boletines para roles administrativos
-- Fecha: 2026-03-07

DROP POLICY IF EXISTS "Admin staff view all boletines" ON public.boletines;

CREATE POLICY "Admin staff view all boletines"
ON public.boletines
FOR SELECT
USING (
  EXISTS (
    SELECT 1
    FROM public.profiles p
    WHERE p.id = auth.uid()
      AND p.rol IN ('administrador', 'administrativo')
  )
);
