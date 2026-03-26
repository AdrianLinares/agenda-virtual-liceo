BEGIN;

-- =====================================================
-- Performance pass: indexes + RLS initplan optimizations
-- Fecha: 2026-03-22
-- =====================================================

-- -----------------------------
-- 1) Indexes de alto impacto
-- -----------------------------

-- Filtros frecuentes de perfiles para selectores y admins
CREATE INDEX IF NOT EXISTS idx_profiles_role_active_name
ON public.profiles (rol, activo, nombre_completo);

-- Bandeja de mensajes y contadores por estado
CREATE INDEX IF NOT EXISTS idx_mensajes_destinatario_created_at
ON public.mensajes (destinatario_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_mensajes_remitente_created_at
ON public.mensajes (remitente_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_mensajes_destinatario_estado
ON public.mensajes (destinatario_id, estado);

-- Permisos y citaciones ordenadas por fecha
CREATE INDEX IF NOT EXISTS idx_permisos_estudiante_created_at
ON public.permisos (estudiante_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_citaciones_estudiante_fecha
ON public.citaciones (estudiante_id, fecha_citacion DESC);

-- RLS y joins frecuentes docente <-> grupo <-> estudiante
CREATE INDEX IF NOT EXISTS idx_asignaciones_docentes_docente_grupo
ON public.asignaciones_docentes (docente_id, grupo_id);

CREATE INDEX IF NOT EXISTS idx_estudiantes_grupos_grupo_estudiante_estado
ON public.estudiantes_grupos (grupo_id, estudiante_id, estado);

-- Filtros por destinatarios en arrays (anuncios/eventos)
CREATE INDEX IF NOT EXISTS idx_anuncios_destinatarios_gin
ON public.anuncios USING GIN (destinatarios);

CREATE INDEX IF NOT EXISTS idx_eventos_destinatarios_gin
ON public.eventos USING GIN (destinatarios);

-- -----------------------------
-- 2) RLS auth initplan
-- Reemplazar auth.uid() por (select auth.uid()) en politicas
-- de alto trafico para evitar re-evaluacion por fila.
-- -----------------------------

-- MENSAJES
DROP POLICY IF EXISTS "View own messages" ON public.mensajes;
CREATE POLICY "View own messages"
ON public.mensajes
FOR SELECT
USING (
  remitente_id = (SELECT auth.uid())
  OR destinatario_id = (SELECT auth.uid())
);

DROP POLICY IF EXISTS "Update received messages" ON public.mensajes;
CREATE POLICY "Update received messages"
ON public.mensajes
FOR UPDATE
USING (destinatario_id = (SELECT auth.uid()));

DROP POLICY IF EXISTS "Send messages" ON public.mensajes;
CREATE POLICY "Send messages"
ON public.mensajes
FOR INSERT
WITH CHECK (
  remitente_id = (SELECT auth.uid())
  AND (
    COALESCE(public.get_user_role() IN ('administrador', 'administrativo', 'docente'), false)
    OR (
      public.get_user_role() = 'estudiante'
      AND EXISTS (
        SELECT 1
        FROM public.profiles p
        WHERE p.id = destinatario_id
          AND p.rol = 'docente'
      )
    )
    OR (
      public.get_user_role() = 'padre'
      AND EXISTS (
        SELECT 1
        FROM public.profiles p
        WHERE p.id = destinatario_id
          AND p.rol IN ('docente', 'administrativo', 'administrador')
      )
    )
  )
);

-- ANUNCIOS
DROP POLICY IF EXISTS "Staff create announcements" ON public.anuncios;
CREATE POLICY "Staff create announcements"
ON public.anuncios
FOR INSERT
WITH CHECK (
  EXISTS (
    SELECT 1
    FROM public.profiles p
    WHERE p.id = (SELECT auth.uid())
      AND p.rol IN ('docente', 'administrativo', 'administrador')
  )
);

DROP POLICY IF EXISTS "Author modifies own announcements" ON public.anuncios;

DROP POLICY IF EXISTS "Staff update announcements" ON public.anuncios;
CREATE POLICY "Staff update announcements"
ON public.anuncios
FOR UPDATE
USING (
  autor_id = (SELECT auth.uid())
  OR COALESCE(public.get_user_role() IN ('administrador', 'administrativo'), false)
)
WITH CHECK (
  autor_id = (SELECT auth.uid())
  OR COALESCE(public.get_user_role() IN ('administrador', 'administrativo'), false)
);

DROP POLICY IF EXISTS "Staff delete announcements" ON public.anuncios;
CREATE POLICY "Staff delete announcements"
ON public.anuncios
FOR DELETE
USING (
  autor_id = (SELECT auth.uid())
  OR COALESCE(public.get_user_role() IN ('administrador', 'administrativo'), false)
);

-- ESTUDIANTES_GRUPOS
DROP POLICY IF EXISTS "Teachers view assigned estudiantes_grupos" ON public.estudiantes_grupos;
CREATE POLICY "Teachers view assigned estudiantes_grupos"
ON public.estudiantes_grupos
FOR SELECT
USING (
  EXISTS (
    SELECT 1
    FROM public.asignaciones_docentes ad
    WHERE ad.docente_id = (SELECT auth.uid())
      AND ad.grupo_id = estudiantes_grupos.grupo_id
  )
);

DROP POLICY IF EXISTS "Students view own estudiantes_grupos" ON public.estudiantes_grupos;
CREATE POLICY "Students view own estudiantes_grupos"
ON public.estudiantes_grupos
FOR SELECT
USING (estudiante_id = (SELECT auth.uid()));

DROP POLICY IF EXISTS "Parents view children estudiantes_grupos" ON public.estudiantes_grupos;
CREATE POLICY "Parents view children estudiantes_grupos"
ON public.estudiantes_grupos
FOR SELECT
USING (
  EXISTS (
    SELECT 1
    FROM public.padres_estudiantes pe
    WHERE pe.padre_id = (SELECT auth.uid())
      AND pe.estudiante_id = estudiantes_grupos.estudiante_id
  )
);

-- ASIGNACIONES_DOCENTES
DROP POLICY IF EXISTS "Teachers view own asignaciones_docentes" ON public.asignaciones_docentes;
CREATE POLICY "Teachers view own asignaciones_docentes"
ON public.asignaciones_docentes
FOR SELECT
USING (docente_id = (SELECT auth.uid()));

-- PERMISOS
DROP POLICY IF EXISTS "View own permissions" ON public.permisos;
CREATE POLICY "View own permissions"
ON public.permisos
FOR SELECT
USING (
  estudiante_id = (SELECT auth.uid())
  OR solicitado_por = (SELECT auth.uid())
  OR EXISTS (
    SELECT 1
    FROM public.padres_estudiantes pe
    WHERE pe.padre_id = (SELECT auth.uid())
      AND pe.estudiante_id = permisos.estudiante_id
  )
);

DROP POLICY IF EXISTS "Create permissions" ON public.permisos;
CREATE POLICY "Create permissions"
ON public.permisos
FOR INSERT
WITH CHECK (
  solicitado_por = (SELECT auth.uid())
  AND (
    estudiante_id = (SELECT auth.uid())
    OR EXISTS (
      SELECT 1
      FROM public.padres_estudiantes pe
      WHERE pe.padre_id = (SELECT auth.uid())
        AND pe.estudiante_id = permisos.estudiante_id
    )
  )
);

-- BOLETINES
DROP POLICY IF EXISTS "Students view own boletines" ON public.boletines;
CREATE POLICY "Students view own boletines"
ON public.boletines
FOR SELECT
USING (estudiante_id = (SELECT auth.uid()));

DROP POLICY IF EXISTS "Parents view children boletines" ON public.boletines;
CREATE POLICY "Parents view children boletines"
ON public.boletines
FOR SELECT
USING (
  EXISTS (
    SELECT 1
    FROM public.padres_estudiantes pe
    WHERE pe.padre_id = (SELECT auth.uid())
      AND pe.estudiante_id = boletines.estudiante_id
  )
);

DROP POLICY IF EXISTS "Admin staff view all boletines" ON public.boletines;
CREATE POLICY "Admin staff view all boletines"
ON public.boletines
FOR SELECT
USING (
  EXISTS (
    SELECT 1
    FROM public.profiles p
    WHERE p.id = (SELECT auth.uid())
      AND p.rol IN ('administrador', 'administrativo')
  )
);

-- ASISTENCIAS
DROP POLICY IF EXISTS "Admin staff view all attendance" ON public.asistencias;
CREATE POLICY "Admin staff view all attendance"
ON public.asistencias
FOR SELECT
USING (
  EXISTS (
    SELECT 1
    FROM public.profiles p
    WHERE p.id = (SELECT auth.uid())
      AND p.rol IN ('administrador', 'administrativo')
  )
);

COMMIT;
