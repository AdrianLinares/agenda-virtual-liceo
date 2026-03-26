BEGIN;

-- =====================================================
-- RLS initplan phase 2
-- Fecha: 2026-03-22
-- Objetivo: evitar re-evaluacion por fila de auth.uid() en politicas restantes
-- =====================================================

-- received_email_events
DROP POLICY IF EXISTS "Admins can read received email events" ON public.received_email_events;
CREATE POLICY "Admins can read received email events"
ON public.received_email_events
FOR SELECT
USING (
  EXISTS (
    SELECT 1
    FROM public.profiles p
    WHERE p.id = (SELECT auth.uid())
      AND p.rol = 'administrador'
  )
);

-- seguimientos
DROP POLICY IF EXISTS "Students view own seguimientos" ON public.seguimientos;
CREATE POLICY "Students view own seguimientos"
ON public.seguimientos
FOR SELECT
USING (estudiante_id = (SELECT auth.uid()));

DROP POLICY IF EXISTS "Parents view children seguimientos" ON public.seguimientos;
CREATE POLICY "Parents view children seguimientos"
ON public.seguimientos
FOR SELECT
USING (
  EXISTS (
    SELECT 1
    FROM public.padres_estudiantes
    WHERE padre_id = (SELECT auth.uid())
      AND estudiante_id = seguimientos.estudiante_id
  )
);

-- citaciones
DROP POLICY IF EXISTS "Students view own citaciones" ON public.citaciones;
CREATE POLICY "Students view own citaciones"
ON public.citaciones
FOR SELECT
USING (estudiante_id = (SELECT auth.uid()));

DROP POLICY IF EXISTS "Parents view children citaciones" ON public.citaciones;
CREATE POLICY "Parents view children citaciones"
ON public.citaciones
FOR SELECT
USING (
  EXISTS (
    SELECT 1
    FROM public.padres_estudiantes
    WHERE padre_id = (SELECT auth.uid())
      AND estudiante_id = citaciones.estudiante_id
  )
);

DROP POLICY IF EXISTS "Admin staff view all citaciones" ON public.citaciones;
CREATE POLICY "Admin staff view all citaciones"
ON public.citaciones
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1
    FROM public.profiles p
    WHERE p.id = (SELECT auth.uid())
      AND p.rol IN ('administrador', 'administrativo')
  )
);

-- profiles
DROP POLICY IF EXISTS "Enable read access for own profile" ON public.profiles;
CREATE POLICY "Enable read access for own profile"
ON public.profiles
FOR SELECT
USING ((SELECT auth.uid()) = id);

DROP POLICY IF EXISTS "Enable insert for authenticated users (for trigger)" ON public.profiles;
CREATE POLICY "Enable insert for authenticated users (for trigger)"
ON public.profiles
FOR INSERT
TO authenticated
WITH CHECK ((SELECT auth.uid()) = id);

DROP POLICY IF EXISTS "Enable update for users based on id" ON public.profiles;
CREATE POLICY "Enable update for users based on id"
ON public.profiles
FOR UPDATE
USING ((SELECT auth.uid()) = id)
WITH CHECK ((SELECT auth.uid()) = id);

DROP POLICY IF EXISTS "Users can view own profile" ON public.profiles;
CREATE POLICY "Users can view own profile"
ON public.profiles
FOR SELECT
USING ((SELECT auth.uid()) = id);

DROP POLICY IF EXISTS "Parents view their children" ON public.profiles;
CREATE POLICY "Parents view their children"
ON public.profiles
FOR SELECT
USING (
  EXISTS (
    SELECT 1
    FROM public.padres_estudiantes
    WHERE padre_id = (SELECT auth.uid())
      AND estudiante_id = profiles.id
  )
);

DROP POLICY IF EXISTS "Users can view active profiles for messaging" ON public.profiles;
CREATE POLICY "Users can view active profiles for messaging"
ON public.profiles
FOR SELECT
USING (((SELECT auth.uid()) IS NOT NULL) AND activo = true);

-- notas
DROP POLICY IF EXISTS "Students view own grades" ON public.notas;
CREATE POLICY "Students view own grades"
ON public.notas
FOR SELECT
USING (estudiante_id = (SELECT auth.uid()));

DROP POLICY IF EXISTS "Parents view children grades" ON public.notas;
CREATE POLICY "Parents view children grades"
ON public.notas
FOR SELECT
USING (
  EXISTS (
    SELECT 1
    FROM public.padres_estudiantes
    WHERE padre_id = (SELECT auth.uid())
      AND estudiante_id = notas.estudiante_id
  )
);

