import { useMemo, useState, useEffect, useRef } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { Loader2, CalendarDays, Filter, ChevronDown, Swords, Clock, Bell, BellOff } from "lucide-react";
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
  { key: "r32",   label: "16avos de Final",  short: "16avos"    },
  { key: "r16",   label: "Octavos de Final",  short: "Octavos"   },
  { key: "qf",    label: "Cuartos de Final",  short: "Cuartos"   },
  { key: "sf",    label: "Semifinales",       short: "Semis"     },
  { key: "third", label: "3° y 4° Puesto",   short: "3er puesto"},
  { key: "final", label: "⚽ Gran Final",     short: "Final"     },
];

function toArgDate(iso: string) {
  return new Date(iso).toLocaleDateString("es-AR", {
    timeZone: "America/Argentina/Buenos_Aires",
    day: "2-digit", month: "2-digit", year: "numeric",
  });
}
function pad(n: number) { return String(n).padStart(2, "0"); }

/* ─── COUNTDOWN ─── */
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

/* ─── TODAY SECTION ─── */
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
        <div className={`flex items-center gap-2 px-3 py-1.5 rounded-xl text-xs font-mono font-bold ${isToday ? "bg-secondary/15 text-secondary" : "bg-primary/10 text-primary"}`}>
          {isToday
            ? <><span className="relative flex h-2 w-2"><span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-secondary opacity-75"/><span className="relative inline-flex rounded-full h-2 w-2 bg-secondary"/></span> HOY</>
            : <><Clock className="w-3 h-3" /> PRÓXIMO</>}
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
              <div className={`absolute -inset-0.5 rounded-[1.25rem] blur-sm opacity-60 ${finished ? "bg-gradient-to-br from-primary/40 to-secondary/40" : locked ? "bg-gradient-to-br from-gold/30 to-primary/30" : "bg-gradient-to-br from-secondary/50 to-primary/50"}`} />
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

/* ─── NOTIFICATION BUTTON ─── */
function NotificationButton({ matches, predByMatch }: { matches: MatchWithTeams[]; predByMatch: Map<string, Prediction> }) {
  const [enabled, setEnabled] = useState(false);
  const timersRef = useRef<ReturnType<typeof setTimeout>[]>([]);

  useEffect(() => {
    return () => { timersRef.current.forEach(clearTimeout); };
  }, []);

  useEffect(() => {
    timersRef.current.forEach(clearTimeout);
    timersRef.current = [];
    if (!enabled) return;
    const now = Date.now();
    matches.forEach((m) => {
      if (m.stage === "group" || m.status !== "scheduled") return;
      const kickoff = new Date(m.kickoff).getTime();
      const delay = kickoff - 60 * 60 * 1000 - now;
      if (delay < 0 || delay > 25 * 60 * 60 * 1000) return;
      const pred = predByMatch.get(m.id);
      const body = pred ? `Tu pronóstico: ${pred.home_score}-${pred.away_score}` : "⚠️ ¡Todavía no predijiste!";
      const t = setTimeout(() => {
        if (Notification.permission === "granted") {
          new Notification(`⚽ En 1 hora: ${m.home?.name} vs ${m.away?.name}`, { body, icon: m.home?.flag_url ?? undefined });
        }
      }, delay);
      timersRef.current.push(t);
    });
  }, [enabled, matches, predByMatch]);

  const handleClick = async () => {
    if (!("Notification" in window)) { alert("Tu navegador no soporta notificaciones."); return; }
    if (!enabled) {
      const perm = await Notification.requestPermission();
      if (perm === "granted") setEnabled(true);
    } else {
      setEnabled(false);
    }
  };

  return (
    <button onClick={handleClick}
      title={enabled ? "Desactivar recordatorios" : "Activar recordatorios 1h antes"}
      className={`ml-auto flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold transition ${enabled ? "bg-primary/20 text-primary border border-primary/30" : "glass text-muted-foreground hover:text-foreground"}`}>
      {enabled ? <Bell className="w-3.5 h-3.5" /> : <BellOff className="w-3.5 h-3.5" />}
      <span className="hidden sm:inline">{enabled ? "Recordatorios ON" : "Recordatorios"}</span>
    </button>
  );
}

