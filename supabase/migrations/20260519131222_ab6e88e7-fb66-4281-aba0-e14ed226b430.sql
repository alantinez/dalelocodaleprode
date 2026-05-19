-- Achievements catalog + user_achievements
CREATE TABLE IF NOT EXISTS public.achievements (
  id TEXT PRIMARY KEY,
  title TEXT NOT NULL,
  description TEXT NOT NULL,
  icon TEXT NOT NULL,
  tier TEXT NOT NULL DEFAULT 'bronze',
  sort_order INT NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.achievements ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Achievements viewable by everyone"
  ON public.achievements FOR SELECT USING (true);

CREATE POLICY "Admins manage achievements"
  ON public.achievements FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE TABLE IF NOT EXISTS public.user_achievements (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  achievement_id TEXT NOT NULL REFERENCES public.achievements(id) ON DELETE CASCADE,
  awarded_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (user_id, achievement_id)
);

ALTER TABLE public.user_achievements ENABLE ROW LEVEL SECURITY;

CREATE POLICY "User achievements viewable by everyone"
  ON public.user_achievements FOR SELECT USING (true);

CREATE POLICY "Admins manage user achievements"
  ON public.user_achievements FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE INDEX IF NOT EXISTS idx_user_achievements_user ON public.user_achievements(user_id);

-- Seed catalog
INSERT INTO public.achievements (id, title, description, icon, tier, sort_order) VALUES
  ('first_prediction', 'Debut', 'Cargaste tu primer pronóstico', '🎯', 'bronze', 10),
  ('first_exact', 'Visionario', 'Acertaste tu primer resultado exacto', '🔮', 'silver', 20),
  ('five_exacts', 'Pulpo Paul', 'Llegaste a 5 exactos en el torneo', '🐙', 'gold', 30),
  ('ten_exacts', 'Oráculo', '10 exactos. Sos brujo.', '🧙', 'gold', 40),
  ('streak_3', 'En racha', '3 partidos seguidos con puntos', '🔥', 'silver', 50),
  ('streak_5', 'Encendido', '5 partidos seguidos con puntos', '⚡', 'gold', 60),
  ('draw_specialist', 'Especialista empates', 'Acertaste 3 empates exactos', '🤝', 'silver', 70),
  ('group_king', 'Rey del grupo', 'Terminaste primero en un grupo del torneo', '👑', 'gold', 80),
  ('mufa', 'Mufa oficial', 'Más de 5 partidos sin sumar puntos', '💀', 'bronze', 90),
  ('champion', 'Campeón', 'Campeón del Prode', '🏆', 'gold', 100)
ON CONFLICT (id) DO UPDATE SET
  title = EXCLUDED.title,
  description = EXCLUDED.description,
  icon = EXCLUDED.icon,
  tier = EXCLUDED.tier,
  sort_order = EXCLUDED.sort_order;