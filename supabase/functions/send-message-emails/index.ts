import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3'

type QueueRow = {
    id: string
    mensaje_id: string
    destinatario_email: string
    destinatario_nombre: string | null
    asunto: string
    contenido_preview: string | null
    status: 'pending' | 'processing' | 'sent' | 'failed' | 'cancelled'
    attempts: number
}

const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
}

function getBearerToken(authHeader: string | null) {
    if (!authHeader) return null
    const [scheme, token] = authHeader.split(' ')
    if (scheme?.toLowerCase() !== 'bearer' || !token) return null
    return token
}

function isProductionLikeEnvironment() {
    const appEnv = (Deno.env.get('APP_ENV') ?? Deno.env.get('ENV') ?? Deno.env.get('NODE_ENV') ?? '').toLowerCase()
    return appEnv === 'production' || appEnv === 'prod'
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

function computeBackoffMinutes(attempts: number) {
    if (attempts <= 1) return 5
    if (attempts === 2) return 15
    if (attempts === 3) return 30
    return 60
}

function parsePositiveInteger(rawValue: string | null, fallback: number) {
    if (!rawValue) return fallback
    const parsed = Number.parseInt(rawValue, 10)
    if (!Number.isFinite(parsed) || parsed <= 0) return fallback
    return parsed
}

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

function base64UrlEncodeString(value: string) {
    return base64UrlEncode(new TextEncoder().encode(value))
}

function normalizePrivateKey(rawPrivateKey: string) {
    return rawPrivateKey.replaceAll('\\n', '\n')
}

async function signJwtWithRs256(unsignedToken: string, privateKeyPem: string) {
    const pem = normalizePrivateKey(privateKeyPem)
    const pemBody = pem
        .replace('-----BEGIN PRIVATE KEY-----', '')
        .replace('-----END PRIVATE KEY-----', '')
        .replaceAll('\n', '')
        .trim()

    const keyBuffer = Uint8Array.from(atob(pemBody), (char) => char.charCodeAt(0))
    const cryptoKey = await crypto.subtle.importKey(
        'pkcs8',
        keyBuffer,
        {
            name: 'RSASSA-PKCS1-v1_5',
            hash: 'SHA-256',
        },
        false,
        ['sign'],
    )

    const signature = await crypto.subtle.sign(
        'RSASSA-PKCS1-v1_5',
        cryptoKey,
        new TextEncoder().encode(unsignedToken),
    )

    return base64UrlEncode(new Uint8Array(signature))
}

async function getGoogleAccessToken(
    serviceAccountEmail: string,
    serviceAccountPrivateKey: string,
    impersonatedUser: string,
    scope: string,
) {
    const now = Math.floor(Date.now() / 1000)
    const jwtHeader = {
        alg: 'RS256',
        typ: 'JWT',
    }

    const jwtPayload = {
        iss: serviceAccountEmail,
        scope,
        aud: 'https://oauth2.googleapis.com/token',
        exp: now + 3600,
        iat: now,
        sub: impersonatedUser,
    }

    const encodedHeader = base64UrlEncodeString(JSON.stringify(jwtHeader))
    const encodedPayload = base64UrlEncodeString(JSON.stringify(jwtPayload))
    const unsignedJwt = `${encodedHeader}.${encodedPayload}`
    const signature = await signJwtWithRs256(unsignedJwt, serviceAccountPrivateKey)
    const assertion = `${unsignedJwt}.${signature}`

    const tokenResponse = await fetch('https://oauth2.googleapis.com/token', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: new URLSearchParams({
            grant_type: 'urn:ietf:params:oauth:grant-type:jwt-bearer',
            assertion,
        }),
    })

    const tokenJson = (await tokenResponse.json().catch(() => null)) as Record<string, unknown> | null
    if (!tokenResponse.ok) {
        const errorMessage =
            (tokenJson && typeof tokenJson.error_description === 'string' && tokenJson.error_description) ||
            (tokenJson && typeof tokenJson.error === 'string' && tokenJson.error) ||
            `Google OAuth error HTTP ${tokenResponse.status}`
        throw new Error(errorMessage)
    }

    const accessToken = tokenJson && typeof tokenJson.access_token === 'string' ? tokenJson.access_token : null
    if (!accessToken) {
        throw new Error('Google OAuth no devolvio access_token')
    }

    return accessToken
}

