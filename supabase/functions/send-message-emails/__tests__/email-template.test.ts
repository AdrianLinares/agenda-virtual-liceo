import { describe, expect, it } from 'vitest'
import {
    EMAIL_TEMPLATE_VERSION,
    LIST_ID,
    NOTIFICATION_SUBJECT,
    buildMimeEmail,
    encodeMimeForGmail,
    renderNotificationEmail,
    type QueueRow,
} from '../email-template'

const APP_BASE_URL = 'https://agenda.liceoangeldelaguarda.education/'

function makeRow(overrides: Partial<QueueRow> = {}): QueueRow {
    return {
        id: 'queue-1',
        mensaje_id: 'mensaje-1',
        destinatario_email: 'estudiante@liceoangeldelaguarda.education',
        destinatario_nombre: 'Ana Ruiz',
        remitente_nombre: 'Lic. Marta Gomez',
        asunto: 'Justificacion de inasistencia del lunes',
        contenido_preview: 'Buen dia, desire justificar la inasistencia de mi hija el dia lunes.',
        status: 'pending',
        attempts: 0,
        ...overrides,
    }
}

describe('buildMimeEmail - option B (cabeceras anti-respuesta)', () => {
    const mime = buildMimeEmail({
        from: 'notificaciones@liceoangeldelaguarda.education',
        to: 'estudiante@liceoangeldelaguarda.education',
        subject: NOTIFICATION_SUBJECT,
        text: 'texto plano',
        html: '<p>html</p>',
    })

    it('declara el mensaje como generado automaticamente (RFC 3834)', () => {
        expect(mime).toContain('Auto-Submitted: auto-generated')
    })

    it('suprime respuestas automaticas de ausencia para no ensuciar el buzon de notificaciones', () => {
        expect(mime).toContain('X-Auto-Response-Suppress: All')
    })

    it('marca precedencia bulk para que los clientes lo traten como correo masivo', () => {
        expect(mime).toContain('Precedence: bulk')
    })

    it('incluye List-Id para que Gmail/Outlook lo agrupen como lista y limiten responder a todos', () => {
        expect(mime).toContain(`List-Id: ${LIST_ID}`)
    })

    it('NO incluye Reply-To: el correo de la institucion no debe ser un canal de respuesta', () => {
        expect(mime).not.toMatch(/^Reply-To:/m)
    })
})

describe('buildMimeEmail - estructura MIME', () => {
    it('envia multipart/alternative para que los clientes de texto plano reciban el aviso', () => {
        const mime = buildMimeEmail({
            from: 'a@liceoangeldelaguarda.education',
            to: 'b@liceoangeldelaguarda.education',
            subject: NOTIFICATION_SUBJECT,
            text: 'texto plano',
            html: '<p>html</p>',
        })

        expect(mime).toMatch(/Content-Type: multipart\/alternative; boundary=/)
        expect(mime).toContain('Content-Type: text/plain; charset="UTF-8"')
        expect(mime).toContain('Content-Type: text/html; charset="UTF-8"')
    })

    it('expone el boundary que usa en las tres posiciones que exige MIME', () => {
        const mime = buildMimeEmail({
            from: 'a@liceoangeldelaguarda.education',
            to: 'b@liceoangeldelaguarda.education',
            subject: NOTIFICATION_SUBJECT,
            text: 'texto plano',
            html: '<p>html</p>',
        })

        const boundary = mime.match(/boundary="([^"]+)"/)?.[1]
        expect(boundary).toBeTruthy()
        expect(boundary).toBeDefined()
        const occurrences = mime.split(`--${boundary}`).length - 1
        expect(occurrences).toBe(3)
    })

    it('codifica en base64url para la API de Gmail', () => {
        const encoded = encodeMimeForGmail('From: a@b.education')
        expect(encoded).not.toContain('+')
        expect(encoded).not.toContain('/')
        expect(encoded).not.toContain('=')
    })
})

