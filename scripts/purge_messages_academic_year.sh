#!/usr/bin/env bash
set -euo pipefail

# Purga mensajes de un rango de fechas (año lectivo) y limpia su cola asociada.
# Requiere: SUPABASE_DB_URL (connection string Postgres de Supabase).
# Uso:
#   SUPABASE_DB_URL="postgresql://..." ./scripts/purge_messages_academic_year.sh --start-date 2026-01-01 --end-date 2026-12-31 --yes
#
# Opcionalmente puede hacer backup local antes de borrar:
#   SUPABASE_DB_URL="postgresql://..." ./scripts/purge_messages_academic_year.sh --start-date 2026-01-01 --end-date 2026-12-31 --backup --yes

if ! command -v psql >/dev/null 2>&1; then
  echo "ERROR: psql no está instalado o no está en PATH." >&2
  exit 1
fi

if [[ -z "${SUPABASE_DB_URL:-}" ]]; then
  echo "ERROR: Debes definir SUPABASE_DB_URL con la conexión Postgres de Supabase." >&2
  exit 1
fi

START_DATE=""
END_DATE=""
DO_BACKUP="false"
AUTO_YES="false"

while [[ $# -gt 0 ]]; do
  case "$1" in
    --start-date)
      START_DATE="${2:-}"
      shift 2
      ;;
    --end-date)
      END_DATE="${2:-}"
      shift 2
      ;;
    --backup)
      DO_BACKUP="true"
      shift
      ;;
    --yes)
      AUTO_YES="true"
      shift
      ;;
    *)
      echo "ERROR: argumento no reconocido: $1" >&2
      exit 1
      ;;
  esac
done

if [[ -z "$START_DATE" || -z "$END_DATE" ]]; then
  echo "ERROR: debes enviar --start-date YYYY-MM-DD y --end-date YYYY-MM-DD" >&2
  exit 1
fi

if [[ ! "$START_DATE" =~ ^[0-9]{4}-[0-9]{2}-[0-9]{2}$ ]]; then
  echo "ERROR: --start-date no tiene formato YYYY-MM-DD" >&2
  exit 1
fi

if [[ ! "$END_DATE" =~ ^[0-9]{4}-[0-9]{2}-[0-9]{2}$ ]]; then
  echo "ERROR: --end-date no tiene formato YYYY-MM-DD" >&2
  exit 1
fi

if [[ "$DO_BACKUP" == "true" ]]; then
  if [[ ! -x "./scripts/export_messages_backup.sh" ]]; then
    echo "ERROR: no se encontró script ejecutable ./scripts/export_messages_backup.sh" >&2
    exit 1
  fi
  echo "Ejecutando backup previo..."
  ./scripts/export_messages_backup.sh
fi

if [[ "$AUTO_YES" != "true" ]]; then
  echo "Vas a borrar mensajes entre $START_DATE y $END_DATE (inclusive)."
  echo "Además se borrarán registros relacionados en email_notifications_queue y se desactivará el flag mensajes_email_notificaciones."
  read -r -p "Escribe BORRAR para continuar: " CONFIRM
  if [[ "$CONFIRM" != "BORRAR" ]]; then
    echo "Operación cancelada."
    exit 0
  fi
fi

echo "Ejecutando purga anual de mensajes..."
psql "$SUPABASE_DB_URL" -v ON_ERROR_STOP=1 -v start_date="$START_DATE" -v end_date="$END_DATE" <<'SQL'
BEGIN;

UPDATE public.feature_flags
SET enabled = false,
    updated_at = NOW()
WHERE key = 'mensajes_email_notificaciones';

CREATE TEMP TABLE _target_messages AS
SELECT m.id
FROM public.mensajes m
WHERE m.created_at >= :'start_date'::date
  AND m.created_at < (:'end_date'::date + INTERVAL '1 day');

CREATE TEMP TABLE _purge_counts AS
SELECT
  (SELECT COUNT(*) FROM _target_messages) AS mensajes_objetivo,
  (
    SELECT COUNT(*)
    FROM public.email_notifications_queue q
    WHERE q.mensaje_id IN (SELECT id FROM _target_messages)
  ) AS queue_objetivo,
  (SELECT COUNT(*) FROM public.mensajes) AS mensajes_totales_antes,
  (SELECT COUNT(*) FROM public.email_notifications_queue) AS queue_totales_antes;

DELETE FROM public.email_notifications_queue q
USING _target_messages t
WHERE q.mensaje_id = t.id;

DELETE FROM public.mensajes m
USING _target_messages t
WHERE m.id = t.id;

SELECT
  :'start_date'::date AS start_date,
  :'end_date'::date AS end_date,
  mensajes_objetivo,
  queue_objetivo,
  (SELECT COUNT(*) FROM public.mensajes) AS mensajes_totales_despues,
  (SELECT COUNT(*) FROM public.email_notifications_queue) AS queue_totales_despues,
  (mensajes_totales_antes - (SELECT COUNT(*) FROM public.mensajes)) AS mensajes_eliminados,
  (queue_totales_antes - (SELECT COUNT(*) FROM public.email_notifications_queue)) AS queue_eliminados
FROM _purge_counts;

COMMIT;
SQL

echo "Purga completada para el rango $START_DATE a $END_DATE."
echo "Importante: cuando inicie el siguiente año lectivo, puedes volver a activar el flag mensajes_email_notificaciones si corresponde."
