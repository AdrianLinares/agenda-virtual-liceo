# Notificaciones por correo para Mensajes (modo preparado, apagado)

Este proyecto ya incluye la infraestructura base para enviar correo cuando se crea un mensaje interno, pero queda **desactivada por defecto**.

## Qué quedó implementado

1. Migración: `migrations/20260227_mensajes_email_notificaciones_base.sql`
   - Crea `feature_flags`.
   - Crea `email_notifications_queue` (cola/outbox).
   - Crea trigger en `mensajes` para encolar notificaciones.
   - El trigger solo encola si `feature_flags.mensajes_email_notificaciones = true`.

2. Edge Function: `supabase/functions/send-message-emails/index.ts`
   - Lee la cola pendiente.
   - Aplica reintentos con backoff.
   - Soporta `dry-run` (por defecto `true`).

## Estado actual (seguro para producción sin dominio de correo)

- Feature flag: **false**
- Worker: preparado, sin proveedor real configurado
- Resultado: no se envían correos todavía

## Pruebas sin dominio propio (Receiving de Resend)

Se implemento una Edge Function para recibir eventos `email.received` y guardarlos en base de datos:

- Function: `supabase/functions/resend-receiving-webhook/index.ts`
- Migracion: `migrations/20260308_resend_receiving_webhook_base.sql`
- Migracion de enrutamiento a mensajes internos: `migrations/20260308_resend_receiving_to_internal_messages.sql`
- Direccion de receiving configurada para pruebas: `liceoangeldelaguarda@elkaavenia.resend.app`

### 0) Aplicar migracion

Aplica ambas migraciones en tu proyecto Supabase:

- `20260308_resend_receiving_webhook_base.sql`
- `20260308_resend_receiving_to_internal_messages.sql`

### 1) Desplegar la function de webhook inbound

```bash
supabase functions deploy resend-receiving-webhook --no-verify-jwt
```

`--no-verify-jwt` es obligatorio para webhooks de Resend porque no incluyen header `Authorization`.

### 2) Configurar secretos del webhook

```bash
supabase secrets set RESEND_WEBHOOK_SECRET="whsec_xxxxxxxxx"
supabase secrets set RECEIVING_ALLOWED_TO="liceoangeldelaguarda@elkaavenia.resend.app"
supabase secrets set RECEIVING_TARGET_USER_EMAIL="admin@liceoag.com"
supabase secrets set RECEIVING_SYSTEM_SENDER_EMAIL="admin@liceoag.com"
```

`RECEIVING_ALLOWED_TO` acepta multiples correos separados por coma.
`RECEIVING_TARGET_USER_EMAIL` es quien recibira el mensaje interno en la app. Si no existe o no esta activo, la function usa el primer administrador activo como fallback.
`RECEIVING_SYSTEM_SENDER_EMAIL` es opcional; si no se configura o no existe en `profiles`, la function intenta usar el remitente del correo (si existe en `profiles`) o el primer administrador activo.

### 3) Configurar webhook en Resend

1. Ve a `Webhooks` en Resend.
2. Crea `Add Webhook`.
3. URL: `https://<project-ref>.supabase.co/functions/v1/resend-receiving-webhook`
4. Evento: `email.received`
5. Guarda y copia el signing secret (`whsec_...`) en `RESEND_WEBHOOK_SECRET`.

### 4) Probar envio hacia receiving address

Envia un correo desde cualquier cuenta (Gmail, Outlook, etc.) a:

`liceoangeldelaguarda@elkaavenia.resend.app`

La function verificara firma, filtrara por destinatario permitido, guardara el evento en `public.received_email_events` y lo convertira en un registro de `public.mensajes`.

### 5) Verificar que llego el evento

```sql
select
  ree.created_at,
  ree.resend_email_id,
  ree.sender,
  ree.recipient_emails,
  ree.subject,
  ree.internal_message_id,
  m.asunto as internal_subject,
  m.destinatario_id,
  p.email as destinatario_email
from public.received_email_events ree
left join public.mensajes m on m.id = ree.internal_message_id
left join public.profiles p on p.id = m.destinatario_id
order by ree.created_at desc
limit 20;
```

## Activación futura con Resend

La function `send-message-emails` ahora soporta dos proveedores:

- `EMAIL_PROVIDER="resend"` (default)
- `EMAIL_PROVIDER="gmail"` (Google Workspace con service account + domain-wide delegation)

### 1) Desplegar función

```bash
supabase functions deploy send-message-emails
```

### 2) Configurar secretos de la función

```bash
supabase secrets set CRON_SECRET="tu-secreto-cron"
supabase secrets set APP_ENV="production"
supabase secrets set EMAIL_PROVIDER="resend"
supabase secrets set RESEND_API_KEY="re_xxxxxxxxx"
supabase secrets set EMAIL_FROM="Agenda Virtual <no-reply@tu-dominio.edu.co>"
supabase secrets set APP_BASE_URL="https://tu-app.com"
supabase secrets set EMAIL_NOTIFICATIONS_DRY_RUN="false"
supabase secrets set EMAIL_NOTIFICATIONS_BATCH_SIZE="20"
supabase secrets set EMAIL_NOTIFICATIONS_MAX_ATTEMPTS="5"
supabase secrets set EMAIL_TEST_RECIPIENT="adrianlinares246@protonmail.com"
```

> Mientras no tengas el dominio verificado en Resend, deja `EMAIL_NOTIFICATIONS_DRY_RUN=true`.
> En producción, `CRON_SECRET` es obligatorio y la función rechazará ejecución si no está configurado.

`EMAIL_NOTIFICATIONS_MAX_ATTEMPTS` define cuántos intentos hará la cola antes de marcar el registro como `failed`.

