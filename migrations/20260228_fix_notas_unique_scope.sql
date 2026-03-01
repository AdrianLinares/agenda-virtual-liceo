-- Corrige alcance de unicidad de notas:
-- Debe ser único por (estudiante_id, asignatura_id, periodo_id)
-- y NO por (estudiante_id, periodo_id)

-- 1) Eliminar restricciones únicas antiguas por (estudiante_id, periodo_id)
DO $$
DECLARE
    c RECORD;
BEGIN
    FOR c IN
        SELECT conname
        FROM pg_constraint
        WHERE conrelid = 'public.notas'::regclass
          AND contype = 'u'
          AND conkey = ARRAY[
              (SELECT attnum FROM pg_attribute WHERE attrelid = 'public.notas'::regclass AND attname = 'estudiante_id'),
              (SELECT attnum FROM pg_attribute WHERE attrelid = 'public.notas'::regclass AND attname = 'periodo_id')
          ]::smallint[]
    LOOP
        EXECUTE format('ALTER TABLE public.notas DROP CONSTRAINT IF EXISTS %I', c.conname);
    END LOOP;
END $$;

-- 2) Eliminar índices únicos antiguos por (estudiante_id, periodo_id)
DO $$
DECLARE
    i RECORD;
BEGIN
    FOR i IN
        SELECT indexname
        FROM pg_indexes
        WHERE schemaname = 'public'
          AND tablename = 'notas'
          AND indexdef ILIKE '%UNIQUE%'
          AND indexdef ILIKE '%(estudiante_id, periodo_id)%'
    LOOP
        EXECUTE format('DROP INDEX IF EXISTS public.%I', i.indexname);
    END LOOP;
END $$;

-- 3) Limpiar duplicados por la clave correcta, conservando el más reciente
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

-- 4) Garantizar índice único correcto
CREATE UNIQUE INDEX IF NOT EXISTS idx_notas_unique_estudiante_asignatura_periodo
ON public.notas (estudiante_id, asignatura_id, periodo_id);
