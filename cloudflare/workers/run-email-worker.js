/**
 * Cloudflare Worker — Email Worker Cron
 *
 * Reemplaza: netlify/functions/run-email-worker.js
 *
 * Configuración en wrangler.worker.toml:
 *   [triggers]
 *   crons = ["* * * * *"]   <- cada minuto, igual que el cron de Netlify
 *
 * Variables de entorno (definir en Cloudflare Dashboard > Workers > Settings > Variables):
 *   SUPABASE_PROJECT_REF     -> ref del proyecto Supabase (ej: mkjvprcsakvfqxplqolq)
 *   SUPABASE_CRON_SECRET     -> secret para autorizar el worker
 *   SUPABASE_FUNCTIONS_BASE_URL (opcional) -> URL base custom de Edge Functions
 */

export default {
  /**
   * Handler HTTP — permite disparar el worker manualmente via POST
   * (útil para pruebas y para el workflow de GitHub Actions)
   */
  async fetch(request, env) {
    if (request.method !== 'POST') {
      return new Response(JSON.stringify({ error: 'Method not allowed' }), {
        status: 405,
        headers: { 'Content-Type': 'application/json' },
      })
    }

    // Validar Authorization si hay un secret configurado
    const cronSecret = env.SUPABASE_CRON_SECRET
    if (cronSecret) {
      const authHeader = request.headers.get('Authorization') ?? ''
      const token = authHeader.startsWith('Bearer ') ? authHeader.slice(7) : ''
      if (token !== cronSecret) {
        return new Response(JSON.stringify({ error: 'Unauthorized' }), {
          status: 401,
          headers: { 'Content-Type': 'application/json' },
        })
      }
    }

    return runEmailWorker(env)
  },

  /**
   * Handler Cron — se ejecuta según el schedule definido en wrangler.worker.toml
   */
  async scheduled(_event, env, ctx) {
    ctx.waitUntil(runEmailWorker(env))
  },
}

async function runEmailWorker(env) {
  const projectRef = env.SUPABASE_PROJECT_REF ?? 'mkjvprcsakvfqxplqolq'
  const cronSecret = env.SUPABASE_CRON_SECRET
  const customBaseUrl = env.SUPABASE_FUNCTIONS_BASE_URL

  console.log('[run-email-worker] ejecutando cron...')

  if (!cronSecret) {
    console.error('[run-email-worker] missing SUPABASE_CRON_SECRET')
    return new Response(
      JSON.stringify({ error: 'Falta SUPABASE_CRON_SECRET en Cloudflare' }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    )
  }

  const functionUrl = customBaseUrl
    ? `${customBaseUrl.replace(/\/$/, '')}/send-message-emails`
    : `https://${projectRef}.supabase.co/functions/v1/send-message-emails`

  try {
    const response = await fetch(functionUrl, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${cronSecret}`,
        'Content-Type': 'application/json',
      },
      body: '{}',
    })

    const bodyText = await response.text()
    console.log('[run-email-worker] upstream', response.status, bodyText.slice(0, 500))

    return new Response(bodyText || '{}', {
      status: response.status,
      headers: { 'Content-Type': 'application/json' },
    })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Error desconocido'
    console.error('[run-email-worker] Fetch error:', message)
    return new Response(JSON.stringify({ error: message }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    })
  }
}