/* ─── MAIN PAGE ─── */
function FixturePage() {
  const { user } = useAuth();
  const [phase, setPhase] = useState<"grupos" | "knockout">("knockout");
  const [knockoutStage, setKnockoutStage] = useState<string | null>(null);
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

  const allMatches = matchesQ.data ?? [];

  const groupFiltered = useMemo(() => {
    return allMatches.filter((m) => {
      if (m.stage !== "group") return false;
      if (group !== "TODOS" && m.group !== group) return false;
      if (onlyPending) {
        const has = predByMatch.has(m.id);
        const locked = new Date(m.kickoff).getTime() <= Date.now();
        if (has || locked) return false;
      }
      return true;
    });
  }, [allMatches, group, onlyPending, predByMatch]);

  const knockoutByStage = useMemo(() => {
    const map = new Map<string, MatchWithTeams[]>();
    for (const m of allMatches) {
      if (m.stage === "group") continue;
      if (!map.has(m.stage)) map.set(m.stage, []);
      map.get(m.stage)!.push(m);
    }
    return map;
  }, [allMatches]);

  const hasKnockout = knockoutByStage.size > 0;
  const activeStages = KNOCKOUT_STAGES.filter((s) => knockoutByStage.has(s.key));

  // Auto-seleccionar fase con partidos scheduled
  useEffect(() => {
    if (knockoutStage !== null) return;
    if (activeStages.length === 0) return;
    const withScheduled = activeStages.find((s) =>
      (knockoutByStage.get(s.key) ?? []).some((m) => m.status === "scheduled")
    );
    setKnockoutStage(withScheduled?.key ?? activeStages[activeStages.length - 1].key);
  }, [activeStages, knockoutByStage, knockoutStage]);

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

  const totalMatches = allMatches.filter((m) => m.stage === "group").length;
  const groupStageOver = totalMatches > 0 && allMatches.filter((m) => m.stage === "group" && m.status === "finished").length === totalMatches;

  // Counter para la fase knockout activa
  const knockoutPendingCount = useMemo(() => {
    if (!knockoutStage) return 0;
    const stageMatches = knockoutByStage.get(knockoutStage) ?? [];
    const now = Date.now();
    return stageMatches.filter(
      (m) => m.status === "scheduled" && new Date(m.kickoff).getTime() > now && !predByMatch.has(m.id)
    ).length;
  }, [knockoutStage, knockoutByStage, predByMatch]);

  const knockoutAllPredicted = useMemo(() => {
    if (!knockoutStage) return false;
    const stageMatches = knockoutByStage.get(knockoutStage) ?? [];
    const now = Date.now();
    const predictable = stageMatches.filter(
      (m) => m.status === "scheduled" && new Date(m.kickoff).getTime() > now
    );
    return predictable.length > 0 && predictable.every((m) => predByMatch.has(m.id));
  }, [knockoutStage, knockoutByStage, predByMatch]);

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
        {phase === "knockout" && hasKnockout ? (
          <div className="mt-4 inline-flex items-center gap-2 glass rounded-xl px-3 py-1.5 text-xs font-mono">
            <Swords className="w-3.5 h-3.5 text-primary" />
            <span className="text-muted-foreground">Fase eliminatoria en curso</span>
          </div>
        ) : (
          <div className="mt-4 inline-flex items-center gap-2 glass rounded-xl px-3 py-1.5 text-xs font-mono">
            <span className="text-muted-foreground">Grupos finalizados</span>
          </div>
        )}
      </header>

      <ChampionPicker />

      {!matchesQ.isLoading && !predsQ.isLoading && (
        <TodaySection matches={allMatches} predByMatch={predByMatch} />
      )}

      {/* Tabs de fase */}
      <div className="flex gap-2 mb-6 flex-wrap">
        <button onClick={() => setPhase("knockout")}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold transition ${phase === "knockout" ? "bg-gradient-to-r from-primary to-secondary text-background shadow-glow" : "glass text-muted-foreground hover:text-foreground"}`}>
          <Swords className="w-4 h-4" /> Fase Knockout
          {hasKnockout && <span className="w-2 h-2 rounded-full bg-secondary animate-pulse" />}
        </button>
        <button onClick={() => setPhase("grupos")}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold transition ${phase === "grupos" ? "bg-gradient-to-r from-primary to-secondary text-background shadow-glow" : "glass text-muted-foreground hover:text-foreground"}`}>
          <Filter className="w-4 h-4" /> Fase de Grupos
          {groupStageOver && <span className="text-[9px] font-mono text-muted-foreground/60 ml-0.5">(finalizada)</span>}
        </button>
        <NotificationButton matches={allMatches} predByMatch={predByMatch} />
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
                  <button key={g} onClick={() => { setGroup(g); setVisibleCount(PAGE_SIZE); }}
                    className={`px-3 py-1 rounded-lg text-xs font-mono font-bold transition ${group === g ? "bg-gradient-to-r from-primary to-secondary text-background shadow-glow" : "glass hover:bg-card"}`}>
                    {g}
                  </button>
                ))}
              </div>
              <label className="ml-auto inline-flex items-center gap-2 text-xs cursor-pointer select-none">
                <input type="checkbox" checked={onlyPending} onChange={(e) => { setOnlyPending(e.target.checked); setVisibleCount(PAGE_SIZE); }} className="accent-primary" />
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
                      {list.map((m) => <MatchCard key={m.id} match={m} prediction={predByMatch.get(m.id) ?? null} />)}
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
            </>
          )}
        </>
      ) : !hasKnockout ? (
        <div className="glass-strong rounded-2xl p-14 text-center">
          <Swords className="w-12 h-12 text-muted-foreground mx-auto mb-4 opacity-40" />
          <h3 className="font-display font-bold text-xl mb-2">Los cruces aún no están definidos</h3>
          <p className="text-sm text-muted-foreground max-w-sm mx-auto">
            Cuando finalice la fase de grupos, el administrador cargará los cruces del knockout y aparecerán acá.
          </p>
        </div>
      ) : (
        <>
          {/* Sub-tabs knockout */}
          <div className="sticky top-24 z-30 mb-6">
            <div className="glass-strong rounded-2xl p-3 flex flex-wrap items-center gap-1.5">
              {KNOCKOUT_STAGES.map((s) => {
                const hasMatches = knockoutByStage.has(s.key);
                const stageMatches = knockoutByStage.get(s.key) ?? [];
                const pending = stageMatches.filter((m) => m.status !== "finished").length;
                return (
                  <button key={s.key} onClick={() => setKnockoutStage(s.key)}
                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-mono font-bold transition ${
                      knockoutStage === s.key
                        ? "bg-gradient-to-r from-primary to-secondary text-background shadow-glow"
                        : hasMatches ? "glass hover:bg-card text-muted-foreground" : "glass text-muted-foreground/40"
                    }`}>
                    {s.short}
                    {hasMatches && pending > 0 && (
                      <span className={`text-[9px] px-1 rounded-full ${knockoutStage === s.key ? "bg-background/20" : "bg-secondary/20 text-secondary"}`}>{pending}</span>
                    )}
                    {!hasMatches && <span className="text-[8px] opacity-50">🔒</span>}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Contenido de la etapa activa */}
          {knockoutStage && knockoutByStage.has(knockoutStage) ? (
            <section>
              <div className="flex items-center gap-3 mb-4">
                <div className="h-px flex-1 bg-border/60" />
                <h2 className="font-display font-bold text-lg text-gradient-hero whitespace-nowrap">
                  {KNOCKOUT_STAGES.find((s) => s.key === knockoutStage)?.label}
                </h2>
                <div className="h-px flex-1 bg-border/60" />
              </div>
              {/* Counter */}
              {knockoutPendingCount > 0 && (
                <div className="mb-4 flex items-center gap-2 px-4 py-2.5 rounded-xl bg-destructive/10 border border-destructive/20 text-sm">
                  <span className="relative flex h-2 w-2 flex-shrink-0">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-destructive opacity-75"/>
                    <span className="relative inline-flex rounded-full h-2 w-2 bg-destructive"/>
                  </span>
                  <span className="text-destructive font-semibold">
                    Te {knockoutPendingCount === 1 ? "falta" : "faltan"}{" "}
                    <span className="font-black">{knockoutPendingCount}</span>{" "}
                    {knockoutPendingCount === 1 ? "partido" : "partidos"} por predecir
                  </span>
                </div>
              )}
              {knockoutAllPredicted && (
                <div className="mb-4 flex items-center gap-2 px-4 py-2.5 rounded-xl bg-secondary/10 border border-secondary/20 text-sm">
                  <span className="text-secondary font-semibold">✅ Predijiste todos los partidos de esta fase</span>
                </div>
              )}
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
      )}
    </div>
  );
}
