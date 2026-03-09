-- =====================================================
-- WEBHOOK INBOUND DE RESEND (RECEIVING)
-- Guarda eventos email.received para pruebas sin dominio propio
-- =====================================================

CREATE TABLE IF NOT EXISTS public.received_email_events (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    resend_email_id TEXT NOT NULL UNIQUE,
    event_type TEXT NOT NULL,
    event_created_at TIMESTAMPTZ,
    sender TEXT,
    recipient_emails TEXT[] NOT NULL DEFAULT '{}',
    subject TEXT,
    message_id TEXT,
    raw_event JSONB NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_received_email_events_created_at
    ON public.received_email_events (created_at DESC);

CREATE INDEX IF NOT EXISTS idx_received_email_events_recipients
    ON public.received_email_events USING gin (recipient_emails);

ALTER TABLE public.received_email_events ENABLE ROW LEVEL SECURITY;

-- Solo administradores pueden consultar eventos inbound desde cliente.
DROP POLICY IF EXISTS "Admins can read received email events" ON public.received_email_events;

CREATE POLICY "Admins can read received email events"
    ON public.received_email_events FOR SELECT
    USING (
        EXISTS (
            SELECT 1
            FROM public.profiles p
            WHERE p.id = auth.uid()
              AND p.rol = 'administrador'
        )
    );

CREATE OR REPLACE FUNCTION public.set_received_email_events_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
    NEW.updated_at := NOW();
    RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_set_received_email_events_updated_at ON public.received_email_events;

CREATE TRIGGER trg_set_received_email_events_updated_at
BEFORE UPDATE ON public.received_email_events
FOR EACH ROW
EXECUTE FUNCTION public.set_received_email_events_updated_at();