async function getGoogleAccessTokenFromRefreshToken(
    oauthClientId: string,
    oauthClientSecret: string,
    refreshToken: string,
) {
    const tokenResponse = await fetch('https://oauth2.googleapis.com/token', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: new URLSearchParams({
            client_id: oauthClientId,
            client_secret: oauthClientSecret,
            refresh_token: refreshToken,
            grant_type: 'refresh_token',
        }),
    })

    const tokenJson = (await tokenResponse.json().catch(() => null)) as Record<string, unknown> | null
    if (!tokenResponse.ok) {
        const errorMessage =
            (tokenJson && typeof tokenJson.error_description === 'string' && tokenJson.error_description) ||
            (tokenJson && typeof tokenJson.error === 'string' && tokenJson.error) ||
            `Google OAuth refresh-token error HTTP ${tokenResponse.status}`
        throw new Error(errorMessage)
    }

    const accessToken = tokenJson && typeof tokenJson.access_token === 'string' ? tokenJson.access_token : null
    if (!accessToken) {
        throw new Error('Google OAuth refresh-token no devolvio access_token')
    }

    return accessToken
}

function renderNotificationEmail(
    row: QueueRow,
    appBaseUrl: string,
    testRecipientOverride: string | null,
) {
    const preview = escapeHtml(row.contenido_preview ?? '')
    const destinatario = escapeHtml(row.destinatario_nombre ?? row.destinatario_email)
    const asunto = row.asunto.trim() || 'Nuevo mensaje institucional'
    const inboxUrl = `${appBaseUrl.replace(/\/$/, '')}/dashboard/mensajes`
    const emailDestino = (testRecipientOverride ?? row.destinatario_email).trim().toLowerCase()
    const isTestOverride = Boolean(testRecipientOverride)

    const html = `
    <div style="font-family: Arial, sans-serif; max-width: 560px; margin: 0 auto; color: #111827;">
      <h2 style="margin-bottom: 12px;">Nuevo mensaje en Agenda Virtual</h2>
      <p style="margin: 0 0 12px 0;">Hola ${destinatario}, tienes un nuevo mensaje institucional.</p>
      <p style="margin: 0 0 6px 0;"><strong>Asunto:</strong> ${escapeHtml(asunto)}</p>
      ${preview ? `<p style="margin: 0 0 16px 0;"><strong>Resumen:</strong> ${preview}</p>` : ''}
      <a href="${inboxUrl}" style="display:inline-block;padding:10px 14px;background:#111827;color:#ffffff;text-decoration:none;border-radius:8px;">
        Ver mensaje
      </a>
      <p style="margin-top: 20px; font-size: 12px; color: #6b7280;">Este correo es una notificación automática.</p>
      ${isTestOverride
            ? `<p style="margin-top: 8px; font-size: 12px; color: #9a3412;">Modo prueba: destinatario original ${escapeHtml(row.destinatario_email)}</p>`
            : ''
        }
    </div>
  `

    const subject = isTestOverride
        ? `[Agenda Virtual][TEST->${row.destinatario_email}] ${asunto}`
        : `[Agenda Virtual] ${asunto}`

    const text = `Hola ${row.destinatario_nombre ?? row.destinatario_email}, tienes un nuevo mensaje institucional.\n\nAsunto: ${asunto}\n${row.contenido_preview ? `Resumen: ${row.contenido_preview}\n` : ''}${isTestOverride ? `\nModo prueba: destinatario original ${row.destinatario_email}\n` : ''}\nIngresa a: ${inboxUrl}`

    return {
        html,
        subject,
        text,
        emailDestino,
    }
}

type ProviderConfig = {
    provider: 'resend' | 'gmail'
    resendApiKey: string | null
    emailFrom: string | null
    googleAuthMode: 'service_account' | 'refresh_token'
    googleServiceAccountEmail: string | null
    googleServiceAccountPrivateKey: string | null
    googleImpersonatedUser: string | null
    googleScope: string
    googleOauthClientId: string | null
    googleOauthClientSecret: string | null
    googleOauthRefreshToken: string | null
}

