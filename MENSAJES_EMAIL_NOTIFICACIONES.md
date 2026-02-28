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

## Activación futura con Resend

### 1) Desplegar función

```bash
supabase functions deploy send-message-emails
```

### 2) Configurar secretos de la función

```bash
supabase secrets set CRON_SECRET="tu-secreto-cron"
supabase secrets set RESEND_API_KEY="re_xxxxxxxxx"
supabase secrets set EMAIL_FROM="Agenda Virtual <no-reply@tu-dominio.edu.co>"
supabase secrets set APP_BASE_URL="https://tu-app.com"
supabase secrets set EMAIL_NOTIFICATIONS_DRY_RUN="false"
supabase secrets set EMAIL_NOTIFICATIONS_BATCH_SIZE="20"
```

> Mientras no tengas el dominio verificado en Resend, deja `EMAIL_NOTIFICATIONS_DRY_RUN=true`.

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

## Pausar rápidamente sin redeploy

```sql
update public.feature_flags
set enabled = false, updated_at = now()
where key = 'mensajes_email_notificaciones';
```

## Próximo paso técnico recomendado

La función `supabase/functions/send-message-emails/index.ts` ya está conectada con Resend (`https://api.resend.com/emails`).

Si necesitas ajustes de plantilla, modifica el HTML generado en `sendEmailWithProvider`.
