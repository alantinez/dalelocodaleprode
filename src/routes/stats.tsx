import { useMemo, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  BarChart,
  Bar,
  Legend,
} from "recharts";
import { BarChart3, TrendingUp, Target, Flame, Users, Swords, Trophy, Sparkles } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Navbar } from "@/components/landing/Navbar";
import { useAuth } from "@/hooks/use-auth";

export const Route = createFileRoute("/stats")({
  component: StatsPage,
  head: () => ({
    meta: [
      { title: "Estadísticas · PRODE Mundial 2026" },
      { name: "description", content: "Estadísticas avanzadas, evolución y head-to-head del Prode del Mundial 2026." },
    ],
  }),
});

type PlayerRow = {
  id: string;
  display_name: string;
  avatar_url: string | null;
  total_points: number;
  exact_hits: number;
  current_streak: number;
};

type PredRow = {
  id: string;
  user_id: string;
  match_id: string;
  home_score: number;
  away_score: number;
  points: number;
  is_exact: boolean;
  matches: {
    id: string;
    kickoff: string;
    status: string;
    home_score: number | null;
    away_score: number | null;
    home_team_id: string | null;
    away_team_id: string | null;
  } | null;
};

function Kpi({
  icon: Icon,
  label,
  value,
  tone = "primary",
}: {
  icon: typeof Trophy;
  label: string;
  value: string | number;
  tone?: "primary" | "secondary" | "gold" | "destructive";
}) {
  const tones: Record<string, string> = {
    primary: "text-primary",
    secondary: "text-secondary",
    gold: "text-gold",
    destructive: "text-destructive",
  };
  return (
    <div className="glass rounded-2xl p-4 sm:p-5">
      <Icon className={`w-5 h-5 ${tones[tone]}`} />
      <div className={`font-display font-bold text-2xl sm:text-3xl mt-2 ${tones[tone]}`}>{value}</div>
      <div className="text-[10px] sm:text-xs uppercase tracking-widest text-muted-foreground mt-1">
        {label}
      </div>
    </div>
  );
}

function PlayerSelect({
  players,
  value,
  onChange,
  label,
}: {
  players: PlayerRow[];
  value: string;
  onChange: (v: string) => void;
  label: string;
}) {
  return (
    <label className="flex-1 min-w-[200px]">
      <span className="text-[10px] font-mono uppercase tracking-widest text-muted-foreground">
        {label}
      </span>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="mt-1 w-full glass rounded-xl px-3 py-2.5 text-sm font-medium bg-card cursor-pointer focus:outline-none focus:ring-2 focus:ring-primary/40"
      >
        <option value="">— Seleccionar jugador —</option>
        {players.map((p) => (
          <option key={p.id} value={p.id}>
            {p.display_name}
          </option>
        ))}
      </select>
    </label>
  );
}

function computeStats(preds: PredRow[]) {
  const finished = preds.filter((p) => p.matches?.status === "finished");
  const totalPoints = finished.reduce((s, p) => s + (p.points ?? 0), 0);
  const exacts = finished.filter((p) => p.is_exact).length;
  const hits = finished.filter((p) => (p.points ?? 0) > 0).length;
  const accuracy = finished.length ? Math.round((hits / finished.length) * 100) : 0;

  // Day buckets
  const byDay = new Map<string, number>();
  for (const p of finished) {
    const d = p.matches!.kickoff.slice(0, 10);
    byDay.set(d, (byDay.get(d) ?? 0) + (p.points ?? 0));
  }
  let best: { day: string; pts: number } | null = null;
  let worst: { day: string; pts: number } | null = null;
  for (const [day, pts] of byDay) {
    if (!best || pts > best.pts) best = { day, pts };
    if (!worst || pts < worst.pts) worst = { day, pts };
  }

  // Cumulative timeline
  const ordered = [...finished].sort(
    (a, b) => new Date(a.matches!.kickoff).getTime() - new Date(b.matches!.kickoff).getTime(),
  );
  let cum = 0;
  const timeline = ordered.map((p, i) => {
    cum += p.points ?? 0;
    return { idx: i + 1, day: p.matches!.kickoff.slice(5, 10), pts: cum };
  });

  // Longest streak (consecutive matches with points > 0)
  let streak = 0;
  let bestStreak = 0;
  for (const p of ordered) {
    if ((p.points ?? 0) > 0) {
      streak += 1;
      bestStreak = Math.max(bestStreak, streak);
    } else streak = 0;
  }

  return { totalPoints, exacts, hits, accuracy, best, worst, timeline, bestStreak, played: finished.length };
}

