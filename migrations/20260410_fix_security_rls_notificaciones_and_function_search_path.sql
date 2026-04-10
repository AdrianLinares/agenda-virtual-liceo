-- =====================================================
-- Security hardening: notificaciones RLS + function search_path
-- =====================================================

BEGIN;

-- 1) Ensure RLS is enabled on public.notificaciones
ALTER TABLE IF EXISTS public.notificaciones ENABLE ROW LEVEL SECURITY;

-- 2) Reset policies to a clear, least-privilege model for notifications
DROP POLICY IF EXISTS "Users view own notifications" ON public.notificaciones;
DROP POLICY IF EXISTS "Users update own notifications" ON public.notificaciones;
DROP POLICY IF EXISTS "Admins manage notifications" ON public.notificaciones;

CREATE POLICY "Users view own notifications"
ON public.notificaciones
FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Users update own notifications"
ON public.notificaciones
FOR UPDATE
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Admins manage notifications"
ON public.notificaciones
FOR ALL
USING (public.is_admin())
WITH CHECK (public.is_admin());

-- 3) Add explicit policies for tables with RLS but no policies
DROP POLICY IF EXISTS "Admins read feature flags" ON public.feature_flags;
DROP POLICY IF EXISTS "Admins read email notifications queue" ON public.email_notifications_queue;

CREATE POLICY "Admins read feature flags"
ON public.feature_flags
FOR SELECT
USING (public.is_admin());

CREATE POLICY "Admins read email notifications queue"
ON public.email_notifications_queue
FOR SELECT
USING (public.is_admin());

-- 4) Fix mutable search_path on public functions reported by the advisor
DO $$
DECLARE
    fn regprocedure;
BEGIN
    FOR fn IN
        SELECT p.oid::regprocedure
        FROM pg_proc p
        JOIN pg_namespace n ON n.oid = p.pronamespace
        WHERE n.nspname = 'public'
          AND p.proname = ANY (
              ARRAY[
                  'update_updated_at_column',
                  'set_received_email_events_updated_at',
                  'is_feature_enabled',
                  'set_email_queue_updated_at'
              ]
          )
    LOOP
        EXECUTE format('ALTER FUNCTION %s SET search_path = public', fn);
    END LOOP;
END;
$$;

COMMIT;
