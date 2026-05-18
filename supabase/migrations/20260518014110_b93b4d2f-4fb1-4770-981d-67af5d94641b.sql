
-- Función que calcula puntos para todas las predicciones de un partido y actualiza profiles
CREATE OR REPLACE FUNCTION public.recalculate_match_points(_match_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_home INT;
  v_away INT;
  v_status match_status;
  r RECORD;
  v_points INT;
  v_exact BOOLEAN;
  v_pred_diff INT;
  v_real_diff INT;
BEGIN
  SELECT home_score, away_score, status INTO v_home, v_away, v_status
  FROM public.matches WHERE id = _match_id;

  IF v_home IS NULL OR v_away IS NULL OR v_status <> 'finished' THEN
    RETURN;
  END IF;

  v_real_diff := v_home - v_away;

  FOR r IN SELECT id, user_id, home_score, away_score FROM public.predictions WHERE match_id = _match_id LOOP
    v_exact := (r.home_score = v_home AND r.away_score = v_away);
    v_pred_diff := r.home_score - r.away_score;

    IF v_exact THEN
      v_points := 5;
    ELSIF v_pred_diff = v_real_diff THEN
      v_points := 3;
    ELSIF sign(v_pred_diff) = sign(v_real_diff) THEN
      v_points := 2;
    ELSE
      v_points := 0;
    END IF;

    UPDATE public.predictions
       SET points = v_points, is_exact = v_exact, updated_at = now()
     WHERE id = r.id;
  END LOOP;

  -- Recalcular totales de todos los profiles afectados
  UPDATE public.profiles p
     SET total_points = COALESCE(s.total, 0),
         exact_hits  = COALESCE(s.exacts, 0),
         updated_at  = now()
    FROM (
      SELECT pr.user_id,
             SUM(pr.points)::INT AS total,
             SUM(CASE WHEN pr.is_exact THEN 1 ELSE 0 END)::INT AS exacts
        FROM public.predictions pr
        JOIN public.matches m ON m.id = pr.match_id
       WHERE m.status = 'finished'
       GROUP BY pr.user_id
    ) s
   WHERE p.id = s.user_id;
END;
$$;

-- Trigger en matches: cuando cambian scores o status, recalcular
CREATE OR REPLACE FUNCTION public.trg_match_score_update()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.status = 'finished' AND NEW.home_score IS NOT NULL AND NEW.away_score IS NOT NULL THEN
    PERFORM public.recalculate_match_points(NEW.id);
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS matches_recalc_points ON public.matches;
CREATE TRIGGER matches_recalc_points
AFTER UPDATE OF home_score, away_score, status ON public.matches
FOR EACH ROW
EXECUTE FUNCTION public.trg_match_score_update();

-- Bootstrap admin: el primer usuario autenticado puede reclamarlo si no hay ningún admin
CREATE OR REPLACE FUNCTION public.claim_admin_if_empty()
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_uid uuid := auth.uid();
  v_count INT;
BEGIN
  IF v_uid IS NULL THEN
    RAISE EXCEPTION 'Debes estar autenticado';
  END IF;
  SELECT COUNT(*) INTO v_count FROM public.user_roles WHERE role = 'admin';
  IF v_count > 0 THEN
    RETURN false;
  END IF;
  INSERT INTO public.user_roles (user_id, role) VALUES (v_uid, 'admin')
  ON CONFLICT DO NOTHING;
  RETURN true;
END;
$$;
