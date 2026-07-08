import { useMemo, useState, useEffect } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { Loader2, CalendarDays, Filter, ChevronDown, Swords, Clock } from "lucide-react";
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
  { key: "r32",   label: "16avos de Final",   short: "16avos" },
  { key: "r16",   label: "Octavos de Final",   short: "Octavos" },
  { key: "qf",    label: "Cuartos de Final",   short: "Cuartos" },
  { key: "sf",    label: "Semifinales",        short: "Semis" },
  { key: "third", label: "3° y 4° Puesto",     short: "3er puesto" },
  { key: "final", label: "⚽ Gran Final",       short: "Final" },
];

function toArgDate(iso: string) {
  return new Date(iso).toLocaleDateString("es-AR", { timeZone: "America/Argentina/Buenos_Aires", day: "2-digit", month: "2-digit", year: "numeric" });
}

function pad(n: number) { return String(n).padStart(2, "0"); }

function LiveCountdown({ kickoff }: { kickoff: string }) {
  const [ms, setMs] = useState(() => Math.max(0, new Date(kickoff).getTime() - Date.now()));
  useEffect(() => {
    if (ms === 0) return;
    const id = setInterval(() => {
      const r = Math.max(0, new Date(kickoff).getTime() - Date.now());
      setMs(r);
      if (r === 0) clearInterval(id);
    }, 1000);
    return () => clearInterval(id);
  }, [kickoff, ms]);
  if (ms === 0) return <span className="text-secondary font-mono text-xs font-bold">En juego</span>;
  const h = Math.floor(ms / 3_600_000);
  const m = Math.floor((ms % 3_600_000) / 60_000);
  const s = Math.floor((ms % 60_000) / 1_000);
  const urgent = ms < 30 * 60_000;
  return (
    <span className={`font-mono text-xs font-bold flex items-center gap-1 ${urgent ? "text-destructive" : "text-primary"}`}>
      {urgent && <span className="relative flex h-2 w-2"><span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-current opacity-75"/><span className="relative inline-flex rounded-full h-2 w-2 bg-current"/></span>}
      {!urgent && <Clock className="w-3 h-3" />}
      {h > 0 ? `${h}h ${pad(m)}m` : `${pad(m)}m ${pad(s)}s`}
    </span>
  );
}

function TodaySection({ matches, predByMatch }: { matches: MatchWithTeams[]; predByMatch: Map<string, Prediction> }) {
  const todayStr = toArgDate(new Date().toISOString());
  const todayMatches = matches.filter((m) => toArgDate(m.kickoff) === todayStr);
  const nextMatch = todayMatches.length === 0
    ? matches.filter((m) => new Date(m.kickoff).getTime() > Date.now() && m.status === "scheduled")
        .sort((a, b) => new Date(a.kickoff).getTime() - new Date(b.kickoff).getTime())[0]
    : null;

  if (todayMatches.length === 0 && !nextMatch) return null;
  const isToday = todayMatches.length > 0;
  const displayMatches = isToday ? todayMatches : [nextMatch!];

  return (
    <section className="mb-8">
      <div className="flex items-center gap-2 mb-4">
        <div className={`flex items-center gap-2 px-3 py-1.5 rounded-xl text-xs font-mono font-bold ${
          isToday ? "bg-secondary/15 text-secondary" : "bg-primary/10 text-primary"
        }`}>
          {isToday ? (
            <><span className="relative flex h-2 w-2"><span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-secondary opacity-75"/><span className="relative inline-flex rounded-full h-2 w-2 bg-secondary"/></span> HOY</>
          ) : (
            <><Clock className="w-3 h-3" /> PRÓXIMO</>
          )}
        </div>
        <h2 className="font-display font-bold text-lg">
          {isToday ? `${todayMatches.length} partido${todayMatches.length > 1 ? "s" : ""} hoy` : "Próximo partido"}
        </h2>
        {isToday && <div className="flex-1 h-px bg-gradient-to-r from-secondary/40 to-transparent" />}
      </div>
      <div className={`grid gap-3 ${displayMatches.length > 1 ? "sm:grid-cols-2" : "sm:grid-cols-1 max-w-md"}`}>
        {displayMatches.map((m) => {
          const locked = new Date(m.kickoff).getTime() <= Date.now();
          const finished = m.status === "finished";
          return (
            <div key={m.id} className="relative">
              <div className={`absolute -inset-0.5 rounded-[1.25rem] blur-sm opacity-60 ${
                finished ? "bg-gradient-to-br from-primary/40 to-secondary/40" :
                locked ? "bg-gradient-to-br from-gold/30 to-primary/30" :
                "bg-gradient-to-br from-secondary/50 to-primary/50"
              }`} />
              <div className="relative"><MatchCard match={m} prediction={predByMatch.get(m.id) ?? null} /></div>
              {!locked && !finished && (
                <div className="absolute -top-2 -right-2 z-10 glass-strong rounded-lg px-2 py-1 shadow-glow border border-border/60">
                  <LiveCountdown kickoff={m.kickoff} />
                </div>
              )}
              {!finished && locked && (
                <div className="absolute -top-2 -right-2 z-10 bg-gold/20 border border-gold/40 rounded-lg px-2 py-1">
                  <span className="text-[10px] font-mono font-bold text-gold">🔴 EN VIVO</span>
                </div>
              )}
            </div>
          );
        })}
      </div>
      <div className="mt-6 h-px bg-gradient-to-r from-transparent via-border/60 to-transparent" />
    </section>
  );
}

function FixturePage() {
  const { user } = useAuth();
  const [phase, setPhase] = useState<"grupos" | "knockout">("knockout"); // ← default ahora es knockout
  const [knockoutStage, setKnockoutStage] = useState<string | null>(null); // se autoselecciona
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
  const activeStages = KNOCKOUT_STAGES.filter((s) => knockoutByStage.has(s.key));

  // Auto-seleccionar la fase actual: la primera (en orden de torneo) que tenga partidos pendientes,
  // o si todas terminaron, la última fase con partidos.
  useEffect(() => {
    if (knockoutStage !== null) return; // ya hay selección manual o auto hecha
    if (activeStages.length === 0) return;

    const stageWithScheduled = activeStages.find((s) => {
      const matches = knockoutByStage.get(s.key) ?? [];
      return matches.some((m) => m.status === "scheduled");
    });

    setKnockoutStage(stageWithScheduled?.key ?? activeStages[activeStages.length - 1].key);
  }, [activeStages, knockoutByStage, knockoutStage]);

  const totalPreds = predsQ.data?.length ?? 0;
  const totalMatches = (matchesQ.data ?? []).filter((m) => m.stage === "group").length;
  const allMatches = matchesQ.data ?? [];
  const groupStageOver = totalMatches > 0 && (matchesQ.data ?? []).filter((m) => m.stage === "group" && m.status === "finished").length === totalMatches;

  return (
    <div className="mx-auto max-w-5xl px-4 sm:px-6">

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
          <CalendarDays className="w-4 h-4" /> Fixture completo
        </div>
        <h1 className="font-display font-bold text-3xl sm:text-5xl mt-2 text-gradient-hero">
          Fixture & Pronósticos
        </h1>
        <p className="text-muted-foreground mt-2 text-sm sm:text-base">
          Cargá tu pronóstico antes de que arranque cada partido. Después, queda bloqueado.
        </p>
        {phase === "knockout" ? (
          hasKnockout && (
            <div className="mt-4 inline-flex items-center gap-2 glass rounded-xl px-3 py-1.5 text-xs font-mono">
              <Swords className="w-3.5 h-3.5 text-primary" />
              <span className="text-muted-foreground">Fase eliminatoria en curso</span>
            </div>
          )
        ) : (
          <div className="mt-4 inline-flex items-center gap-2 glass rounded-xl px-3 py-1.5 text-xs font-mono">
            <span className="text-secondary font-bold">{totalPreds}</span>
            <span className="text-muted-foreground">/ {totalMatches} pronosticados en grupos</span>
          </div>
        )}
      </header>

      <ChampionPicker />

      {/* ─── SECCIÓN PARTIDOS DE HOY ─── */}
      {!matchesQ.isLoading && !predsQ.isLoading && (
        <TodaySection matches={allMatches} predByMatch={predByMatch} />
      )}

      {/* Tabs de fase */}
      <div className="flex gap-2 mb-6">
        <button onClick={() => setPhase("knockout")}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold transition ${
            phase === "knockout" ? "bg-gradient-to-r from-primary to-secondary text-background shadow-glow" : "glass text-muted-foreground hover:text-foreground"
          }`}>
          <Swords className="w-4 h-4" /> Fase Knockout
          {hasKnockout && <span className="w-2 h-2 rounded-full bg-secondary animate-pulse" />}
        </button>
        <button onClick={() => setPhase("grupos")}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold transition ${
            phase === "grupos" ? "bg-gradient-to-r from-primary to-secondary text-background shadow-glow" : "glass text-muted-foreground hover:text-foreground"
          }`}>
          <Filter className="w-4 h-4" /> Fase de Grupos
          {groupStageOver && <span className="text-[9px] font-mono text-muted-foreground/60 ml-0.5">(finalizada)</span>}
        </button>
      </div>

      {matchesQ.isLoading || predsQ.isLoading ? (
        <div className="flex items-center justify-center py-20">
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
        </div>
      ) : phase === "grupos" ? (
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
                  <p className="text-xs text-muted-foreground font-mono">Mostrando {visible.length} de {groupFiltered.length} partidos</p>
                  <button onClick={() => setVisibleCount((v) => v + PAGE_SIZE)}
                    className="inline-flex items-center gap-2 glass-strong rounded-2xl px-6 py-3 text-sm font-semibold hover:bg-card transition active:scale-95 touch-manipulation">
                    <ChevronDown className="w-4 h-4" /> Ver más partidos
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
        !hasKnockout ? (
          <div className="glass-strong rounded-2xl p-14 text-center">
            <Swords className="w-12 h-12 text-muted-foreground mx-auto mb-4 opacity-40" />
            <h3 className="font-display font-bold text-xl mb-2">Los cruces aún no están definidos</h3>
            <p className="text-sm text-muted-foreground max-w-sm mx-auto">
              Cuando finalice la fase de grupos, el administrador cargará los cruces del knockout y aparecerán acá.
            </p>
          </div>
        ) : (
          <>
            {/* Sub-tabs de etapa knockout — incluye upcoming sin partidos */}
            <div className="sticky top-24 z-30 mb-6">
              <div className="glass-strong rounded-2xl p-3 flex flex-wrap items-center gap-1.5">
                {KNOCKOUT_STAGES.map((s) => {
                  const hasMatches = knockoutByStage.has(s.key);
                  const stageMatches = knockoutByStage.get(s.key) ?? [];
                  const pendingCount = stageMatches.filter((m) => m.status !== "finished").length;
                  const isUpcoming = !hasMatches;
                  return (
                    <button key={s.key} onClick={() => setKnockoutStage(s.key)}
                      className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-mono font-bold transition ${
                        knockoutStage === s.key
                          ? "bg-gradient-to-r from-primary to-secondary text-background shadow-glow"
                          : isUpcoming
                          ? "glass text-muted-foreground/40 hover:text-muted-foreground"
                          : "glass hover:bg-card text-muted-foreground"
                      }`}>
                      {s.short}
                      {!isUpcoming && pendingCount > 0 && (
                        <span className={`text-[9px] px-1 rounded-full ${knockoutStage === s.key ? "bg-background/20" : "bg-secondary/20 text-secondary"}`}>
                          {pendingCount}
                        </span>
                      )}
                      {isUpcoming && <span className="text-[8px] opacity-50">🔒</span>}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Partidos de la etapa activa */}
            {knockoutStage && knockoutByStage.has(knockoutStage) ? (
              <section>
                <div className="flex items-center gap-3 mb-4">
                  <div className="h-px flex-1 bg-border/60" />
                  <h2 className="font-display font-bold text-lg text-gradient-hero whitespace-nowrap">
                    {KNOCKOUT_STAGES.find((s) => s.key === knockoutStage)?.label}
                  </h2>
                  <div className="h-px flex-1 bg-border/60" />
                </div>
                <div className="grid gap-3 sm:grid-cols-2">
                  {knockoutByStage.get(knockoutStage)!.map((m) => (
                    <MatchCard key={m.id} match={m} prediction={predByMatch.get(m.id) ?? null} />
                  ))}
                </div>
              </section>
            ) : knockoutStage ? (
              <div className="glass-strong rounded-2xl p-10 text-center border border-border/20">
                <div className="text-4xl mb-3">🔒</div>
                <h3 className="font-display font-bold text-lg mb-1">
                  {KNOCKOUT_STAGES.find((s) => s.key === knockoutStage)?.label}
                </h3>
                <p className="text-sm text-muted-foreground">
                  Los cruces se definirán cuando avance el torneo.
                </p>
              </div>
            ) : (
              <div className="flex justify-center py-10"><Loader2 className="w-5 h-5 animate-spin text-primary" /></div>
            )}
          </>
        )
      )}
    </div>
  );
}
