-- Sincroniza boletines automaticamente a partir de notas
-- Fecha: 2026-03-07

CREATE OR REPLACE FUNCTION public.recalculate_boletin_from_notas(
  p_estudiante_id UUID,
  p_periodo_id UUID,
  p_grupo_id UUID DEFAULT NULL
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_promedio NUMERIC;
  v_total INTEGER;
  v_grupo_id UUID;
BEGIN
  SELECT COUNT(*)::INTEGER, AVG(n.nota)
  INTO v_total, v_promedio
  FROM public.notas n
  WHERE n.estudiante_id = p_estudiante_id
    AND n.periodo_id = p_periodo_id;

  IF v_total = 0 THEN
    DELETE FROM public.boletines b
    WHERE b.estudiante_id = p_estudiante_id
      AND b.periodo_id = p_periodo_id;
    RETURN;
  END IF;

  v_grupo_id := COALESCE(
    p_grupo_id,
    (
      SELECT n.grupo_id
      FROM public.notas n
      WHERE n.estudiante_id = p_estudiante_id
        AND n.periodo_id = p_periodo_id
      ORDER BY n.created_at DESC
      LIMIT 1
    )
  );

  INSERT INTO public.boletines (
    estudiante_id,
    periodo_id,
    grupo_id,
    promedio_general,
    fecha_generacion,
    generado_por
  )
  VALUES (
    p_estudiante_id,
    p_periodo_id,
    v_grupo_id,
    ROUND(v_promedio::NUMERIC, 2),
    NOW(),
    auth.uid()
  )
  ON CONFLICT (estudiante_id, periodo_id)
  DO UPDATE
    SET grupo_id = EXCLUDED.grupo_id,
        promedio_general = EXCLUDED.promedio_general,
        fecha_generacion = NOW(),
        generado_por = COALESCE(public.boletines.generado_por, EXCLUDED.generado_por);
END;
$$;

CREATE OR REPLACE FUNCTION public.sync_boletines_from_notas_trigger()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    PERFORM public.recalculate_boletin_from_notas(NEW.estudiante_id, NEW.periodo_id, NEW.grupo_id);
    RETURN NEW;
  END IF;

  IF TG_OP = 'UPDATE' THEN
    IF OLD.estudiante_id IS DISTINCT FROM NEW.estudiante_id
      OR OLD.periodo_id IS DISTINCT FROM NEW.periodo_id THEN
      PERFORM public.recalculate_boletin_from_notas(OLD.estudiante_id, OLD.periodo_id, OLD.grupo_id);
    END IF;

    PERFORM public.recalculate_boletin_from_notas(NEW.estudiante_id, NEW.periodo_id, NEW.grupo_id);
    RETURN NEW;
  END IF;

  -- DELETE
  PERFORM public.recalculate_boletin_from_notas(OLD.estudiante_id, OLD.periodo_id, OLD.grupo_id);
  RETURN OLD;
END;
$$;

DROP TRIGGER IF EXISTS trg_sync_boletines_from_notas ON public.notas;

CREATE TRIGGER trg_sync_boletines_from_notas
AFTER INSERT OR UPDATE OR DELETE ON public.notas
FOR EACH ROW
EXECUTE FUNCTION public.sync_boletines_from_notas_trigger();
