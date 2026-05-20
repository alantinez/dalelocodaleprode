import { useMemo, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { Loader2, CalendarDays, Filter } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { MatchCard, type MatchWithTeams, type Prediction } from "@/components/fixture/MatchCard";
import { dayKey } from "@/lib/prode/scoring";

export const Route = createFileRoute("/_authenticated/fixture")({
  component: FixturePage,
});

const GROUPS = ["TODOS", "A", "B", "C", "D", "E", "F", "G", "H", "I", "J", "K", "L"] as const;
function FixturePage() {
  const { user } = useAuth();
  const [group, setGroup] = useState<(typeof GROUPS)[number]>("TODOS");
  const [onlyPending, setOnlyPending] = useState(false);

  const matchesQ = useQuery({
    queryKey: ["matches"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("matches")
        .select(
          `id, kickoff, stage, group, venue, status, home_score, away_score,
           home:teams!matches_home_team_id_fkey(id,name,code,flag_url),
           away:teams!matches_away_team_id_fkey(id,name,code,flag_url)`,
        )
        .order("kickoff", { ascending: true });
      if (error) throw error;
      return data as unknown as MatchWithTeams[];
    },
  });

  const predsQ = useQuery({
    queryKey: ["predictions", user?.id],
    enabled: !!user,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("predictions")
        .select("match_id, home_score, away_score, points, is_exact")
        .eq("user_id", user!.id);
      if (error) throw error;
      return data as Prediction[];
    },
  });

  const predByMatch = useMemo(() => {
    const m = new Map<string, Prediction>();
    (predsQ.data ?? []).forEach((p) => m.set(p.match_id, p));
    return m;
  }, [predsQ.data]);

  const filtered = useMemo(() => {
    const list = matchesQ.data ?? [];
    return list.filter((m) => {
      if (group !== "TODOS" && m.group !== group) return false;
      if (onlyPending) {
        const has = predByMatch.has(m.id);
        const locked = new Date(m.kickoff).getTime() <= Date.now();
        if (has || locked) return false;
      }
      return true;
    });
  }, [matchesQ.data, group, onlyPending, predByMatch]);

  const grouped = useMemo(() => {
    const map = new Map<string, MatchWithTeams[]>();
    for (const m of filtered) {
      const key = dayKey(new Date(m.kickoff));
      if (!map.has(key)) map.set(key, []);
      map.get(key)!.push(m);
    }
    return Array.from(map.entries());
  }, [filtered]);

  const totalPreds = predsQ.data?.length ?? 0;
  const totalMatches = matchesQ.data?.length ?? 0;

  return (
    <div className="mx-auto max-w-5xl px-4 sm:px-6">
      <header className="mb-6 sm:mb-8">
        <div className="flex items-center gap-2 text-xs font-mono uppercase tracking-widest text-primary">
          <CalendarDays className="w-4 h-4" />
          Fase de grupos
        </div>
        <h1 className="font-display font-bold text-3xl sm:text-5xl mt-2 text-gradient-hero">
          Fixture & Pronósticos
        </h1>
        <p className="text-muted-foreground mt-2 text-sm sm:text-base">
          Cargá tu pronóstico antes de que arranque cada partido. Después, queda bloqueado.
        </p>
        <div className="mt-4 inline-flex items-center gap-2 glass rounded-xl px-3 py-1.5 text-xs font-mono">
          <span className="text-secondary font-bold">{totalPreds}</span>
          <span className="text-muted-foreground">/ {totalMatches} pronosticados</span>
        </div>
      </header>

      <div className="sticky top-24 z-30 mb-6">
        <div className="glass-strong rounded-2xl p-3 flex flex-col sm:flex-row sm:items-center gap-3">
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <Filter className="w-3.5 h-3.5" /> Grupo
          </div>
          <div className="flex flex-wrap gap-1.5">
            {GROUPS.map((g) => (
              <button
                key={g}
                onClick={() => setGroup(g)}
                className={`px-3 py-1 rounded-lg text-xs font-mono font-bold transition ${
                  group === g
                    ? "bg-gradient-to-r from-primary to-secondary text-background shadow-glow"
                    : "glass hover:bg-card"
                }`}
              >
                {g}
              </button>
            ))}
          </div>
          <label className="ml-auto inline-flex items-center gap-2 text-xs cursor-pointer select-none">
            <input
              type="checkbox"
              checked={onlyPending}
              onChange={(e) => setOnlyPending(e.target.checked)}
              className="accent-primary"
            />
            Solo pendientes
          </label>
        </div>
      </div>

      {matchesQ.isLoading || predsQ.isLoading ? (
        <div className="flex items-center justify-center py-20">
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
        </div>
      ) : grouped.length === 0 ? (
        <div className="text-center py-20 text-muted-foreground">
          No hay partidos con ese filtro.
        </div>
      ) : (
        <div className="space-y-8">
          {grouped.map(([day, list]) => (
            <section key={day}>
              <h2 className="font-display font-semibold text-sm uppercase tracking-widest text-muted-foreground mb-3 sticky top-44 sm:top-40 z-10">
                <span className="glass px-3 py-1 rounded-lg">{day}</span>
              </h2>
              <div className="grid gap-3 sm:grid-cols-2">
                {list.map((m) => (
                  <MatchCard key={m.id} match={m} prediction={predByMatch.get(m.id) ?? null} />
                ))}
              </div>
            </section>
          ))}
        </div>
      )}
    </div>
  );
}