DROP POLICY IF EXISTS "Teachers manage their subject grades" ON public.notas;
CREATE POLICY "Teachers manage their subject grades"
ON public.notas
FOR ALL
USING (
  EXISTS (
    SELECT 1
    FROM public.asignaciones_docentes
    WHERE docente_id = (SELECT auth.uid())
      AND grupo_id = notas.grupo_id
      AND asignatura_id = notas.asignatura_id
  )
);

-- asistencias
DROP POLICY IF EXISTS "Students view own attendance" ON public.asistencias;
CREATE POLICY "Students view own attendance"
ON public.asistencias
FOR SELECT
USING (estudiante_id = (SELECT auth.uid()));

DROP POLICY IF EXISTS "Parents view children attendance" ON public.asistencias;
CREATE POLICY "Parents view children attendance"
ON public.asistencias
FOR SELECT
USING (
  EXISTS (
    SELECT 1
    FROM public.padres_estudiantes
    WHERE padre_id = (SELECT auth.uid())
      AND estudiante_id = asistencias.estudiante_id
  )
);

DROP POLICY IF EXISTS "Teachers manage attendance" ON public.asistencias;
CREATE POLICY "Teachers manage attendance"
ON public.asistencias
FOR ALL
USING (
  EXISTS (
    SELECT 1
    FROM public.asignaciones_docentes
    WHERE docente_id = (SELECT auth.uid())
      AND grupo_id = asistencias.grupo_id
  )
);

-- padres_estudiantes
DROP POLICY IF EXISTS "Read own padres_estudiantes" ON public.padres_estudiantes;
CREATE POLICY "Read own padres_estudiantes"
ON public.padres_estudiantes
FOR SELECT
USING (
  padre_id = (SELECT auth.uid())
  OR estudiante_id = (SELECT auth.uid())
  OR COALESCE(public.get_user_role() IN ('administrador', 'administrativo'), false)
);

-- eventos
DROP POLICY IF EXISTS "Admin staff view all events" ON public.eventos;
CREATE POLICY "Admin staff view all events"
ON public.eventos
FOR SELECT
USING (
  (SELECT auth.uid()) IN (
    SELECT p.id
    FROM public.profiles p
    WHERE p.rol IN ('administrador', 'administrativo')
  )
);

DROP POLICY IF EXISTS "Users view targeted events" ON public.eventos;
CREATE POLICY "Users view targeted events"
ON public.eventos
FOR SELECT
USING (
  destinatarios IS NULL
  OR array_length(destinatarios, 1) IS NULL
  OR destinatarios @> ARRAY['todos']::text[]
  OR destinatarios @> ARRAY[
    COALESCE(
      (
        SELECT p.rol::text
        FROM public.profiles p
        WHERE p.id = (SELECT auth.uid())
      ),
      'estudiante'
    )
  ]
);

DROP POLICY IF EXISTS "Staff can insert events" ON public.eventos;
CREATE POLICY "Staff can insert events"
ON public.eventos
FOR INSERT
WITH CHECK (
  (SELECT auth.uid()) IS NOT NULL
  AND (
    SELECT p.rol
    FROM public.profiles p
    WHERE p.id = (SELECT auth.uid())
  ) IN ('docente', 'administrativo', 'administrador')
);

DROP POLICY IF EXISTS "Staff can update events" ON public.eventos;
CREATE POLICY "Staff can update events"
ON public.eventos
FOR UPDATE
USING (
  creado_por = (SELECT auth.uid())
  OR (
    SELECT p.rol
    FROM public.profiles p
    WHERE p.id = (SELECT auth.uid())
  ) IN ('administrador', 'administrativo')
)
WITH CHECK (
  creado_por = (SELECT auth.uid())
  OR (
    SELECT p.rol
    FROM public.profiles p
    WHERE p.id = (SELECT auth.uid())
  ) IN ('administrador', 'administrativo')
);

DROP POLICY IF EXISTS "Staff can delete events" ON public.eventos;
CREATE POLICY "Staff can delete events"
ON public.eventos
FOR DELETE
USING (
  creado_por = (SELECT auth.uid())
  OR (
    SELECT p.rol
    FROM public.profiles p
    WHERE p.id = (SELECT auth.uid())
  ) IN ('administrador', 'administrativo')
);

COMMIT;