async function sendEmailWithProvider(
    row: QueueRow,
    appBaseUrl: string,
    dryRun: boolean,
    testRecipientOverride: string | null,
    config: ProviderConfig,
) {
    if (dryRun) {
        return {
            ok: true,
            providerMessageId: `dry-run-${row.id}`,
            error: null,
        }
    }

    const rendered = renderNotificationEmail(row, appBaseUrl, testRecipientOverride)

    if (config.provider === 'resend') {
        if (!config.resendApiKey) {
            return {
                ok: false,
                providerMessageId: null,
                error: 'RESEND_API_KEY no configurada',
            }
        }

        if (!config.emailFrom) {
            return {
                ok: false,
                providerMessageId: null,
                error: 'EMAIL_FROM no configurado',
            }
        }

        const response = await fetch('https://api.resend.com/emails', {
            method: 'POST',
            headers: {
                Authorization: `Bearer ${config.resendApiKey}`,
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                from: config.emailFrom,
                to: [rendered.emailDestino],
                subject: rendered.subject,
                text: rendered.text,
                html: rendered.html,
            }),
        })

        let responseJson: Record<string, unknown> | null = null
        try {
            responseJson = (await response.json()) as Record<string, unknown>
        } catch {
            responseJson = null
        }

        if (!response.ok) {
            const responseError =
                (responseJson && typeof responseJson.message === 'string' && responseJson.message) ||
                (responseJson && typeof responseJson.error === 'string' && responseJson.error) ||
                `Resend error HTTP ${response.status}`

            return {
                ok: false,
                providerMessageId: null,
                error: responseError,
            }
        }

        const providerMessageId =
            responseJson && typeof responseJson.id === 'string' ? responseJson.id : `resend-${row.id}`

        return {
            ok: true,
            providerMessageId,
            error: null,
        }
    }

    try {
        let accessToken: string
        let fromAddress: string | null = config.emailFrom

        if (config.googleAuthMode === 'service_account') {
            if (!config.googleServiceAccountEmail || !config.googleServiceAccountPrivateKey || !config.googleImpersonatedUser) {
                return {
                    ok: false,
                    providerMessageId: null,
                    error: 'Configuración incompleta de Gmail con service account (GOOGLE_WORKSPACE_CLIENT_EMAIL / GOOGLE_WORKSPACE_PRIVATE_KEY / GOOGLE_WORKSPACE_IMPERSONATED_USER)',
                }
            }

            accessToken = await getGoogleAccessToken(
                config.googleServiceAccountEmail,
                config.googleServiceAccountPrivateKey,
                config.googleImpersonatedUser,
                config.googleScope,
            )

            fromAddress = fromAddress ?? config.googleImpersonatedUser
        } else {
            if (!config.googleOauthClientId || !config.googleOauthClientSecret || !config.googleOauthRefreshToken || !config.googleImpersonatedUser) {
                return {
                    ok: false,
                    providerMessageId: null,
                    error: 'Configuración incompleta de Gmail con refresh token (GOOGLE_OAUTH_CLIENT_ID / GOOGLE_OAUTH_CLIENT_SECRET / GOOGLE_OAUTH_REFRESH_TOKEN / GOOGLE_WORKSPACE_IMPERSONATED_USER)',
                }
            }

            accessToken = await getGoogleAccessTokenFromRefreshToken(
                config.googleOauthClientId,
                config.googleOauthClientSecret,
                config.googleOauthRefreshToken,
            )

            fromAddress = fromAddress ?? config.googleImpersonatedUser
        }

        if (!fromAddress) {
            return {
                ok: false,
                providerMessageId: null,
                error: 'No se pudo resolver remitente para Gmail (define EMAIL_FROM o GOOGLE_WORKSPACE_IMPERSONATED_USER)',
            }
        }

        const mimeEmail = [
            `From: ${fromAddress}`,
            `To: ${rendered.emailDestino}`,
            `Subject: ${rendered.subject}`,
            'MIME-Version: 1.0',
            'Content-Type: text/html; charset="UTF-8"',
            '',
            rendered.html,
        ].join('\r\n')

        const raw = base64UrlEncodeString(mimeEmail)
        const gmailResponse = await fetch('https://gmail.googleapis.com/gmail/v1/users/me/messages/send', {
            method: 'POST',
            headers: {
                Authorization: `Bearer ${accessToken}`,
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ raw }),
        })

        const gmailJson = (await gmailResponse.json().catch(() => null)) as Record<string, unknown> | null
        if (!gmailResponse.ok) {
            const nestedError =
                gmailJson && typeof gmailJson.error === 'object' && gmailJson.error && 'message' in gmailJson.error
                    ? (gmailJson.error as { message?: unknown }).message
                    : null

            const gmailErrorMessage =
                (typeof nestedError === 'string' && nestedError) ||
                (gmailJson && typeof gmailJson.message === 'string' && gmailJson.message) ||
                `Gmail API error HTTP ${gmailResponse.status}`

            return {
                ok: false,
                providerMessageId: null,
                error: gmailErrorMessage,
            }
        }

        const gmailMessageId =
            gmailJson && typeof gmailJson.id === 'string' ? gmailJson.id : `gmail-${row.id}`

        return {
            ok: true,
            providerMessageId: gmailMessageId,
            error: null,
        }
    } catch (error) {
        return {
            ok: false,
            providerMessageId: null,
            error: error instanceof Error ? error.message : 'Error desconocido enviando con Gmail API',
        }
    }
}

