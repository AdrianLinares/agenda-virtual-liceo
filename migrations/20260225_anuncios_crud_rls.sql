BEGIN;

ALTER TABLE public.anuncios ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "View active announcements" ON public.anuncios;
DROP POLICY IF EXISTS "Admin staff view all announcements" ON public.anuncios;
DROP POLICY IF EXISTS "Users view targeted active announcements" ON public.anuncios;
DROP POLICY IF EXISTS "Author modifies own announcements" ON public.anuncios;
DROP POLICY IF EXISTS "Staff update announcements" ON public.anuncios;
DROP POLICY IF EXISTS "Author deletes own announcements" ON public.anuncios;
DROP POLICY IF EXISTS "Staff delete announcements" ON public.anuncios;

CREATE POLICY "Admin staff view all announcements"
ON public.anuncios
FOR SELECT
USING (
  COALESCE(public.get_user_role() IN ('administrador', 'administrativo'), false)
);

CREATE POLICY "Users view targeted active announcements"
ON public.anuncios
FOR SELECT
USING (
  (fecha_expiracion IS NULL OR fecha_expiracion > NOW())
  AND (
    destinatarios IS NULL
    OR array_length(destinatarios, 1) IS NULL
    OR destinatarios @> ARRAY['todos']::TEXT[]
    OR destinatarios @> ARRAY[public.get_user_role()::TEXT]
  )
);

CREATE POLICY "Staff create announcements"
ON public.anuncios
FOR INSERT
WITH CHECK (
  EXISTS (
    SELECT 1
    FROM public.profiles
    WHERE id = auth.uid()
      AND rol IN ('docente', 'administrativo', 'administrador')
  )
);

CREATE POLICY "Staff update announcements"
ON public.anuncios
FOR UPDATE
USING (
  autor_id = auth.uid()
  OR COALESCE(public.get_user_role() IN ('administrador', 'administrativo'), false)
)
WITH CHECK (
  autor_id = auth.uid()
  OR COALESCE(public.get_user_role() IN ('administrador', 'administrativo'), false)
);

CREATE POLICY "Staff delete announcements"
ON public.anuncios
FOR DELETE
USING (
  autor_id = auth.uid()
  OR COALESCE(public.get_user_role() IN ('administrador', 'administrativo'), false)
);

COMMIT;
