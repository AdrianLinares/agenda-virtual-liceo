-- Restringir destinatarios de mensajes por rol del remitente
-- Reglas:
-- 1) Estudiante -> solo Docente
-- 2) Padre -> Docente o Administrativo
-- 3) Staff (docente/administrativo/administrador) -> sin restriccion adicional

DROP POLICY IF EXISTS "Send messages" ON public.mensajes;

CREATE POLICY "Send messages"
ON public.mensajes
FOR INSERT
WITH CHECK (
    remitente_id = auth.uid()
    AND (
        COALESCE(public.get_user_role() IN ('administrador', 'administrativo', 'docente'), false)
        OR (
            public.get_user_role() = 'estudiante'
            AND EXISTS (
                SELECT 1
                FROM public.profiles p
                WHERE p.id = destinatario_id
                  AND p.rol = 'docente'
            )
        )
        OR (
            public.get_user_role() = 'padre'
            AND EXISTS (
                SELECT 1
                FROM public.profiles p
                WHERE p.id = destinatario_id
                  AND p.rol IN ('docente', 'administrativo', 'administrador')
            )
        )
    )
);
