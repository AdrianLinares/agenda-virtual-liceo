BEGIN;

ALTER TABLE public.permisos ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Admin staff view all permissions" ON public.permisos;
DROP POLICY IF EXISTS "Staff review permissions" ON public.permisos;

CREATE POLICY "Admin staff view all permissions"
ON public.permisos
FOR SELECT
USING (
  COALESCE(public.get_user_role() IN ('administrador', 'administrativo'), false)
);

CREATE POLICY "Staff review permissions"
ON public.permisos
FOR UPDATE
USING (
  COALESCE(public.get_user_role() IN ('administrador', 'administrativo'), false)
)
WITH CHECK (
  COALESCE(public.get_user_role() IN ('administrador', 'administrativo'), false)
);

COMMIT;
