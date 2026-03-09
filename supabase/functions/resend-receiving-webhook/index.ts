import { Webhook } from 'https://esm.sh/svix@1.86.0'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3'

type ReceivedEmailEvent = {
    type: string
    created_at?: string
    data?: {
        email_id?: string
        created_at?: string
        from?: string
        to?: string[]
        subject?: string
        message_id?: string
    }
}

type ProfileRow = {
    id: string
    email: string
    nombre_completo: string
}

const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, svix-id, svix-timestamp, svix-signature',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
}

function jsonResponse(body: Record<string, unknown>, status = 200) {
    return new Response(JSON.stringify(body), {
        status,
        headers: {
            ...corsHeaders,
            'Content-Type': 'application/json',
        },
    })
}

function parseAllowedRecipients(raw: string | null) {
    if (!raw) return []
    return raw
        .split(',')
        .map((item) => item.trim().toLowerCase())
        .filter((item) => item.length > 0)
}

function extractSvixHeaders(req: Request) {
    const id = req.headers.get('svix-id')
    const timestamp = req.headers.get('svix-timestamp')
    const signature = req.headers.get('svix-signature')

    if (!id || !timestamp || !signature) {
        return null
    }

    return {
        'svix-id': id,
        'svix-timestamp': timestamp,
        'svix-signature': signature,
    }
}

function cleanEmail(raw: string | null) {
    if (!raw) return null
    const email = raw.trim().toLowerCase()
    return email.length > 0 ? email : null
}

function stripEmailAddress(value: string | null | undefined) {
    if (!value) return null
    const match = value.match(/<([^>]+)>/)
    const parsed = match ? match[1] : value
    return cleanEmail(parsed)
}

function compactText(value: string, maxLength: number) {
    const normalized = value.replace(/\s+/g, ' ').trim()
    if (normalized.length <= maxLength) return normalized
    return `${normalized.slice(0, maxLength - 1)}…`
}

function buildInternalMessageBody(eventPayload: ReceivedEmailEvent, recipients: string[]) {
    const sender = eventPayload.data?.from ?? 'Remitente desconocido'
    const messageId = eventPayload.data?.message_id ?? 'No disponible'
    const emailId = eventPayload.data?.email_id ?? 'No disponible'
    const createdAt = eventPayload.data?.created_at ?? eventPayload.created_at ?? 'No disponible'

    return [
        'Se recibio un correo externo por Resend Receiving.',
        '',
        `Remitente: ${sender}`,
        `Destinatario(s) receiving: ${recipients.join(', ')}`,
        `Asunto original: ${eventPayload.data?.subject ?? '(sin asunto)'}`,
        `Fecha evento: ${createdAt}`,
        `Message-ID: ${messageId}`,
        `Resend email_id: ${emailId}`,
        '',
        'Nota: este registro viene del webhook de receiving (metadata).',
    ].join('\n')
}