function StatsPage() {
  const { user } = useAuth();

  const playersQ = useQuery({
    queryKey: ["stats-players"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("profiles")
        .select("id,display_name,avatar_url,total_points,exact_hits,current_streak")
        .order("total_points", { ascending: false });
      if (error) throw error;
      return data as PlayerRow[];
    },
  });

  const players = playersQ.data ?? [];
  const [selA, setSelA] = useState<string>("");
  const [selB, setSelB] = useState<string>("");

  // Default selection
  const activeA = selA || user?.id || players[0]?.id || "";
  const activeB = selB;

  const predsAQ = useQuery({
    queryKey: ["stats-preds", activeA],
    enabled: !!activeA,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("predictions")
        .select(`id,user_id,match_id,home_score,away_score,points,is_exact,
          matches:matches!predictions_match_id_fkey(id,kickoff,status,home_score,away_score,home_team_id,away_team_id)`)
        .eq("user_id", activeA);
      if (error) throw error;
      return data as unknown as PredRow[];
    },
  });

  const predsBQ = useQuery({
    queryKey: ["stats-preds", activeB],
    enabled: !!activeB,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("predictions")
        .select(`id,user_id,match_id,home_score,away_score,points,is_exact,
          matches:matches!predictions_match_id_fkey(id,kickoff,status,home_score,away_score,home_team_id,away_team_id)`)
        .eq("user_id", activeB);
      if (error) throw error;
      return data as unknown as PredRow[];
    },
  });

  const statsA = useMemo(() => computeStats(predsAQ.data ?? []), [predsAQ.data]);
  const statsB = useMemo(() => computeStats(predsBQ.data ?? []), [predsBQ.data]);

  const playerA = players.find((p) => p.id === activeA);
  const playerB = players.find((p) => p.id === activeB);

  // Head-to-head: shared predictions
  const h2h = useMemo(() => {
    if (!activeB || !predsAQ.data || !predsBQ.data) return null;
    const mapB = new Map(predsBQ.data.map((p) => [p.match_id, p]));
    const rows = (predsAQ.data ?? [])
      .map((a) => ({ a, b: mapB.get(a.match_id) }))
      .filter((r): r is { a: PredRow; b: PredRow } => !!r.b);
    const sameCall = rows.filter(
      (r) => r.a.home_score === r.b.home_score && r.a.away_score === r.b.away_score,
    ).length;
    return { rows, sameCall };
  }, [activeB, predsAQ.data, predsBQ.data]);

  // Combined timeline data when comparing
  const combinedTimeline = useMemo(() => {
    if (!activeB) return statsA.timeline.map((t) => ({ ...t, a: t.pts }));
    const map = new Map<string, { day: string; a?: number; b?: number }>();
    statsA.timeline.forEach((t) => {
      map.set(t.day, { day: t.day, a: t.pts });
    });
    statsB.timeline.forEach((t) => {
      const e = map.get(t.day) ?? { day: t.day };
      e.b = t.pts;
      map.set(t.day, e);
    });
    return Array.from(map.values());
  }, [statsA.timeline, statsB.timeline, activeB]);

  return (
    <div className="min-h-screen">
      <Navbar />
      <main className="pt-28 pb-24 mx-auto max-w-6xl px-4 sm:px-6">
        <header className="mb-8">
          <div className="inline-flex items-center gap-2 text-xs font-mono uppercase tracking-widest text-primary">
            <BarChart3 className="w-4 h-4" /> Estadísticas
          </div>
          <h1 className="font-display font-black text-4xl sm:text-6xl mt-2 text-gradient-hero">
            Stats & Head to Head
          </h1>
          <p className="text-muted-foreground mt-2 max-w-2xl">
            Compará tu rendimiento con cualquier jugador del Prode. Evolución, aciertos, rachas y predicciones en común.
          </p>
        </header>

        {/* Selectors */}
        <div className="glass-strong rounded-2xl p-4 sm:p-5 mb-6 flex flex-wrap gap-3 items-end">
          <PlayerSelect
            players={players}
            value={activeA}
            onChange={setSelA}
            label="Jugador A"
          />
          <Swords className="hidden sm:block w-6 h-6 text-muted-foreground mb-2" />
          <PlayerSelect
            players={players}
            value={activeB}
            onChange={setSelB}
            label="Jugador B (opcional)"
          />
        </div>

        {playersQ.isLoading ? (
          <div className="text-center py-20 text-muted-foreground">Cargando…</div>
        ) : !playerA ? (
          <div className="glass-strong rounded-2xl p-10 text-center text-muted-foreground">
            Todavía no hay jugadores en el Prode.
          </div>
        ) : (
          <>
            {/* KPIs A */}
            <section className="mb-8">
              <div className="flex items-center gap-3 mb-3">
                <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-primary to-secondary flex items-center justify-center overflow-hidden">
                  {playerA.avatar_url ? (
                    <img src={playerA.avatar_url} alt="" className="w-full h-full object-cover" />
                  ) : (
                    <Trophy className="w-5 h-5 text-background" />
                  )}
                </div>
                <h2 className="font-display font-bold text-xl">{playerA.display_name}</h2>
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
                <Kpi icon={Trophy} label="Puntos" value={statsA.totalPoints} tone="gold" />
                <Kpi icon={Target} label="Exactos" value={statsA.exacts} tone="primary" />
                <Kpi icon={Sparkles} label="Aciertos" value={statsA.hits} tone="secondary" />
                <Kpi icon={TrendingUp} label="Efectividad" value={`${statsA.accuracy}%`} tone="secondary" />
                <Kpi icon={Flame} label="Mejor racha" value={statsA.bestStreak} tone="gold" />
                <Kpi icon={BarChart3} label="Jugados" value={statsA.played} tone="primary" />
              </div>
              <div className="grid sm:grid-cols-2 gap-3 mt-3">
                <div className="glass rounded-2xl p-4">
                  <div className="text-xs font-mono uppercase tracking-widest text-secondary">
                    Mejor fecha
                  </div>
                  <div className="font-display font-bold text-xl mt-1">
                    {statsA.best ? `${statsA.best.day} · +${statsA.best.pts} pts` : "—"}
                  </div>
                </div>
                <div className="glass rounded-2xl p-4">
                  <div className="text-xs font-mono uppercase tracking-widest text-destructive">
                    Peor fecha
                  </div>
                  <div className="font-display font-bold text-xl mt-1">
                    {statsA.worst ? `${statsA.worst.day} · ${statsA.worst.pts} pts` : "—"}
                  </div>
                </div>
              </div>
            </section>

            {/* Timeline chart */}
            <section className="glass-strong rounded-2xl p-5 mb-8">
              <h3 className="font-display font-semibold mb-4 flex items-center gap-2">
                <TrendingUp className="w-4 h-4 text-primary" /> Evolución de puntos
              </h3>
              {combinedTimeline.length === 0 ? (
                <div className="text-sm text-muted-foreground py-10 text-center">
                  Sin partidos finalizados todavía. La evolución aparece cuando empiece el Mundial.
                </div>
              ) : (
                <div className="h-64">
                  <ResponsiveContainer>
                    <LineChart data={combinedTimeline}>
                      <CartesianGrid strokeDasharray="3 3" stroke="oklch(0.3 0.02 250)" />
                      <XAxis dataKey="day" stroke="oklch(0.7 0.02 250)" fontSize={11} />
                      <YAxis stroke="oklch(0.7 0.02 250)" fontSize={11} />
                      <Tooltip
                        contentStyle={{
                          background: "oklch(0.18 0.02 250)",
                          border: "1px solid oklch(0.3 0.02 250)",
                          borderRadius: 12,
                        }}
                      />
                      <Legend />
                      <Line
                        type="monotone"
                        dataKey="a"
                        name={playerA.display_name}
                        stroke="oklch(0.7 0.2 240)"
                        strokeWidth={3}
                        dot={false}
                      />
                      {activeB && (
                        <Line
                          type="monotone"
                          dataKey="b"
                          name={playerB?.display_name ?? "B"}
                          stroke="oklch(0.82 0.17 85)"
                          strokeWidth={3}
                          dot={false}
                        />
                      )}
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              )}
            </section>

            {/* Head to head */}
            {playerB && (
              <section className="glass-strong rounded-2xl p-5 mb-8">
                <h3 className="font-display font-semibold mb-4 flex items-center gap-2">
                  <Swords className="w-4 h-4 text-gold" /> Head to Head
                </h3>
                <div className="h-56">
                  <ResponsiveContainer>
                    <BarChart
                      data={[
                        { metric: "Puntos", a: statsA.totalPoints, b: statsB.totalPoints },
                        { metric: "Exactos", a: statsA.exacts, b: statsB.exacts },
                        { metric: "Aciertos", a: statsA.hits, b: statsB.hits },
                        { metric: "Racha", a: statsA.bestStreak, b: statsB.bestStreak },
                      ]}
                    >
                      <CartesianGrid strokeDasharray="3 3" stroke="oklch(0.3 0.02 250)" />
                      <XAxis dataKey="metric" stroke="oklch(0.7 0.02 250)" fontSize={11} />
                      <YAxis stroke="oklch(0.7 0.02 250)" fontSize={11} />
                      <Tooltip
                        contentStyle={{
                          background: "oklch(0.18 0.02 250)",
                          border: "1px solid oklch(0.3 0.02 250)",
                          borderRadius: 12,
                        }}
                      />
                      <Legend />
                      <Bar dataKey="a" name={playerA.display_name} fill="oklch(0.7 0.2 240)" radius={[8, 8, 0, 0]} />
                      <Bar dataKey="b" name={playerB.display_name} fill="oklch(0.82 0.17 85)" radius={[8, 8, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
                {h2h && (
                  <div className="mt-4 glass rounded-xl p-4 flex items-center gap-3">
                    <Users className="w-5 h-5 text-secondary" />
                    <div className="text-sm">
                      <span className="font-bold text-foreground">{h2h.sameCall}</span>{" "}
                      <span className="text-muted-foreground">
                        predicciones idénticas en {h2h.rows.length} partidos en común
                      </span>
                    </div>
                  </div>
                )}
              </section>
            )}
          </>
        )}
      </main>
    </div>
  );
}