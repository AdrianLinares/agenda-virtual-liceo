#!/usr/bin/env bash
set -euo pipefail

# Exporta una copia local de los mensajes y de la cola de notificaciones.
# Requiere: SUPABASE_DB_URL (connection string Postgres de Supabase).
# Uso:
#   SUPABASE_DB_URL="postgresql://..." ./scripts/export_messages_backup.sh
#   SUPABASE_DB_URL="postgresql://..." ./scripts/export_messages_backup.sh --output-dir ./backups/mensajes

if ! command -v psql >/dev/null 2>&1; then
  echo "ERROR: psql no está instalado o no está en PATH." >&2
  exit 1
fi

if [[ -z "${SUPABASE_DB_URL:-}" ]]; then
  echo "ERROR: Debes definir SUPABASE_DB_URL con la conexión Postgres de Supabase." >&2
  exit 1
fi

OUTPUT_DIR="./backups/mensajes"

while [[ $# -gt 0 ]]; do
  case "$1" in
    --output-dir)
      OUTPUT_DIR="${2:-}"
      shift 2
      ;;
    *)
      echo "ERROR: argumento no reconocido: $1" >&2
      exit 1
      ;;
  esac
done

TIMESTAMP="$(date +%Y%m%d_%H%M%S)"
mkdir -p "$OUTPUT_DIR"

MESSAGES_CSV="$OUTPUT_DIR/mensajes_${TIMESTAMP}.csv"
MESSAGES_JSON="$OUTPUT_DIR/mensajes_${TIMESTAMP}.json"
QUEUE_CSV="$OUTPUT_DIR/email_notifications_queue_${TIMESTAMP}.csv"
QUEUE_JSON="$OUTPUT_DIR/email_notifications_queue_${TIMESTAMP}.json"
META_TXT="$OUTPUT_DIR/export_meta_${TIMESTAMP}.txt"

echo "[1/5] Exportando mensajes a CSV..."
psql "$SUPABASE_DB_URL" -v ON_ERROR_STOP=1 -c "\\copy (
  SELECT
    m.id,
    m.created_at,
    m.remitente_id,
    r.email AS remitente_email,
    r.nombre_completo AS remitente_nombre,
    m.destinatario_id,
    d.email AS destinatario_email,
    d.nombre_completo AS destinatario_nombre,
    m.asunto,
    m.contenido,
    m.estado,
    m.leido_en
  FROM public.mensajes m
  LEFT JOIN public.profiles r ON r.id = m.remitente_id
  LEFT JOIN public.profiles d ON d.id = m.destinatario_id
  ORDER BY m.created_at ASC
) TO STDOUT WITH CSV HEADER" > "$MESSAGES_CSV"

echo "[2/5] Exportando mensajes a JSON..."
psql "$SUPABASE_DB_URL" -v ON_ERROR_STOP=1 -tA -c "
  SELECT COALESCE(json_agg(t), '[]'::json)::text
  FROM (
    SELECT
      m.id,
      m.created_at,
      m.remitente_id,
      r.email AS remitente_email,
      r.nombre_completo AS remitente_nombre,
      m.destinatario_id,
      d.email AS destinatario_email,
      d.nombre_completo AS destinatario_nombre,
      m.asunto,
      m.contenido,
      m.estado,
      m.leido_en
    FROM public.mensajes m
    LEFT JOIN public.profiles r ON r.id = m.remitente_id
    LEFT JOIN public.profiles d ON d.id = m.destinatario_id
    ORDER BY m.created_at ASC
  ) t;
" > "$MESSAGES_JSON"

echo "[3/5] Exportando cola de notificaciones a CSV..."
psql "$SUPABASE_DB_URL" -v ON_ERROR_STOP=1 -c "\\copy (
  SELECT
    q.id,
    q.created_at,
    q.updated_at,
    q.mensaje_id,
    q.remitente_id,
    q.destinatario_id,
    q.destinatario_email,
    q.asunto,
    q.status,
    q.attempt_count,
    q.max_attempts,
    q.last_error,
    q.next_retry_at,
    q.sent_at,
    q.provider_message_id
  FROM public.email_notifications_queue q
  ORDER BY q.created_at ASC
) TO STDOUT WITH CSV HEADER" > "$QUEUE_CSV"

echo "[4/5] Exportando cola de notificaciones a JSON..."
psql "$SUPABASE_DB_URL" -v ON_ERROR_STOP=1 -tA -c "
  SELECT COALESCE(json_agg(t), '[]'::json)::text
  FROM (
    SELECT
      q.id,
      q.created_at,
      q.updated_at,
      q.mensaje_id,
      q.remitente_id,
      q.destinatario_id,
      q.destinatario_email,
      q.asunto,
      q.status,
      q.attempt_count,
      q.max_attempts,
      q.last_error,
      q.next_retry_at,
      q.sent_at,
      q.provider_message_id
    FROM public.email_notifications_queue q
    ORDER BY q.created_at ASC
  ) t;
" > "$QUEUE_JSON"

MESSAGES_COUNT="$(psql "$SUPABASE_DB_URL" -v ON_ERROR_STOP=1 -tA -c "SELECT COUNT(*) FROM public.mensajes;")"
QUEUE_COUNT="$(psql "$SUPABASE_DB_URL" -v ON_ERROR_STOP=1 -tA -c "SELECT COUNT(*) FROM public.email_notifications_queue;")"

echo "[5/5] Guardando metadatos de respaldo..."
cat > "$META_TXT" <<EOF
export_timestamp=$TIMESTAMP
messages_count=$MESSAGES_COUNT
queue_count=$QUEUE_COUNT
messages_csv=$MESSAGES_CSV
messages_json=$MESSAGES_JSON
queue_csv=$QUEUE_CSV
queue_json=$QUEUE_JSON
EOF

echo "Backup completado."
echo "- Mensajes: $MESSAGES_COUNT"
echo "- Cola notificaciones: $QUEUE_COUNT"
echo "- Carpeta: $OUTPUT_DIR"
