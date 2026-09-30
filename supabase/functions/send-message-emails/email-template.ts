/**
 * Renderizado puro de la notificacion de correo para mensajes internos.
 *
 * No debe importar nada de Deno ni de URLs remotas: este modulo se ejecuta
 * tanto en la Edge Function (Deno) como en Vitest (Node/jsdom).
 *
 * Decisiones de producto que este archivo codifica (option B + C del analisis
 * del bug "las respuestas a notificaciones nunca llegan al remitente"):
 *
 * - El correo NO es un canal de respuesta. No se emite Reply-To a proposito:
 *   el From es un buzon compartido de notificaciones, sin leer, y las
 *   respuestas alli se pierden. CUALQUIER Reply-To futuro debe pasar por una
 *   decision de producto explicita, no colarse por refactor.
 * - El asunto y el preview del mensaje NO se exponen. Hacen que el correo se
 *   lea como una conversacion y disparan el "Responder" del cliente de correo.
 * - El boton de accion captura la intencion de respuesta y la lleva a la app,
 *   que es donde el flujo de respuesta si existe y queda registrado.
 */

export type QueueRow = {
    id: string
    mensaje_id: string
    destinatario_email: string
    destinatario_nombre: string | null
    remitente_nombre: string | null
    /**
     * Opcionales y NO se piden en el SELECT de la cola. Se mantienen en el tipo
     * solo para que los tests puedan pasarlos y verificar que el render los
     * ignora: exponerlos fue la causa del problema (option C). Si llegan a leerse
     * aqui, rompen el contrato del producto, no la compilacion.
     */
    asunto?: string
    contenido_preview?: string | null
    status: 'pending' | 'processing' | 'sent' | 'failed' | 'cancelled'
    attempts: number
}

export type RenderedEmail = {
    html: string
    subject: string
    text: string
    emailDestino: string
}

export type MimeInput = {
    from: string
    to: string
    subject: string
    text: string
    html: string
}

export const EMAIL_TEMPLATE_VERSION = 'messages-v3-2026-09-30'

export const NOTIFICATION_SUBJECT = '[Agenda Virtual] Nuevo mensaje institucional'

export const LIST_ID = 'Agenda Virtual <agenda.liceoangeldelaguarda.education>'

const MIME_BOUNDARY = 'agenda-virtual-notificacion'

function escapeHtml(value: string) {
    return value
        .replaceAll('&', '&amp;')
        .replaceAll('<', '&lt;')
        .replaceAll('>', '&gt;')
        .replaceAll('"', '&quot;')
        .replaceAll("'", '&#39;')
}

function base64UrlEncode(input: Uint8Array) {
    let binary = ''
    for (const byte of input) {
        binary += String.fromCharCode(byte)
    }
    return btoa(binary).replaceAll('+', '-').replaceAll('/', '_').replaceAll('=', '')
}

export function encodeMimeForGmail(mime: string) {
    return base64UrlEncode(new TextEncoder().encode(mime))
}

function buildInboxUrl(appBaseUrl: string) {
    return `${appBaseUrl.replace(/\/$/, '')}/dashboard/mensajes`
}

