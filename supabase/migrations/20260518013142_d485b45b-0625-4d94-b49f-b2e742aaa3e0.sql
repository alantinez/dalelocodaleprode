
-- TEAMS
CREATE TABLE public.teams (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL UNIQUE,
  code TEXT NOT NULL UNIQUE,
  "group" TEXT,
  flag_url TEXT,
  confederation TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.teams ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Teams are viewable by everyone" ON public.teams FOR SELECT USING (true);
CREATE POLICY "Admins manage teams" ON public.teams FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- MATCH STAGE ENUM
CREATE TYPE public.match_stage AS ENUM ('group','r32','r16','qf','sf','third','final');
CREATE TYPE public.match_status AS ENUM ('scheduled','live','finished','postponed');

-- MATCHES
CREATE TABLE public.matches (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  home_team_id UUID REFERENCES public.teams(id) ON DELETE RESTRICT,
  away_team_id UUID REFERENCES public.teams(id) ON DELETE RESTRICT,
  kickoff TIMESTAMPTZ NOT NULL,
  stage public.match_stage NOT NULL DEFAULT 'group',
  "group" TEXT,
  venue TEXT,
  home_score INTEGER,
  away_score INTEGER,
  status public.match_status NOT NULL DEFAULT 'scheduled',
  match_number INTEGER,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_matches_kickoff ON public.matches(kickoff);
CREATE INDEX idx_matches_stage ON public.matches(stage);

ALTER TABLE public.matches ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Matches are viewable by everyone" ON public.matches FOR SELECT USING (true);
CREATE POLICY "Admins manage matches" ON public.matches FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE TRIGGER matches_updated_at BEFORE UPDATE ON public.matches
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- PREDICTIONS
CREATE TABLE public.predictions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  match_id UUID NOT NULL REFERENCES public.matches(id) ON DELETE CASCADE,
  home_score INTEGER NOT NULL CHECK (home_score >= 0 AND home_score <= 20),
  away_score INTEGER NOT NULL CHECK (away_score >= 0 AND away_score <= 20),
  points INTEGER NOT NULL DEFAULT 0,
  is_exact BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (user_id, match_id)
);

CREATE INDEX idx_predictions_user ON public.predictions(user_id);
CREATE INDEX idx_predictions_match ON public.predictions(match_id);

ALTER TABLE public.predictions ENABLE ROW LEVEL SECURITY;

-- View: own predictions always; others only after kickoff
CREATE POLICY "View own predictions" ON public.predictions FOR SELECT TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "View others predictions after kickoff" ON public.predictions FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM public.matches m WHERE m.id = match_id AND m.kickoff <= now()));

CREATE POLICY "Insert own predictions" ON public.predictions FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Update own predictions" ON public.predictions FOR UPDATE TO authenticated
  USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Delete own predictions" ON public.predictions FOR DELETE TO authenticated
  USING (auth.uid() = user_id);

CREATE TRIGGER predictions_updated_at BEFORE UPDATE ON public.predictions
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Lock trigger: bloquea insert/update si el partido ya empezó
CREATE OR REPLACE FUNCTION public.enforce_prediction_lock()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_kickoff TIMESTAMPTZ;
BEGIN
  SELECT kickoff INTO v_kickoff FROM public.matches WHERE id = NEW.match_id;
  IF v_kickoff IS NULL THEN
    RAISE EXCEPTION 'Partido inexistente';
  END IF;
  IF now() >= v_kickoff THEN
    RAISE EXCEPTION 'El pronóstico está cerrado: el partido ya comenzó';
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER predictions_lock_ins BEFORE INSERT ON public.predictions
  FOR EACH ROW EXECUTE FUNCTION public.enforce_prediction_lock();
CREATE TRIGGER predictions_lock_upd BEFORE UPDATE ON public.predictions
  FOR EACH ROW EXECUTE FUNCTION public.enforce_prediction_lock();
