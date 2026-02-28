-- =====================================================
-- INFRAESTRUCTURA BASE PARA NOTIFICACIONES EMAIL DE MENSAJES
-- Estado inicial: APAGADO (feature flag = false)
-- =====================================================

-- 1) Feature flags simples para activar/desactivar funcionalidades sin desplegar código
CREATE TABLE IF NOT EXISTS public.feature_flags (
    key TEXT PRIMARY KEY,
    enabled BOOLEAN NOT NULL DEFAULT false,
    description TEXT,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

INSERT INTO public.feature_flags (key, enabled, description)
VALUES (
    'mensajes_email_notificaciones',
    false,
    'Activa la encolación y procesamiento de correos por mensajes internos.'
)
ON CONFLICT (key) DO NOTHING;

-- 2) Cola de notificaciones por email (outbox)
CREATE TABLE IF NOT EXISTS public.email_notifications_queue (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    mensaje_id UUID NOT NULL REFERENCES public.mensajes(id) ON DELETE CASCADE,
    remitente_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    destinatario_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    destinatario_email TEXT NOT NULL,
    destinatario_nombre TEXT,
    asunto TEXT NOT NULL,
    contenido_preview TEXT,
    status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'processing', 'sent', 'failed', 'cancelled')),
    attempts INTEGER NOT NULL DEFAULT 0,
    next_retry_at TIMESTAMPTZ,
    sent_at TIMESTAMPTZ,
    last_error TEXT,
    provider_message_id TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT email_notifications_queue_unique_message UNIQUE (mensaje_id)
);

CREATE INDEX IF NOT EXISTS idx_email_queue_status_retry
    ON public.email_notifications_queue (status, next_retry_at, created_at);

CREATE INDEX IF NOT EXISTS idx_email_queue_destinatario
    ON public.email_notifications_queue (destinatario_id, created_at DESC);

-- RLS habilitado para evitar acceso directo desde cliente.
-- El procesamiento se hará desde Edge Functions con service role.
ALTER TABLE public.email_notifications_queue ENABLE ROW LEVEL SECURITY;

-- 3) Helper para consultar feature flag
CREATE OR REPLACE FUNCTION public.is_feature_enabled(flag_key TEXT)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
AS $$
    SELECT COALESCE((
        SELECT enabled
        FROM public.feature_flags
        WHERE key = flag_key
        LIMIT 1
    ), false);
$$;

-- 4) Trigger function: encola notificación cuando se crea mensaje (si flag activo)
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

    INSERT INTO public.email_notifications_queue (
        mensaje_id,
        remitente_id,
        destinatario_id,
        destinatario_email,
        destinatario_nombre,
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
        NEW.asunto,
        left(NEW.contenido, 240),
        'pending',
        NOW()
    )
    ON CONFLICT (mensaje_id) DO NOTHING;

    RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_enqueue_email_notification_for_message ON public.mensajes;

CREATE TRIGGER trg_enqueue_email_notification_for_message
AFTER INSERT ON public.mensajes
FOR EACH ROW
EXECUTE FUNCTION public.enqueue_email_notification_for_message();

-- 5) Trigger para updated_at en queue
CREATE OR REPLACE FUNCTION public.set_email_queue_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
    NEW.updated_at := NOW();
    RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_set_email_queue_updated_at ON public.email_notifications_queue;

CREATE TRIGGER trg_set_email_queue_updated_at
BEFORE UPDATE ON public.email_notifications_queue
FOR EACH ROW
EXECUTE FUNCTION public.set_email_queue_updated_at();
