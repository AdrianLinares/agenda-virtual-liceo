#!/usr/bin/env bash
set -euo pipefail

NEW_RESEND_API_KEY="${1:-}"
NEW_CRON_SECRET="${2:-}"

if [[ -z "$NEW_RESEND_API_KEY" || -z "$NEW_CRON_SECRET" ]]; then
  echo "Uso: $0 <NEW_RESEND_API_KEY> <NEW_CRON_SECRET>"
  exit 1
fi

if [[ "$NEW_RESEND_API_KEY" != re_* ]]; then
  echo "ERROR: NEW_RESEND_API_KEY debe iniciar con 're_'"
  exit 1
fi

if [[ ${#NEW_CRON_SECRET} -lt 32 ]]; then
  echo "ERROR: NEW_CRON_SECRET debe tener al menos 32 caracteres"
  exit 1
fi

npx supabase secrets set RESEND_API_KEY="$NEW_RESEND_API_KEY"
npx supabase secrets set CRON_SECRET="$NEW_CRON_SECRET"

npx supabase secrets list | grep -E "RESEND_API_KEY|CRON_SECRET" || {
  echo "ERROR: No se encontraron secretos en la lista"
  exit 1
}

curl -sS -X POST "https://mkjvprcsakvfqxplqolq.supabase.co/functions/v1/send-message-emails" \
  -H "Authorization: Bearer ${NEW_CRON_SECRET}" \
  -H "Content-Type: application/json"

echo
echo "Ejecuta en SQL Editor:"
echo "update public.email_notifications_queue set next_retry_at = now() where status = 'pending';"
