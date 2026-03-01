-- Garantiza una única nota por estudiante/asignatura/periodo
-- 1) Limpia duplicados existentes conservando el registro más reciente
WITH duplicadas AS (
    SELECT
        id,
        ROW_NUMBER() OVER (
            PARTITION BY estudiante_id, asignatura_id, periodo_id
            ORDER BY created_at DESC, id DESC
        ) AS rn
    FROM public.notas
)
DELETE FROM public.notas n
USING duplicadas d
WHERE n.id = d.id
  AND d.rn > 1;

-- 2) Crea restricción única (vía índice único) si aún no existe
CREATE UNIQUE INDEX IF NOT EXISTS idx_notas_unique_estudiante_asignatura_periodo
ON public.notas (estudiante_id, asignatura_id, periodo_id);
