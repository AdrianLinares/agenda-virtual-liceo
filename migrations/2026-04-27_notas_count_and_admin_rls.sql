-- Migration: 2026-04-27_notas_count_and_admin_rls.sql
-- Description: Add notas_count RPC function and RLS policy for admin/administrativo roles

-- Up Migration

-- Create the notas_count function
CREATE OR REPLACE FUNCTION public.notas_count(params JSON DEFAULT NULL)
RETURNS bigint
LANGUAGE plpgsql
SECURITY INVOKER
AS $$
DECLARE
    result_count bigint;
    periodo_filter text[];
    grupo_filter text[];
    asignatura_filter text[];
    estudiante_filter text;
    search_filter text;
BEGIN
    -- Extract filters from params JSON
    periodo_filter := ARRAY(SELECT json_array_elements_text(params->'periodo_id'))::text[];
    grupo_filter := CASE WHEN params ? 'grupo_id' THEN ARRAY(SELECT json_array_elements_text(params->'grupo_id'))::text[] ELSE NULL END;
    asignatura_filter := CASE WHEN params ? 'asignatura_id' THEN ARRAY(SELECT json_array_elements_text(params->'asignatura_id'))::text[] ELSE NULL END;
    estudiante_filter := params->>'estudiante_id';
    search_filter := params->>'search';

    -- Build the query dynamically
    EXECUTE format(
        'SELECT COUNT(*) FROM public.notas n
         JOIN public.asignaturas a ON n.asignatura_id = a.id
         JOIN public.periodos p ON n.periodo_id = p.id
         JOIN public.grupos g ON n.grupo_id = g.id
         JOIN public.profiles pr ON n.estudiante_id = pr.id
         WHERE (%L IS NULL OR n.periodo_id = ANY(%L))
           AND (%L IS NULL OR n.grupo_id = ANY(%L))
           AND (%L IS NULL OR n.asignatura_id = ANY(%L))
           AND (%L IS NULL OR n.estudiante_id = %L)
           AND (%L IS NULL OR (a.nombre ILIKE %L OR pr.nombre_completo ILIKE %L))',
        periodo_filter, periodo_filter,
        grupo_filter, grupo_filter,
        asignatura_filter, asignatura_filter,
        estudiante_filter, estudiante_filter,
        search_filter, '%' || search_filter || '%', '%' || search_filter || '%'
    ) INTO result_count;

    RETURN result_count;
END;
$$;

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION public.notas_count(JSON) TO authenticated;

-- Create RLS policy for admin/administrativo roles to allow SELECT on notas
CREATE POLICY allow_admin_select ON public.notas
FOR SELECT
TO administrador, administrativo
USING (true);

-- Down Migration

-- DROP FUNCTION IF EXISTS public.notas_count(JSON);
-- DROP POLICY IF EXISTS allow_admin_select ON public.notas;