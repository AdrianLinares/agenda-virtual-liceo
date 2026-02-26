BEGIN;

ALTER TABLE public.eventos ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Public read eventos" ON public.eventos;
DROP POLICY IF EXISTS "Admin staff view all events" ON public.eventos;
DROP POLICY IF EXISTS "Users view targeted events" ON public.eventos;
DROP POLICY IF EXISTS "Staff create events" ON public.eventos;
DROP POLICY IF EXISTS "Staff update events" ON public.eventos;
DROP POLICY IF EXISTS "Staff delete events" ON public.eventos;

CREATE POLICY "Admin staff view all events"
ON public.eventos
FOR SELECT
USING (
  COALESCE(public.get_user_role() IN ('administrador', 'administrativo'), false)
);

CREATE POLICY "Users view targeted events"
ON public.eventos
FOR SELECT
USING (
  destinatarios IS NULL
  OR array_length(destinatarios, 1) IS NULL
  OR destinatarios @> ARRAY['todos']::TEXT[]
  OR destinatarios @> ARRAY[public.get_user_role()::TEXT]
);

CREATE POLICY "Staff create events"
ON public.eventos
FOR INSERT
WITH CHECK (
  EXISTS (
    SELECT 1
    FROM public.profiles
    WHERE id = auth.uid()
      AND rol IN ('docente', 'administrativo', 'administrador')
  )
);

CREATE POLICY "Staff update events"
ON public.eventos
FOR UPDATE
USING (
  creado_por = auth.uid()
  OR COALESCE(public.get_user_role() IN ('administrador', 'administrativo'), false)
)
WITH CHECK (
  creado_por = auth.uid()
  OR COALESCE(public.get_user_role() IN ('administrador', 'administrativo'), false)
);

CREATE POLICY "Staff delete events"
ON public.eventos
FOR DELETE
USING (
  creado_por = auth.uid()
  OR COALESCE(public.get_user_role() IN ('administrador', 'administrativo'), false)
);

COMMIT;
