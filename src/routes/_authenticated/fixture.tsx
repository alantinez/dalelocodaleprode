import { useMemo, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { Loader2, CalendarDays, Filter, ChevronDown, Swords } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { MatchCard, type MatchWithTeams, type Prediction } from "@/components/fixture/MatchCard";
import { ChampionPicker } from "@/components/fixture/ChampionPicker";
import { dayKey } from "@/lib/prode/scoring";
import foto5 from "@/assets/foto5.jpg";
import foto6 from "@/assets/foto6.jpg";
import { Lightbox } from "@/components/ui/Lightbox";

export const Route = createFileRoute("/_authenticated/fixture")({
  component: FixturePage,
});

const GROUPS = ["TODOS", "A", "B", "C", "D", "E", "F", "G", "H", "I", "J", "K", "L"] as const;
const PAGE_SIZE = 8;

const KNOCKOUT_STAGES = [
  { key: "r32",   label: "Octavos de Final" },
  { key: "r16",   label: "Dieciseisavos de Final" },
  { key: "qf",    label: "Cuartos de Final" },
  { key: "sf",    label: "Semifinales" },
  { key: "third", label: "3° y 4° Puesto" },
  { key: "final", label: "⚽ Gran Final" },
];

function FixturePage() {
  const { user } = useAuth();
  const [phase, setPhase] = useState<"grupos" | "knockout">("grupos");

  // Grupos state
  const [group, setGroup] = useState<(typeof GROUPS)[number]>("TODOS");
  const [onlyPending, setOnlyPending] = useState(false);
  const [visibleCount, setVisibleCount] = useState(PAGE_SIZE);

  const matchesQ = useQuery({
    queryKey: ["matches"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("matches")
        .select(`id, kickoff, stage, group, venue, status, home_score, away_score,
           home:teams!matches_home_team_id_fkey(id,name,code,flag_url),
           away:teams!matches_away_team_id_fkey(id,name,code,flag_url)`)
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

  // ── GRUPOS ──
  const groupFiltered = useMemo(() => {
    return (matchesQ.data ?? []).filter((m) => {
      if (m.stage !== "group") return false;
      if (group !== "TODOS" && m.group !== group) return false;
      if (onlyPending) {
        const has = predByMatch.has(m.id);
        const locked = new Date(m.kickoff).getTime() <= Date.now();
        if (has || locked) return false;
      }
      return true;
    });
  }, [matchesQ.data, group, onlyPending, predByMatch]);

  const handleGroupChange = (g: typeof GROUPS[number]) => { setGroup(g); setVisibleCount(PAGE_SIZE); };
  const handlePendingChange = (v: boolean) => { setOnlyPending(v); setVisibleCount(PAGE_SIZE); };

  const visible = groupFiltered.slice(0, visibleCount);
  const hasMore = groupFiltered.length > visibleCount;

  const grouped = useMemo(() => {
    const map = new Map<string, MatchWithTeams[]>();
    for (const m of visible) {
      const key = dayKey(new Date(m.kickoff));
      if (!map.has(key)) map.set(key, []);
      map.get(key)!.push(m);
    }
    return Array.from(map.entries());
  }, [visible]);

  // ── KNOCKOUT ──
  const knockoutByStage = useMemo(() => {
    const map = new Map<string, MatchWithTeams[]>();
    for (const m of matchesQ.data ?? []) {
      if (m.stage === "group") continue;
      if (!map.has(m.stage)) map.set(m.stage, []);
      map.get(m.stage)!.push(m);
    }
    return map;
  }, [matchesQ.data]);

  const hasKnockout = knockoutByStage.size > 0;

  const totalPreds = predsQ.data?.length ?? 0;
  const totalMatches = (matchesQ.data ?? []).filter((m) => m.stage === "group").length;

  return (
    <div className="mx-auto max-w-5xl px-4 sm:px-6">

      {/* Fotos decorativas */}
      <div className="fixed top-1/3 left-4 w-32 z-10 pointer-events-none select-none hidden 2xl:block">
        <div className="rounded-2xl overflow-hidden border-2 border-primary/30 shadow-glow -rotate-3">
          <Lightbox src={foto5} imgClassName="w-full h-auto" />
        </div>
      </div>
      <div className="fixed top-2/3 right-4 w-32 z-10 pointer-events-none select-none hidden 2xl:block">
        <div className="rounded-2xl overflow-hidden border-2 border-secondary/30 shadow-glow rotate-3">
          <Lightbox src={foto6} imgClassName="w-full h-auto" />
        </div>
      </div>

      <header className="mb-6 sm:mb-8">
        <div className="flex items-center gap-2 text-xs font-mono uppercase tracking-widest text-primary">
          <CalendarDays className="w-4 h-4" />
          Fixture completo
        </div>
        <h1 className="font-display font-bold text-3xl sm:text-5xl mt-2 text-gradient-hero">
          Fixture & Pronósticos
        </h1>
        <p className="text-muted-foreground mt-2 text-sm sm:text-base">
          Cargá tu pronóstico antes de que arranque cada partido. Después, queda bloqueado.
        </p>
        <div className="mt-4 inline-flex items-center gap-2 glass rounded-xl px-3 py-1.5 text-xs font-mono">
          <span className="text-secondary font-bold">{totalPreds}</span>
          <span className="text-muted-foreground">/ {totalMatches} pronosticados en grupos</span>
        </div>
      </header>

      <ChampionPicker />

      {/* Tabs de fase */}
      <div className="flex gap-2 mb-6">
        <button onClick={() => setPhase("grupos")}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold transition ${
            phase === "grupos" ? "bg-gradient-to-r from-primary to-secondary text-background shadow-glow" : "glass text-muted-foreground hover:text-foreground"
          }`}>
          <Filter className="w-4 h-4" /> Fase de Grupos
        </button>
        <button onClick={() => setPhase("knockout")}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold transition ${
            phase === "knockout" ? "bg-gradient-to-r from-primary to-secondary text-background shadow-glow" : "glass text-muted-foreground hover:text-foreground"
          }`}>
          <Swords className="w-4 h-4" /> Fase Knockout
          {hasKnockout && <span className="w-2 h-2 rounded-full bg-secondary animate-pulse" />}
        </button>
      </div>

      {matchesQ.isLoading || predsQ.isLoading ? (
        <div className="flex items-center justify-center py-20">
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
        </div>
      ) : phase === "grupos" ? (
        /* ───── VISTA GRUPOS ───── */
        <>
          <div className="sticky top-24 z-30 mb-6">
            <div className="glass-strong rounded-2xl p-3 flex flex-col sm:flex-row sm:items-center gap-3">
              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                <Filter className="w-3.5 h-3.5" /> Grupo
              </div>
              <div className="flex flex-wrap gap-1.5">
                {GROUPS.map((g) => (
                  <button key={g} onClick={() => handleGroupChange(g)}
                    className={`px-3 py-1 rounded-lg text-xs font-mono font-bold transition ${
                      group === g ? "bg-gradient-to-r from-primary to-secondary text-background shadow-glow" : "glass hover:bg-card"
                    }`}>
                    {g}
                  </button>
                ))}
              </div>
              <label className="ml-auto inline-flex items-center gap-2 text-xs cursor-pointer select-none">
                <input type="checkbox" checked={onlyPending} onChange={(e) => handlePendingChange(e.target.checked)} className="accent-primary" />
                Solo pendientes
              </label>
            </div>
          </div>

          {grouped.length === 0 ? (
            <div className="text-center py-20 text-muted-foreground">No hay partidos con ese filtro.</div>
          ) : (
            <>
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

              {hasMore && (
                <div className="flex flex-col items-center gap-2 mt-10 mb-4">
                  <p className="text-xs text-muted-foreground font-mono">
                    Mostrando {visible.length} de {groupFiltered.length} partidos
                  </p>
                  <button onClick={() => setVisibleCount((v) => v + PAGE_SIZE)}
                    className="inline-flex items-center gap-2 glass-strong rounded-2xl px-6 py-3 text-sm font-semibold hover:bg-card transition active:scale-95 touch-manipulation">
                    <ChevronDown className="w-4 h-4" />
                    Ver más partidos
                  </button>
                </div>
              )}
              {!hasMore && groupFiltered.length > PAGE_SIZE && (
                <div className="text-center mt-8 text-xs text-muted-foreground font-mono">
                  ✅ Todos los partidos de grupos cargados ({groupFiltered.length})
                </div>
              )}
            </>
          )}
        </>
      ) : (
        /* ───── VISTA KNOCKOUT ───── */
        !hasKnockout ? (
          <div className="glass-strong rounded-2xl p-14 text-center">
            <Swords className="w-12 h-12 text-muted-foreground mx-auto mb-4 opacity-40" />
            <h3 className="font-display font-bold text-xl mb-2">Los cruces aún no están definidos</h3>
            <p className="text-sm text-muted-foreground max-w-sm mx-auto">
              Cuando finalice la fase de grupos, el administrador cargará los cruces del knockout y aparecerán acá.
            </p>
          </div>
        ) : (
          <div className="space-y-10">
            {KNOCKOUT_STAGES.filter((s) => knockoutByStage.has(s.key)).map((s) => (
              <section key={s.key}>
                <div className="flex items-center gap-3 mb-4">
                  <div className="h-px flex-1 bg-border/60" />
                  <h2 className="font-display font-bold text-lg text-gradient-hero whitespace-nowrap">{s.label}</h2>
                  <div className="h-px flex-1 bg-border/60" />
                </div>
                <div className="grid gap-3 sm:grid-cols-2">
                  {knockoutByStage.get(s.key)!.map((m) => (
                    <MatchCard key={m.id} match={m} prediction={predByMatch.get(m.id) ?? null} />
                  ))}
                </div>
              </section>
            ))}
          </div>
        )
      )}
    </div>
  );
}
