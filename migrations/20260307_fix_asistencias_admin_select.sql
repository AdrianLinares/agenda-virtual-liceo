-- Fix: permitir a administrativo/administrador ver asistencias de todos los docentes
-- Fecha: 2026-03-07

DROP POLICY IF EXISTS "Admin staff view all attendance" ON public.asistencias;

CREATE POLICY "Admin staff view all attendance"
ON public.asistencias
FOR SELECT
USING (
  EXISTS (
    SELECT 1
    FROM public.profiles p
    WHERE p.id = auth.uid()
      AND p.rol IN ('administrador', 'administrativo')
  )
);
