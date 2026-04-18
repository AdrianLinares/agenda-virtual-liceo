-- Diagnóstico consolidado de incidentes de login/perfil en Supabase.
-- Devuelve semáforo por chequeo + resumen general.

WITH
missing_profiles AS (
  SELECT u.id, u.email, u.created_at
  FROM auth.users u
  LEFT JOIN public.profiles p ON p.id = u.id
  WHERE p.id IS NULL
),
missing_count AS (
  SELECT COUNT(*)::int AS cnt
  FROM missing_profiles
),
rls_state AS (
  SELECT COALESCE(c.relrowsecurity, false) AS enabled
  FROM pg_class c
  JOIN pg_namespace n ON n.oid = c.relnamespace
  WHERE n.nspname = 'public'
    AND c.relname = 'profiles'
),
select_policies AS (
  SELECT COUNT(*)::int AS cnt
  FROM pg_policies
  WHERE schemaname = 'public'
    AND tablename = 'profiles'
    AND cmd = 'SELECT'
),
own_profile_policy AS (
  SELECT EXISTS (
    SELECT 1
    FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'profiles'
      AND cmd = 'SELECT'
      AND (
        policyname ILIKE '%own profile%'
        OR policyname ILIKE '%read access for own profile%'
        OR (
          COALESCE(qual, '') ILIKE '%auth.uid%'
          AND COALESCE(qual, '') ILIKE '%id%'
        )
      )
  ) AS ok
),
trigger_state AS (
  SELECT
    EXISTS (
      SELECT 1
      FROM pg_trigger t
      JOIN pg_class c ON c.oid = t.tgrelid
      JOIN pg_namespace n ON n.oid = c.relnamespace
      WHERE n.nspname = 'auth'
        AND c.relname = 'users'
        AND t.tgname = 'on_auth_user_created'
        AND NOT t.tgisinternal
    ) AS exists_trigger,
    EXISTS (
      SELECT 1
      FROM pg_trigger t
      JOIN pg_class c ON c.oid = t.tgrelid
      JOIN pg_namespace n ON n.oid = c.relnamespace
      WHERE n.nspname = 'auth'
        AND c.relname = 'users'
        AND t.tgname = 'on_auth_user_created'
        AND NOT t.tgisinternal
        AND t.tgenabled <> 'D'
    ) AS enabled_trigger
),
rows AS (
  SELECT
    'profiles_missing_for_auth_users'::text AS check_name,
    CASE
      WHEN mc.cnt = 0 THEN 'ok'
      WHEN mc.cnt <= 5 THEN 'warning'
      ELSE 'critical'
    END AS status,
    mc.cnt::text AS value,
    CASE
      WHEN mc.cnt = 0 THEN 'No hay usuarios en auth.users sin perfil en public.profiles.'
      ELSE 'Hay usuarios autenticados sin perfil. Esto dispara errores en carga de perfil al iniciar sesión.'
    END AS detail,
    CASE
      WHEN mc.cnt = 0 THEN 'Sin acción.'
      ELSE 'Ejecutar inserción de backfill para crear perfiles faltantes.'
    END AS suggested_action
  FROM missing_count mc

  UNION ALL

  SELECT
    'profiles_rls_enabled'::text,
    CASE WHEN rs.enabled THEN 'ok' ELSE 'critical' END,
    rs.enabled::text,
    CASE
      WHEN rs.enabled THEN 'RLS está habilitado en public.profiles.'
      ELSE 'RLS está deshabilitado en public.profiles.'
    END,
    CASE
      WHEN rs.enabled THEN 'Sin acción.'
      ELSE 'Habilitar RLS y revisar políticas de SELECT/UPDATE/INSERT.'
    END
  FROM rls_state rs

  UNION ALL

  SELECT
    'profiles_select_policies_present'::text,
    CASE WHEN sp.cnt > 0 THEN 'ok' ELSE 'critical' END,
    sp.cnt::text,
    CASE
      WHEN sp.cnt > 0 THEN 'Existen políticas SELECT sobre public.profiles.'
      ELSE 'No existen políticas SELECT sobre public.profiles.'
    END,
    CASE
      WHEN sp.cnt > 0 THEN 'Sin acción.'
      ELSE 'Crear al menos una policy para lectura de perfil propio y roles autorizados.'
    END
  FROM select_policies sp

  UNION ALL

  SELECT
    'profiles_own_read_policy_detected'::text,
    CASE WHEN opp.ok THEN 'ok' ELSE 'warning' END,
    opp.ok::text,
    CASE
      WHEN opp.ok THEN 'Se detecta policy de lectura de perfil propio (por nombre o expresión).' 
      ELSE 'No se detectó claramente policy de lectura de perfil propio.'
    END,
    CASE
      WHEN opp.ok THEN 'Sin acción inmediata.'
      ELSE 'Revisar pg_policies y asegurar condición equivalente a auth.uid() = id para SELECT.'
    END
  FROM own_profile_policy opp

  UNION ALL

  SELECT
    'on_auth_user_created_trigger'::text,
    CASE
      WHEN ts.exists_trigger AND ts.enabled_trigger THEN 'ok'
      WHEN ts.exists_trigger AND NOT ts.enabled_trigger THEN 'critical'
      ELSE 'critical'
    END,
    CASE
      WHEN ts.exists_trigger THEN CASE WHEN ts.enabled_trigger THEN 'exists_enabled' ELSE 'exists_disabled' END
      ELSE 'missing'
    END,
    CASE
      WHEN ts.exists_trigger AND ts.enabled_trigger THEN 'Trigger de autocreación de perfil existe y está habilitado.'
      WHEN ts.exists_trigger AND NOT ts.enabled_trigger THEN 'Trigger de autocreación de perfil existe pero está deshabilitado.'
      ELSE 'No existe trigger de autocreación de perfil en auth.users.'
    END,
    CASE
      WHEN ts.exists_trigger AND ts.enabled_trigger THEN 'Sin acción.'
      WHEN ts.exists_trigger AND NOT ts.enabled_trigger THEN 'Habilitar trigger on_auth_user_created.'
      ELSE 'Crear trigger on_auth_user_created y función handle_new_user().' 
    END
  FROM trigger_state ts
)
SELECT
  r.check_name,
  r.status,
  r.value,
  r.detail,
  r.suggested_action
FROM rows r
ORDER BY
  CASE r.status
    WHEN 'critical' THEN 1
    WHEN 'warning' THEN 2
    ELSE 3
  END,
  r.check_name;

-- Resumen rápido (opcional):
-- SELECT
--   COUNT(*) FILTER (WHERE status = 'critical') AS critical_count,
--   COUNT(*) FILTER (WHERE status = 'warning') AS warning_count,
--   COUNT(*) FILTER (WHERE status = 'ok') AS ok_count
-- FROM (
--   WITH ... same CTEs ... SELECT status FROM rows
-- ) s;
