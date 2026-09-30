-- =====================================================
-- Remitente en el outbox de notificaciones por correo
--
-- Contexto: el correo de notificacion no lleva Reply-To, asi que las respuestas
-- se van al buzon compartido y nunca llegan al docente/administrativo. La
-- plantilla v3 deja de exponer el asunto y el preview del mensaje para que el
-- correo no se lea como una conversacion (option B + C del analisis).
--
-- Para nombrar al remitente en el cuerpo del correo hace falta remitente_nombre.
-- remitente_email se agrega aunque hoy no se use: es el prerrequisito barato
-- para cualquier Reply-To o ingesta inbound posterior, y evita una segunda
-- migracion mas adelante. Deliberadamente NO se usa todavia.
-- =====================================================

ALTER TABLE public.email_notifications_queue
    ADD COLUMN IF NOT EXISTS remitente_nombre TEXT,
    ADD COLUMN IF NOT EXISTS remitente_email TEXT;

-- Backfill desde profiles. Sin esto, los mensajes ya encolados perderian el
-- nombre del remitente hasta que se reinserte la fila.
UPDATE public.email_notifications_queue q
SET remitente_nombre = p.nombre_completo,
    remitente_email = lower(trim(p.email))
FROM public.profiles p
WHERE p.id = q.remitente_id
  AND (
    q.remitente_nombre IS DISTINCT FROM p.nombre_completo
    OR q.remitente_email IS DISTINCT FROM lower(trim(p.email))
  );

-- Trigger: encolar con remitente ya resuelto
CREATE OR REPLACE FUNCTION public.enqueue_email_notification_for_message()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_enabled BOOLEAN;
    v_destinatario_email TEXT;
    v_destinatario_nombre TEXT;
    v_remitente_email TEXT;
    v_remitente_nombre TEXT;
BEGIN
    v_enabled := public.is_feature_enabled('mensajes_email_notificaciones');

    -- Infraestructura "apagada" por defecto
    IF NOT v_enabled THEN
        RETURN NEW;
    END IF;

    SELECT p.email, p.nombre_completo
      INTO v_destinatario_email, v_destinatario_nombre
    FROM public.profiles p
    WHERE p.id = NEW.destinatario_id
      AND p.activo = true
    LIMIT 1;

    IF v_destinatario_email IS NULL THEN
        RETURN NEW;
    END IF;

    SELECT p.email, p.nombre_completo
      INTO v_remitente_email, v_remitente_nombre
    FROM public.profiles p
    WHERE p.id = NEW.remitente_id
    LIMIT 1;

    INSERT INTO public.email_notifications_queue (
        mensaje_id,
        remitente_id,
        destinatario_id,
        destinatario_email,
        destinatario_nombre,
        remitente_email,
        remitente_nombre,
        asunto,
        contenido_preview,
        status,
        next_retry_at
    )
    VALUES (
        NEW.id,
        NEW.remitente_id,
        NEW.destinatario_id,
        lower(trim(v_destinatario_email)),
        v_destinatario_nombre,
        CASE WHEN v_remitente_email IS NULL THEN NULL ELSE lower(trim(v_remitente_email)) END,
        v_remitente_nombre,
        NEW.asunto,
        left(NEW.contenido, 240),
        'pending',
        NOW()
    )
    ON CONFLICT (mensaje_id) DO NOTHING;

    RETURN NEW;
END;
$$;