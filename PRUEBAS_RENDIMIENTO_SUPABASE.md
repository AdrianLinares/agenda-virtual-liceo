# Checklist de Validacion de Rendimiento (Supabase)

Fecha: 2026-03-22
Migracion objetivo: migrations/20260322_perf_indexes_rls_initplan.sql

## 1) Aplicacion de migracion

1. Ejecutar la migracion completa en SQL Editor o via pipeline.
2. Verificar que no existan errores de politicas o indices duplicados.

## 2) Verificacion rapida de indices

Ejecutar:

SELECT tablename, indexname
FROM pg_indexes
WHERE schemaname = 'public'
  AND indexname IN (
    'idx_profiles_role_active_name',
    'idx_mensajes_destinatario_created_at',
    'idx_mensajes_remitente_created_at',
    'idx_mensajes_destinatario_estado',
    'idx_permisos_estudiante_created_at',
    'idx_citaciones_estudiante_fecha',
    'idx_asignaciones_docentes_docente_grupo',
    'idx_estudiantes_grupos_grupo_estudiante_estado',
    'idx_anuncios_destinatarios_gin',
    'idx_eventos_destinatarios_gin'
  )
ORDER BY tablename, indexname;

Resultado esperado: 10 filas.

## 3) Verificacion de advisors

1. Re-ejecutar advisor de performance.
2. Confirmar reduccion de warnings auth_rls_initplan en tablas:
   - mensajes
   - anuncios
   - estudiantes_grupos
   - asignaciones_docentes
   - permisos
   - boletines
   - asistencias

## 4) EXPLAIN ANALYZE en queries criticas

Notas por periodo y estudiante:

EXPLAIN (ANALYZE, BUFFERS)
SELECT id, estudiante_id, asignatura_id, periodo_id, nota
FROM public.notas
WHERE periodo_id = '00000000-0000-0000-0000-000000000000'
  AND estudiante_id = '00000000-0000-0000-0000-000000000000';

Mensajes recibidos con orden:

EXPLAIN (ANALYZE, BUFFERS)
SELECT id, remitente_id, destinatario_id, estado, created_at
FROM public.mensajes
WHERE destinatario_id = '00000000-0000-0000-0000-000000000000'
ORDER BY created_at DESC
LIMIT 30;

Permisos por estudiante:

EXPLAIN (ANALYZE, BUFFERS)
SELECT id, estudiante_id, created_at
FROM public.permisos
WHERE estudiante_id = '00000000-0000-0000-0000-000000000000'
ORDER BY created_at DESC
LIMIT 30;

Citaciones por estudiante:

EXPLAIN (ANALYZE, BUFFERS)
SELECT id, estudiante_id, fecha_citacion
FROM public.citaciones
WHERE estudiante_id = '00000000-0000-0000-0000-000000000000'
ORDER BY fecha_citacion DESC
LIMIT 30;

Resultado esperado:
1. Uso de Index Scan o Bitmap Index Scan.
2. Menor tiempo total frente al baseline previo.

## 5) Baseline y comparativo de pg_stat_statements

Tomar snapshot antes y despues para queries de PostgREST:

SELECT
  left(query, 160) AS query_sample,
  calls,
  round(total_exec_time::numeric, 2) AS total_ms,
  round(mean_exec_time::numeric, 2) AS mean_ms
FROM pg_stat_statements
ORDER BY total_exec_time DESC
LIMIT 20;

Comparar:
1. mean_ms de consultas a profiles, mensajes, asignaciones_docentes, estudiantes_grupos.
2. total_ms acumulado en ventanas de trafico similares.

## 6) Smoke test funcional

1. Login con docente, padre, estudiante y administrativo.
2. Abrir listados de:
   - mensajes
   - notas
   - boletines
   - asistencia
   - permisos
   - anuncios/eventos
3. Validar que RLS siga bloqueando/permitiendo segun rol.
4. Confirmar que no hay errores 401/403 inesperados en frontend.

## 7) Rollback rapido (si se requiere)

Si se detecta regresion funcional:
1. Revertir politicas afectadas con una migracion de rollback.
2. Mantener indices (normalmente no rompen funcionalidad).
3. Re-ejecutar smoke tests de roles.