export function renderNotificationEmail(
    row: QueueRow,
    appBaseUrl: string,
    testRecipientOverride: string | null,
): RenderedEmail {
    const destinatario = escapeHtml(row.destinatario_nombre ?? row.destinatario_email)
    const remitente = row.remitente_nombre?.trim()
    const inboxUrl = buildInboxUrl(appBaseUrl)
    const emailDestino = (testRecipientOverride ?? row.destinatario_email).trim().toLowerCase()
    const isTestOverride = Boolean(testRecipientOverride)

    const intro = remitente
        ? `<strong>${escapeHtml(remitente)}</strong> te ha enviado un mensaje en la Agenda Virtual del Liceo Angel de la Guarda.`
        : 'Tienes un nuevo mensaje en la Agenda Virtual del Liceo Angel de la Guarda.'

    const html = `
        <div style="font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; max-width: 560px; margin: 0 auto; color: #111827; border: 1px solid #e5e7eb; border-radius: 12px; overflow: hidden;">
            <div style="background-color: #3d0c07; padding: 24px; text-align: center;">
                <h2 style="color: #fcf8f3; margin: 0; font-size: 20px; letter-spacing: 1px;">Agenda Virtual</h2>
                <p style="color: #fcf8f3; margin: 4px 0 0 0; font-size: 14px; opacity: 0.8;">Liceo Angel de la Guarda</p>
            </div>

            <div style="padding: 32px; background-color: #ffffff;">
                <div style="text-align: center; margin-bottom: 24px;">
                    <div style="display: inline-block; padding: 12px; background-color: #eff6ff; border-radius: 50%;">
                        <svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="#2563eb" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect width="20" height="16" x="2" y="4" rx="2"></rect><path d="m22 7-8.97 5.7a2 2 0 0 1-2.06 0L2 7"></path></svg>
                    </div>
                </div>

                <h3 style="margin-top: 0; color: #111827; font-size: 18px; text-align: center;">Tienes un nuevo mensaje institucional</h3>

                <p style="line-height: 1.6; color: #374151;">Hola ${destinatario},</p>
                <p style="line-height: 1.6; color: #374151;">${intro}</p>

                <div style="padding: 16px; background-color: #fff7ed; border-radius: 8px; border-left: 4px solid #f97316; margin: 24px 0;">
                    <p style="margin: 0; font-size: 13px; color: #9a3412;">
                        Este es un correo de notificacion automatica. No respondas a este mensaje: las respuestas no llegan al remitente.
                    </p>
                </div>

                <div style="text-align: center; margin: 24px 0;">
                    <a href="${inboxUrl}" style="display:inline-block;padding:12px 18px;background:#3d0c07;color:#ffffff;text-decoration:none;border-radius:8px;font-weight:600;">
                        Leer y responder
                    </a>
                </div>

                ${isTestOverride
            ? `<div style="padding: 16px; background-color: #fff1f2; border-radius: 8px; border-left: 4px solid #e11d48; margin-top: 16px;"><p style="margin: 0; font-size: 13px; color: #9f1239;"><strong>Modo prueba:</strong> destinatario original ${escapeHtml(row.destinatario_email)}</p></div>`
            : ''
        }

                <hr style="border: 0; border-top: 1px solid #f3f4f6; margin: 24px 0;" />

                <p style="font-size: 12px; color: #6b7280; text-align: center; margin-bottom: 0;">
                    © 2026 Liceo Angel de la Guarda. Todos los derechos reservados.<br>
                    Este es un mensaje generado automaticamente por Agenda Virtual.
                </p>
                <p style="font-size: 12px; color: #6b7280; text-align: center; margin-bottom: 0;">
                Soporte Oficial:<br>
                soporte@liceoangeldelaguarda.education
                </p>
            </div>
        </div>
    `

    const subject = isTestOverride
        ? `[Agenda Virtual][TEST->${row.destinatario_email}] Nuevo mensaje institucional`
        : NOTIFICATION_SUBJECT

    const introText = remitente ? `${remitente} te ha enviado un mensaje` : 'Tienes un nuevo mensaje'

    const textLines = [
        `Hola ${row.destinatario_nombre ?? row.destinatario_email},`,
        '',
        `${introText} en la Agenda Virtual del Liceo Angel de la Guarda.`,
        '',
        'Este es un correo de notificacion automatica. No respondas a este mensaje: las respuestas no llegan al remitente.',
        '',
        `Leer y responder en la Agenda Virtual: ${inboxUrl}`,
    ]

    if (isTestOverride) {
        textLines.push('', `Modo prueba: destinatario original ${row.destinatario_email}`)
    }

    textLines.push('', 'Soporte Oficial: soporte@liceoangeldelaguarda.education')

    const text = textLines.join('\n')

    return {
        html,
        subject,
        text,
        emailDestino,
    }
}

export function buildMimeEmail(input: MimeInput) {
    const headers = [
        `From: ${input.from}`,
        `To: ${input.to}`,
        `Subject: ${input.subject}`,
        'Auto-Submitted: auto-generated',
        'X-Auto-Response-Suppress: All',
        'Precedence: bulk',
        `List-Id: ${LIST_ID}`,
        'MIME-Version: 1.0',
        `Content-Type: multipart/alternative; boundary="${MIME_BOUNDARY}"`,
    ]

    const body = [
        ...headers,
        '',
        `--${MIME_BOUNDARY}`,
        'Content-Type: text/plain; charset="UTF-8"',
        'Content-Transfer-Encoding: 8bit',
        '',
        input.text,
        `--${MIME_BOUNDARY}`,
        'Content-Type: text/html; charset="UTF-8"',
        'Content-Transfer-Encoding: 8bit',
        '',
        input.html,
        `--${MIME_BOUNDARY}--`,
    ]

    return body.join('\r\n')
}