Deno.serve(async (req) => {
    if (req.method === 'OPTIONS') {
        return new Response('ok', { headers: corsHeaders })
    }

    if (req.method !== 'POST') {
        return jsonResponse({ error: 'Método no permitido' }, 405)
    }

    const cronSecret = Deno.env.get('CRON_SECRET')
    const requiresCronSecret = isProductionLikeEnvironment()
    if (requiresCronSecret && !cronSecret) {
        return jsonResponse({ error: 'CRON_SECRET es obligatorio en producción' }, 500)
    }

    if (cronSecret) {
        const bearerToken = getBearerToken(req.headers.get('Authorization'))
        if (!bearerToken || bearerToken !== cronSecret) {
            return jsonResponse({ error: 'No autorizado' }, 401)
        }
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')
    const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? Deno.env.get('SERVICE_ROLE_KEY')

    if (!supabaseUrl || !serviceRoleKey) {
        return jsonResponse({ error: 'Configuración de Supabase incompleta en el servidor' }, 500)
    }

    const resendApiKey = Deno.env.get('RESEND_API_KEY') ?? Deno.env.get('EMAIL_PROVIDER_API_KEY')
    const emailProvider = (Deno.env.get('EMAIL_PROVIDER') ?? 'resend').trim().toLowerCase()
    const emailFrom = Deno.env.get('EMAIL_FROM')
    const googleAuthMode = (Deno.env.get('GOOGLE_WORKSPACE_AUTH_MODE') ?? 'service_account').trim().toLowerCase()
    const googleServiceAccountEmail = Deno.env.get('GOOGLE_WORKSPACE_CLIENT_EMAIL')?.trim() ?? null
    const googleServiceAccountPrivateKey = Deno.env.get('GOOGLE_WORKSPACE_PRIVATE_KEY') ?? null
    const googleImpersonatedUser = Deno.env.get('GOOGLE_WORKSPACE_IMPERSONATED_USER')?.trim() ?? null
    const googleScope = Deno.env.get('GOOGLE_WORKSPACE_SCOPE')?.trim() || 'https://www.googleapis.com/auth/gmail.send'
    const googleOauthClientId = Deno.env.get('GOOGLE_OAUTH_CLIENT_ID')?.trim() ?? null
    const googleOauthClientSecret = Deno.env.get('GOOGLE_OAUTH_CLIENT_SECRET')?.trim() ?? null
    const googleOauthRefreshToken = Deno.env.get('GOOGLE_OAUTH_REFRESH_TOKEN')?.trim() ?? null
    const appBaseUrl = Deno.env.get('APP_BASE_URL') ?? 'http://localhost:5173'
    const dryRun = (Deno.env.get('EMAIL_NOTIFICATIONS_DRY_RUN') ?? 'true').toLowerCase() === 'true'
    const testRecipientOverride = Deno.env.get('EMAIL_TEST_RECIPIENT')?.trim().toLowerCase() || null
    const maxBatch = parsePositiveInteger(Deno.env.get('EMAIL_NOTIFICATIONS_BATCH_SIZE'), 20)
    const maxAttempts = parsePositiveInteger(Deno.env.get('EMAIL_NOTIFICATIONS_MAX_ATTEMPTS'), 5)

    if (emailProvider !== 'resend' && emailProvider !== 'gmail') {
        return jsonResponse({ error: `EMAIL_PROVIDER inválido: ${emailProvider}. Usa 'resend' o 'gmail'.` }, 500)
    }

    if (googleAuthMode !== 'service_account' && googleAuthMode !== 'refresh_token') {
        return jsonResponse({ error: `GOOGLE_WORKSPACE_AUTH_MODE inválido: ${googleAuthMode}. Usa 'service_account' o 'refresh_token'.` }, 500)
    }

    const adminClient = createClient(supabaseUrl, serviceRoleKey)

    const { data: featureFlag, error: featureError } = await adminClient
        .from('feature_flags')
        .select('enabled')
        .eq('key', 'mensajes_email_notificaciones')
        .single<{ enabled: boolean }>()

    if (featureError || !featureFlag?.enabled) {
        return jsonResponse({
            message: 'Feature flag desactivado. No se procesa la cola.',
            processed: 0,
            sent: 0,
            failed: 0,
            dryRun,
        })
    }

    const nowIso = new Date().toISOString()

    const { data: rows, error: rowsError } = await adminClient
        .from('email_notifications_queue')
        .select('id, mensaje_id, destinatario_email, destinatario_nombre, asunto, contenido_preview, status, attempts')
        .eq('status', 'pending')
        .or(`next_retry_at.is.null,next_retry_at.lte.${nowIso}`)
        .order('created_at', { ascending: true })
        .limit(maxBatch)

    if (rowsError) {
        return jsonResponse({ error: rowsError.message }, 500)
    }

    const queueRows = (rows ?? []) as QueueRow[]

    let sent = 0
    let failed = 0
    let skipped = 0

    for (const row of queueRows) {
        const nextAttempts = row.attempts + 1

        const { data: claimedRow, error: claimError } = await adminClient
            .from('email_notifications_queue')
            .update({ status: 'processing', attempts: nextAttempts })
            .eq('id', row.id)
            .eq('status', 'pending')
            .select('id')
            .maybeSingle()

        if (claimError || !claimedRow) {
            skipped += 1
            continue
        }

        const result = await sendEmailWithProvider(row, appBaseUrl, dryRun, testRecipientOverride, {
            provider: emailProvider,
            resendApiKey,
            emailFrom,
            googleAuthMode,
            googleServiceAccountEmail,
            googleServiceAccountPrivateKey,
            googleImpersonatedUser,
            googleScope,
            googleOauthClientId,
            googleOauthClientSecret,
            googleOauthRefreshToken,
        })

        if (result.ok) {
            sent += 1
            await adminClient
                .from('email_notifications_queue')
                .update({
                    status: 'sent',
                    sent_at: new Date().toISOString(),
                    provider_message_id: result.providerMessageId,
                    last_error: null,
                })
                .eq('id', row.id)
            continue
        }

        failed += 1
        const exhaustedRetries = nextAttempts >= maxAttempts
        if (exhaustedRetries) {
            await adminClient
                .from('email_notifications_queue')
                .update({
                    status: 'failed',
                    next_retry_at: null,
                    last_error: result.error,
                })
                .eq('id', row.id)
            continue
        }

        const retryMinutes = computeBackoffMinutes(nextAttempts)
        const retryAt = new Date(Date.now() + retryMinutes * 60_000).toISOString()

        await adminClient
            .from('email_notifications_queue')
            .update({
                status: 'pending',
                next_retry_at: retryAt,
                last_error: result.error,
            })
            .eq('id', row.id)
    }

    return jsonResponse({
        message: 'Procesamiento finalizado',
        processed: queueRows.length,
        sent,
        failed,
        skipped,
        dryRun,
        provider: emailProvider,
        googleAuthMode,
        testRecipientOverride,
        maxAttempts,
    })
})
