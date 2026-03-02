BEGIN;

ALTER TABLE public.anuncios ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Staff delete announcements" ON public.anuncios;
DROP POLICY IF EXISTS "Author deletes own announcements" ON public.anuncios;

CREATE POLICY "Staff delete announcements"
ON public.anuncios
FOR DELETE
USING (
  autor_id = auth.uid()
  OR EXISTS (
    SELECT 1
    FROM public.profiles
    WHERE id = auth.uid()
      AND rol IN ('administrador', 'administrativo')
  )
);

COMMIT;
