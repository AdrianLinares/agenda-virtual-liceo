BEGIN;

-- Normaliza destinatarios en eventos: estudiantes -> estudiante, padres -> padre
UPDATE public.eventos
SET destinatarios = (
  SELECT ARRAY(
    SELECT DISTINCT
      CASE
        WHEN lower(value) = 'estudiantes' THEN 'estudiante'
        WHEN lower(value) = 'padres' THEN 'padre'
        ELSE lower(value)
      END
    FROM unnest(destinatarios) AS value
  )
)
WHERE destinatarios IS NOT NULL
  AND EXISTS (
    SELECT 1
    FROM unnest(destinatarios) AS value
    WHERE lower(value) IN ('estudiantes', 'padres')
  );

-- Normaliza destinatarios en anuncios: estudiantes -> estudiante, padres -> padre
UPDATE public.anuncios
SET destinatarios = (
  SELECT ARRAY(
    SELECT DISTINCT
      CASE
        WHEN lower(value) = 'estudiantes' THEN 'estudiante'
        WHEN lower(value) = 'padres' THEN 'padre'
        ELSE lower(value)
      END
    FROM unnest(destinatarios) AS value
  )
)
WHERE destinatarios IS NOT NULL
  AND EXISTS (
    SELECT 1
    FROM unnest(destinatarios) AS value
    WHERE lower(value) IN ('estudiantes', 'padres')
  );

COMMIT;
