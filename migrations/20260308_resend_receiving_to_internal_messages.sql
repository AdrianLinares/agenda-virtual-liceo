-- =====================================================
-- CONVERSION DE EVENTOS INBOUND A MENSAJES INTERNOS
-- =====================================================

ALTER TABLE public.received_email_events
    ADD COLUMN IF NOT EXISTS internal_message_id UUID REFERENCES public.mensajes(id) ON DELETE SET NULL,
    ADD COLUMN IF NOT EXISTS processed_at TIMESTAMPTZ;

CREATE INDEX IF NOT EXISTS idx_received_email_events_internal_message
    ON public.received_email_events (internal_message_id);

CREATE OR REPLACE FUNCTION public.create_message_from_received_email(
    p_resend_email_id TEXT,
    p_remitente_id UUID,
    p_destinatario_id UUID,
    p_asunto TEXT,
    p_contenido TEXT
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_event_row public.received_email_events%ROWTYPE;
    v_message_id UUID;
BEGIN
    SELECT *
      INTO v_event_row
    FROM public.received_email_events
    WHERE resend_email_id = p_resend_email_id
    FOR UPDATE;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'No existe received_email_events para resend_email_id=%', p_resend_email_id;
    END IF;

    IF v_event_row.internal_message_id IS NOT NULL THEN
        RETURN v_event_row.internal_message_id;
    END IF;

    INSERT INTO public.mensajes (
        remitente_id,
        destinatario_id,
        asunto,
        contenido,
        estado
    )
    VALUES (
        p_remitente_id,
        p_destinatario_id,
        p_asunto,
        p_contenido,
        'enviado'
    )
    RETURNING id INTO v_message_id;

    UPDATE public.received_email_events
       SET internal_message_id = v_message_id,
           processed_at = NOW(),
           updated_at = NOW()
     WHERE id = v_event_row.id;

    RETURN v_message_id;
END;
$$;