`EMAIL_TEST_RECIPIENT` es opcional para pruebas sin dominio verificado en Resend: redirige todos los correos a un unico email permitido (sandbox) y conserva el destinatario original en asunto/cuerpo.

Cuando pases a envio real entre usuarios, elimina ese secreto:

```bash
supabase secrets unset EMAIL_TEST_RECIPIENT
```

## Activación con Gmail (Google Workspace)

### 1) Configurar Google Cloud

1. Crea un proyecto en Google Cloud.
2. Habilita la Gmail API.
3. Crea una Service Account.
4. Activa Domain-wide delegation en la Service Account.
5. Descarga la clave JSON de la Service Account.

### 2) Autorizar Domain-wide delegation en Admin Console

1. Entra como super admin a Google Admin.
2. Ve a `Security` -> `Access and data control` -> `API controls` -> `Domain-wide delegation`.
3. Agrega el `Client ID` de la Service Account.
4. Scopes:

`https://www.googleapis.com/auth/gmail.send`

### 3) Definir cuenta remitente institucional

Usa una cuenta del dominio del colegio, por ejemplo:

`notificaciones@colegio.edu.co`

Esta cuenta se usara como usuario impersonado para enviar correos.

### 4) Configurar secretos para Gmail

```bash
supabase secrets set CRON_SECRET="tu-secreto-cron"
supabase secrets set APP_ENV="production"
supabase secrets set EMAIL_PROVIDER="gmail"
supabase secrets set APP_BASE_URL="https://tu-app.com"
supabase secrets set EMAIL_NOTIFICATIONS_DRY_RUN="false"
supabase secrets set EMAIL_NOTIFICATIONS_BATCH_SIZE="20"
supabase secrets set EMAIL_NOTIFICATIONS_MAX_ATTEMPTS="5"
supabase secrets set GOOGLE_WORKSPACE_CLIENT_EMAIL="service-account@tu-proyecto.iam.gserviceaccount.com"
supabase secrets set GOOGLE_WORKSPACE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\n...\n-----END PRIVATE KEY-----\n"
supabase secrets set GOOGLE_WORKSPACE_IMPERSONATED_USER="notificaciones@colegio.edu.co"
supabase secrets set GOOGLE_WORKSPACE_SCOPE="https://www.googleapis.com/auth/gmail.send"
```

`EMAIL_FROM` es opcional con Gmail. Si no se define, se usa `GOOGLE_WORKSPACE_IMPERSONATED_USER`.

### 4.1) Alternativa cuando la organizacion bloquea claves de service account

Si Google Cloud muestra `iam.disableServiceAccountKeyCreation`, usa modo `refresh_token`:

```bash
supabase secrets set EMAIL_PROVIDER="gmail"
supabase secrets set GOOGLE_WORKSPACE_AUTH_MODE="refresh_token"
supabase secrets set GOOGLE_WORKSPACE_IMPERSONATED_USER="notificaciones@colegio.edu.co"
supabase secrets set GOOGLE_OAUTH_CLIENT_ID="xxxxxxxxxx.apps.googleusercontent.com"
supabase secrets set GOOGLE_OAUTH_CLIENT_SECRET="GOCSPX-xxxxxxxx"
supabase secrets set GOOGLE_OAUTH_REFRESH_TOKEN="1//0gxxxxxxxx"
```

En este modo no se usa `GOOGLE_WORKSPACE_PRIVATE_KEY`.

### 5) Desplegar function

```bash
supabase functions deploy send-message-emails --no-verify-jwt
```

### 6) Prueba manual de procesamiento

```bash
curl -X POST "https://<project-ref>.supabase.co/functions/v1/send-message-emails" \
  -H "Authorization: Bearer <CRON_SECRET>" \
  -H "Content-Type: application/json"
```

### 2.1) Verificaciones previas en Resend

- Verifica tu dominio en Resend (SPF y DKIM).
- Usa ese dominio en `EMAIL_FROM`.
- Si estás en pruebas, puedes usar un remitente sandbox temporal de Resend (limitado).

### 3) Activar flag en base de datos

```sql
update public.feature_flags
set enabled = true, updated_at = now()
where key = 'mensajes_email_notificaciones';
```

### 4) Programar ejecución periódica (cada minuto)

Puedes usar Supabase Scheduler o un cron externo que invoque:

```bash
curl -X POST "https://<project-ref>.supabase.co/functions/v1/send-message-emails" \
  -H "Authorization: Bearer <CRON_SECRET>" \
  -H "Content-Type: application/json"
```

### 4.1) Automatización con Netlify (incluida en este repo)

Se agrego una Scheduled Function en:

`netlify/functions/run-email-worker.js`

Frecuencia: cada minuto (`*/1 * * * *`).

Configura estas variables en Netlify Site Settings -> Environment Variables:

- `SUPABASE_CRON_SECRET`: mismo valor de `CRON_SECRET` en Supabase.
- `SUPABASE_PROJECT_REF`: `mkjvprcsakvfqxplqolq` (o tu project ref actual).

Opcional:

- `SUPABASE_FUNCTIONS_BASE_URL`: si quieres forzar base URL custom para las functions.

Luego haz deploy en Netlify para que el schedule quede activo.

## Pausar rápidamente sin redeploy

```sql
update public.feature_flags
set enabled = false, updated_at = now()
where key = 'mensajes_email_notificaciones';
```

## Próximo paso técnico recomendado

La función `supabase/functions/send-message-emails/index.ts` ya está conectada con Resend (`https://api.resend.com/emails`).

Si necesitas ajustes de plantilla, modifica el HTML generado en `sendEmailWithProvider`.