describe('renderNotificationEmail - option C (plantilla no respondible)', () => {
    const rendered = renderNotificationEmail(makeRow(), APP_BASE_URL, null)

    it('usa un asunto generico, no el asunto real del mensaje', () => {
        expect(rendered.subject).toBe(NOTIFICATION_SUBJECT)
        expect(rendered.subject).not.toContain('Justificacion de inasistencia del lunes')
    })

    it('no expone el asunto real ni en el html ni en el texto plano', () => {
        expect(rendered.html).not.toContain('Justificacion de inasistencia del lunes')
        expect(rendered.text).not.toContain('Justificacion de inasistencia del lunes')
    })

    it('no expone el contenido del mensaje ni en el html ni en el texto plano', () => {
        expect(rendered.html).not.toContain('desear justificar la inasistencia')
        expect(rendered.text).not.toContain('desear justificar la inasistencia')
    })

    it('nombra al remitente para que el destinatario sepa que el mensaje le concierne', () => {
        expect(rendered.html).toContain('Lic. Marta Gomez')
        expect(rendered.text).toContain('Lic. Marta Gomez')
    })

    it('advierte que no se responda antes del boton, no despues', () => {
        const warningIndex = rendered.html.indexOf('No respondas a este mensaje')
        const ctaIndex = rendered.html.indexOf('Leer y responder')
        expect(warningIndex).toBeGreaterThan(-1)
        expect(ctaIndex).toBeGreaterThan(-1)
        expect(warningIndex).toBeLessThan(ctaIndex)
    })

    it('el boton captura la intencion de respuesta y la manda a la aplicacion', () => {
        expect(rendered.html).toContain('Leer y responder')
        expect(rendered.text).toContain('Leer y responder')
        expect(rendered.html).toContain(`${APP_BASE_URL.replace(/\/$/, '')}/dashboard/mensajes`)
    })

    it('escapa el HTML del nombre del remitente', () => {
        const renderedXss = renderNotificationEmail(
            makeRow({ remitente_nombre: '<script>alert(1)</script>' }),
            APP_BASE_URL,
            null,
        )
        expect(renderedXss.html).not.toContain('<script>')
        expect(renderedXss.html).toContain('&lt;script&gt;')
    })

    it('cae a un texto generico si el remitente no tiene nombre', () => {
        const renderedSinNombre = renderNotificationEmail(makeRow({ remitente_nombre: null }), APP_BASE_URL, null)
        expect(renderedSinNombre.html).toContain('Tienes un nuevo mensaje')
        expect(renderedSinNombre.text).toContain('Tienes un nuevo mensaje')
    })

    it('marca el modo prueba sin filtrar el asunto real', () => {
        const renderedTest = renderNotificationEmail(
            makeRow(),
            APP_BASE_URL,
            'qa@liceoangeldelaguarda.education',
        )
        expect(renderedTest.emailDestino).toBe('qa@liceoangeldelaguarda.education')
        expect(renderedTest.subject).toContain('[TEST->estudiante@liceoangeldelaguarda.education]')
        expect(renderedTest.subject).not.toContain('Justificacion de inasistencia del lunes')
        expect(renderedTest.html).not.toContain('Justificacion de inasistencia del lunes')
    })

    it('normaliza el destino a minusculas y sin espacios', () => {
        const renderedEspacios = renderNotificationEmail(
            makeRow({ destinatario_email: '  Estudiante@LiceoAngelDeLaGuarda.education ' }),
            APP_BASE_URL,
            null,
        )
        expect(renderedEspacios.emailDestino).toBe('estudiante@liceoangeldelaguarda.education')
    })
})

describe('email-template metadata', () => {
    it('versiona la plantilla para poder auditar que se envio', () => {
        expect(EMAIL_TEMPLATE_VERSION).toMatch(/^messages-v\d+-\d{4}-\d{2}-\d{2}$/)
    })
})
