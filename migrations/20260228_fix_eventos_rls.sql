-- Fix: Mejorar políticas RLS para tabla eventos
BEGIN;

-- Desactivar RLS temporalmente para hacer cambios
ALTER TABLE public.eventos DISABLE ROW LEVEL SECURITY;

-- Eliminar políticas antiguas
DROP POLICY IF EXISTS "Public read eventos" ON public.eventos;
DROP POLICY IF EXISTS "Admin staff view all events" ON public.eventos;
DROP POLICY IF EXISTS "Users view targeted events" ON public.eventos;
DROP POLICY IF EXISTS "Staff create events" ON public.eventos;
DROP POLICY IF EXISTS "Staff update events" ON public.eventos;
DROP POLICY IF EXISTS "Staff delete events" ON public.eventos;

-- Re-activar RLS
ALTER TABLE public.eventos ENABLE ROW LEVEL SECURITY;

-- === POLÍTICAS DE LECTURA ===

-- Lectura: El usuario admin/administrativo puede ver todos los eventos
CREATE POLICY "Admin staff view all events" ON public.eventos
FOR SELECT
USING (
  auth.uid() IN (
    SELECT id FROM profiles WHERE rol IN ('administrador', 'administrativo')
  )
);

-- Lectura: Cualquier usuario autenticado puede ver eventos dirigidos a todos o a su rol
CREATE POLICY "Users view targeted events" ON public.eventos
FOR SELECT
USING (
  -- Eventos públicos
  destinatarios IS NULL
  OR array_length(destinatarios, 1) IS NULL
  OR destinatarios @> ARRAY['todos']::TEXT[]
  -- Eventos dirigidos al rol del usuario
  OR destinatarios @> ARRAY[
    COALESCE((SELECT rol::TEXT FROM profiles WHERE id = auth.uid()), 'estudiante')
  ]::TEXT[]
);

-- === POLÍTICAS DE ESCRITURA ===

-- Inserción: Solo docente, administrativo o administrador pueden crear eventos
CREATE POLICY "Staff can insert events" ON public.eventos
FOR INSERT
WITH CHECK (
  -- El usuario que crea debe estar autenticado
  auth.uid() IS NOT NULL
  -- Y debe tener rol de staff (docente, administrativo o administrador)
  AND (
    SELECT rol FROM profiles WHERE id = auth.uid()
  ) IN ('docente', 'administrativo', 'administrador')
);

-- Actualización: Solo el creador o admin pueden actualizar
CREATE POLICY "Staff can update events" ON public.eventos
FOR UPDATE
USING (
  -- El usuario es el creador del evento
  creado_por = auth.uid()
  OR (
    -- O es admin/administrativo
    SELECT rol FROM profiles WHERE id = auth.uid()
  ) IN ('administrador', 'administrativo')
)
WITH CHECK (
  -- El usuario es el creador del evento
  creado_por = auth.uid()
  OR (
    -- O es admin/administrativo
    SELECT rol FROM profiles WHERE id = auth.uid()
  ) IN ('administrador', 'administrativo')
);

-- Eliminación: Solo el creador o admin pueden eliminar
CREATE POLICY "Staff can delete events" ON public.eventos
FOR DELETE
USING (
  -- El usuario es el creador del evento
  creado_por = auth.uid()
  OR (
    -- O es admin/administrativo
    SELECT rol FROM profiles WHERE id = auth.uid()
  ) IN ('administrador', 'administrativo')
);

COMMIT;
