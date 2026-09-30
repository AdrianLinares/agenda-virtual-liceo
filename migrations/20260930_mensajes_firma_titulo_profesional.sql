-- =====================================================
-- FIRMA INSTITUCIONAL EN MENSAJES
-- =====================================================
-- La firma se deriva del perfil del remitente (nombre_completo + titulo_profesional)
-- y se congela en mensajes.firma en el momento del envio, de modo que el registro
-- historico no cambie si despues el admin edita el titulo del usuario.

ALTER TABLE public.profiles
    ADD COLUMN IF NOT EXISTS titulo_profesional TEXT;

ALTER TABLE public.mensajes
    ADD COLUMN IF NOT EXISTS firma TEXT;

COMMENT ON COLUMN public.profiles.titulo_profesional IS
    'Titulo profesional del docente o administrativo. Se usa para componer la firma de los mensajes internos.';

COMMENT ON COLUMN public.mensajes.firma IS
    'Snapshot de la firma institucional del remitente al enviar. NULL para roles sin firma.';
