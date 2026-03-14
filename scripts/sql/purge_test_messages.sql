-- Purga todos los mensajes internos y su cola de notificaciones asociada.
-- Uso recomendado: Supabase SQL Editor o psql con rol de administrador.

BEGIN;

-- Opcional: apagar el feature flag para evitar nuevas encolaciones mientras limpias.
UPDATE public.feature_flags
SET enabled = false,
    updated_at = NOW()
WHERE key = 'mensajes_email_notificaciones';

-- Captura de conteos previos para reporte.
CREATE TEMP TABLE _message_purge_counts AS
SELECT
    (SELECT COUNT(*) FROM public.mensajes) AS mensajes_before,
    (SELECT COUNT(*) FROM public.email_notifications_queue) AS queue_before;

-- La cola tiene FK con ON DELETE CASCADE hacia mensajes,
-- pero se borra explícitamente primero para dejar todo limpio incluso si cambian constraints.
DELETE FROM public.email_notifications_queue;
DELETE FROM public.mensajes;

-- Resultado final de la purga.
SELECT
    mensajes_before,
    queue_before,
    (SELECT COUNT(*) FROM public.mensajes) AS mensajes_after,
    (SELECT COUNT(*) FROM public.email_notifications_queue) AS queue_after,
    (mensajes_before - (SELECT COUNT(*) FROM public.mensajes)) AS mensajes_deleted,
    (queue_before - (SELECT COUNT(*) FROM public.email_notifications_queue)) AS queue_deleted
FROM _message_purge_counts;

COMMIT;
