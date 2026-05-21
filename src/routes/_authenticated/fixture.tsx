import { useMemo, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { Loader2, CalendarDays, Filter, ChevronDown } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { MatchCard, type MatchWithTeams, type Prediction } from "@/components/fixture/MatchCard";
import { dayKey } from "@/lib/prode/scoring";

import foto5 from "@/assets/foto5.jpg";
import foto6 from "@/assets/foto6.jpg";
import { ChampionPicker } from "@/components/fixture/ChampionPicker";


export const Route = createFileRoute("/_authenticated/fixture")({
  component: FixturePage,
});

const GROUPS = ["TODOS", "A", "B", "C", "D", "E", "F", "G", "H", "I", "J", "K", "L"] as const;
const PAGE_SIZE = 8;

// Fotos que aparecen entre secciones de días
const SECTION_PHOTOS = [foto5, foto6];

function FixturePage() {
  const { user } = useAuth();
  const [group, setGroup] = useState<(typeof GROUPS)[number]>("TODOS");
  const [onlyPending, setOnlyPending] = useState(false);
  const [visibleCount, setVisibleCount] = useState(PAGE_SIZE);

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

  // Reset visible count when filter changes
  const handleGroupChange = (g: typeof GROUPS[number]) => {
    setGroup(g);
    setVisibleCount(PAGE_SIZE);
  };
  const handlePendingChange = (v: boolean) => {
    setOnlyPending(v);
    setVisibleCount(PAGE_SIZE);
  };

  const visible = filtered.slice(0, visibleCount);
  const hasMore = filtered.length > visibleCount;

  const grouped = useMemo(() => {
    const map = new Map<string, MatchWithTeams[]>();
    for (const m of visible) {
      const key = dayKey(new Date(m.kickoff));
      if (!map.has(key)) map.set(key, []);
      map.get(key)!.push(m);
    }
    return Array.from(map.entries());
  }, [visible]);

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
<ChampionPicker />
      {/* Filtros */}
      <div className="sticky top-24 z-30 mb-6">
        <div className="glass-strong rounded-2xl p-3 flex flex-col sm:flex-row sm:items-center gap-3">
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <Filter className="w-3.5 h-3.5" /> Grupo
          </div>
          <div className="flex flex-wrap gap-1.5">
            {GROUPS.map((g) => (
              <button
                key={g}
                onClick={() => handleGroupChange(g)}
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
              onChange={(e) => handlePendingChange(e.target.checked)}
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
        <>
          <div className="space-y-8">
            {grouped.map(([day, list], idx) => (
              <>
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

                {/* Foto intercalada cada 2 días */}
                {idx % 2 === 1 && idx < grouped.length - 1 && (
                  <div key={`photo-${idx}`} className="flex justify-center py-2">
                    <div className="w-48 sm:w-56 rounded-2xl overflow-hidden border-2 border-primary/30 shadow-glow rotate-1 hover:rotate-0 transition-transform duration-300">
                      <img
                        src={SECTION_PHOTOS[Math.floor(idx / 2) % SECTION_PHOTOS.length]}
                        alt=""
                        className="w-full h-auto"
                      />
                    </div>
                  </div>
                )}
              </>
            ))}
          </div>

          {/* Ver más */}
          {hasMore && (
            <div className="flex flex-col items-center gap-2 mt-10 mb-4">
              <p className="text-xs text-muted-foreground font-mono">
                Mostrando {visible.length} de {filtered.length} partidos
              </p>
              <button
                onClick={() => setVisibleCount((v) => v + PAGE_SIZE)}
                className="inline-flex items-center gap-2 glass-strong rounded-2xl px-6 py-3 text-sm font-semibold hover:bg-card transition active:scale-95 touch-manipulation"
              >
                <ChevronDown className="w-4 h-4" />
                Ver más partidos
              </button>
            </div>
          )}

          {!hasMore && filtered.length > PAGE_SIZE && (
            <div className="text-center mt-8 text-xs text-muted-foreground font-mono">
              ✅ Todos los partidos cargados ({filtered.length})
            </div>
          )}
        </>
      )}
    </div>
  );
}