Deno.serve(async (req) => {
    if (req.method === 'OPTIONS') {
        return new Response('ok', { headers: corsHeaders })
    }

    if (req.method !== 'POST') {
        return jsonResponse({ error: 'Método no permitido' }, 405)
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')
    const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? Deno.env.get('SERVICE_ROLE_KEY')
    const webhookSecret = Deno.env.get('RESEND_WEBHOOK_SECRET')

    if (!supabaseUrl || !serviceRoleKey) {
        return jsonResponse({ error: 'Configuración de Supabase incompleta en el servidor' }, 500)
    }

    if (!webhookSecret) {
        return jsonResponse({ error: 'Falta RESEND_WEBHOOK_SECRET' }, 500)
    }

    const rawPayload = await req.text()
    const svixHeaders = extractSvixHeaders(req)

    if (!svixHeaders) {
        return jsonResponse({ error: 'Faltan headers de firma Svix' }, 400)
    }

    let eventPayload: ReceivedEmailEvent
    try {
        const wh = new Webhook(webhookSecret)
        eventPayload = wh.verify(rawPayload, svixHeaders) as ReceivedEmailEvent
    } catch {
        return jsonResponse({ error: 'Firma de webhook inválida' }, 400)
    }

    if (eventPayload.type !== 'email.received') {
        return jsonResponse({ message: 'Evento ignorado', type: eventPayload.type ?? null }, 200)
    }

    const emailId = eventPayload.data?.email_id?.trim()
    const to = (eventPayload.data?.to ?? []).map((email) => email.trim().toLowerCase()).filter(Boolean)

    if (!emailId) {
        return jsonResponse({ error: 'Evento sin data.email_id' }, 400)
    }

    if (to.length === 0) {
        return jsonResponse({ error: 'Evento sin destinatarios (data.to)' }, 400)
    }

    const allowedRecipients = parseAllowedRecipients(Deno.env.get('RECEIVING_ALLOWED_TO'))
    if (allowedRecipients.length > 0) {
        const hasAllowedRecipient = to.some((email) => allowedRecipients.includes(email))
        if (!hasAllowedRecipient) {
            return jsonResponse({
                message: 'Evento ignorado por filtro de destinatario',
                recipients: to,
            }, 202)
        }
    }

    const eventCreatedAt = eventPayload.data?.created_at ?? eventPayload.created_at ?? null
    const sender = eventPayload.data?.from ?? null
    const subject = eventPayload.data?.subject ?? null
    const messageId = eventPayload.data?.message_id ?? null

    const adminClient = createClient(supabaseUrl, serviceRoleKey)

    const { error: upsertError } = await adminClient
        .from('received_email_events')
        .upsert(
            {
                resend_email_id: emailId,
                event_type: eventPayload.type,
                event_created_at: eventCreatedAt,
                sender,
                recipient_emails: to,
                subject,
                message_id: messageId,
                raw_event: eventPayload,
            },
            { onConflict: 'resend_email_id' },
        )

    if (upsertError) {
        return jsonResponse({ error: upsertError.message }, 500)
    }

    const targetUserEmail = cleanEmail(Deno.env.get('RECEIVING_TARGET_USER_EMAIL'))
    const configuredSystemSenderEmail = cleanEmail(Deno.env.get('RECEIVING_SYSTEM_SENDER_EMAIL'))

    let targetProfile: ProfileRow | null = null
    if (targetUserEmail) {
        const { data, error } = await adminClient
            .from('profiles')
            .select('id, email, nombre_completo')
            .eq('email', targetUserEmail)
            .eq('activo', true)
            .maybeSingle<ProfileRow>()

        if (error) {
            return jsonResponse({ error: `Error consultando RECEIVING_TARGET_USER_EMAIL (${targetUserEmail}): ${error.message}` }, 500)
        }

        targetProfile = data ?? null
    }

    if (!targetProfile) {
        const { data: fallbackTarget, error: fallbackTargetError } = await adminClient
            .from('profiles')
            .select('id, email, nombre_completo')
            .eq('rol', 'administrador')
            .eq('activo', true)
            .order('created_at', { ascending: true })
            .limit(1)
            .maybeSingle<ProfileRow>()

        if (fallbackTargetError || !fallbackTarget) {
            return jsonResponse({ error: 'No se encontro destinatario interno (configura RECEIVING_TARGET_USER_EMAIL valido o crea un administrador activo)' }, 500)
        }

        targetProfile = fallbackTarget
    }

    let senderProfile: ProfileRow | null = null
    if (configuredSystemSenderEmail) {
        const { data, error } = await adminClient
            .from('profiles')
            .select('id, email, nombre_completo')
            .eq('email', configuredSystemSenderEmail)
            .eq('activo', true)
            .maybeSingle<ProfileRow>()

        if (error) {
            return jsonResponse({ error: `Error consultando RECEIVING_SYSTEM_SENDER_EMAIL (${configuredSystemSenderEmail}): ${error.message}` }, 500)
        }

        senderProfile = data ?? null
    }

    if (!senderProfile) {
        const senderEmailFromInbound = stripEmailAddress(sender)
        if (senderEmailFromInbound) {
            const { data } = await adminClient
                .from('profiles')
                .select('id, email, nombre_completo')
                .eq('email', senderEmailFromInbound)
                .eq('activo', true)
                .maybeSingle<ProfileRow>()

            senderProfile = data ?? null
        }
    }

    if (!senderProfile) {
        const { data: fallbackAdmin, error: fallbackAdminError } = await adminClient
            .from('profiles')
            .select('id, email, nombre_completo')
            .eq('rol', 'administrador')
            .eq('activo', true)
            .order('created_at', { ascending: true })
            .limit(1)
            .maybeSingle<ProfileRow>()

        if (fallbackAdminError || !fallbackAdmin) {
            return jsonResponse({ error: 'No se encontro remitente de sistema (configura RECEIVING_SYSTEM_SENDER_EMAIL o un administrador activo)' }, 500)
        }

        senderProfile = fallbackAdmin
    }

    const internalSubject = compactText(`[Correo Externo] ${subject?.trim() || '(sin asunto)'}`, 180)
    const internalBody = buildInternalMessageBody(eventPayload, to)

    const { data: internalMessageId, error: routeError } = await adminClient.rpc('create_message_from_received_email', {
        p_resend_email_id: emailId,
        p_remitente_id: senderProfile.id,
        p_destinatario_id: targetProfile.id,
        p_asunto: internalSubject,
        p_contenido: internalBody,
    })

    if (routeError) {
        return jsonResponse({ error: routeError.message }, 500)
    }

    return jsonResponse({
        message: 'Evento recibido y almacenado',
        emailId,
        recipients: to,
        internalMessageId,
        routedTo: targetProfile.email,
    })
})
