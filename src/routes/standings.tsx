import { useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { ArrowLeft, Loader2, Shield, Swords, Trophy } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Navbar } from "@/components/landing/Navbar";

export const Route = createFileRoute("/standings")({
  head: () => ({ meta: [{ title: "Grupos & Bracket · Dale Dale" }] }),
  component: StandingsPage,
});

type Team = { id: string; name: string; code: string; flag_url: string | null; group: string; };
type Match = {
  id: string; kickoff: string; group: string | null; stage: string;
  status: string; home_score: number | null; away_score: number | null;
  home: Team | null; away: Team | null;
};
type Standing = { team: Team; p: number; w: number; d: number; l: number; gf: number; ga: number; gd: number; pts: number; };

const KNOCKOUT_STAGES = [
  { key: "r32",   label: "16avos de Final",  short: "16avos" },
  { key: "r16",   label: "Octavos de Final",  short: "Octavos" },
  { key: "qf",    label: "Cuartos de Final",  short: "QF"     },
  { key: "sf",    label: "Semifinales",       short: "SF"     },
  { key: "third", label: "3er y 4to Puesto",  short: "3°"     },
  { key: "final", label: "Gran Final",        short: "🏆"     },
];

function calcStandings(matches: Match[]): Map<string, Standing[]> {
  const teamMap = new Map<string, Standing>();
  const ensure = (team: Team) => {
    if (!teamMap.has(team.id)) teamMap.set(team.id, { team, p: 0, w: 0, d: 0, l: 0, gf: 0, ga: 0, gd: 0, pts: 0 });
    return teamMap.get(team.id)!;
  };
  for (const m of matches) {
    if (m.status !== "finished" || m.home_score === null || m.away_score === null || !m.home || !m.away) continue;
    const home = ensure(m.home); const away = ensure(m.away);
    const hs = m.home_score, as_ = m.away_score;
    home.p++; away.p++;
    home.gf += hs; home.ga += as_; home.gd = home.gf - home.ga;
    away.gf += as_; away.ga += hs; away.gd = away.gf - away.ga;
    if (hs > as_) { home.w++; home.pts += 3; away.l++; }
    else if (hs < as_) { away.w++; away.pts += 3; home.l++; }
    else { home.d++; home.pts++; away.d++; away.pts++; }
  }
  const groupMap = new Map<string, Standing[]>();
  for (const s of teamMap.values()) {
    const g = s.team.group;
    if (!groupMap.has(g)) groupMap.set(g, []);
    groupMap.get(g)!.push(s);
  }
  for (const [, standings] of groupMap) {
    standings.sort((a, b) => b.pts - a.pts || b.gd - a.gd || b.gf - a.gf || a.team.name.localeCompare(b.team.name));
  }
  return new Map([...groupMap.entries()].sort());
}

/* ─── BRACKET ─── */
function BracketTeamRow({ team, score, wins }: { team: Team | null; score: number | null; wins: boolean }) {
  return (
    <div className={`flex items-center gap-1.5 px-2 py-1.5 ${wins ? "bg-primary/10" : ""}`}>
      {team?.flag_url
        ? <img src={team.flag_url} alt="" className="w-5 h-5 rounded-full object-cover flex-shrink-0 ring-1 ring-border/40" />
        : <div className="w-5 h-5 rounded-full bg-border/40 flex items-center justify-center flex-shrink-0"><span className="text-[7px] font-mono">{team?.code ?? "?"}</span></div>}
      <span className={`text-[11px] truncate flex-1 ${wins ? "font-semibold text-foreground" : team ? "text-muted-foreground" : "text-muted-foreground/30 italic"}`}>
        {team?.name ?? "Por definir"}
      </span>
      {score !== null && <span className={`font-mono font-bold text-xs flex-shrink-0 ${wins ? "text-primary" : "text-muted-foreground"}`}>{score}</span>}
    </div>
  );
}

function BracketMatchCard({ match, isFinal }: { match: Match; isFinal?: boolean }) {
  const finished = match.status === "finished" && match.home_score !== null;
  const homeWins = finished && match.home_score! > match.away_score!;
  const awayWins = finished && match.away_score! > match.home_score!;
  const kickoff = new Date(match.kickoff);
  return (
    <div className={`glass rounded-xl overflow-hidden border ${isFinal ? "border-gold/50 shadow-[0_0_16px_rgba(255,215,0,0.12)]" : finished ? "border-primary/20" : "border-border/25"}`}>
      {!finished && (
        <div className="px-2 py-1 bg-card/30 border-b border-border/20 text-[9px] font-mono text-muted-foreground">
          {kickoff.toLocaleDateString("es-AR", { day: "2-digit", month: "2-digit" })}
          {" "}{kickoff.toLocaleTimeString("es-AR", { hour: "2-digit", minute: "2-digit" })}
        </div>
      )}
      <BracketTeamRow team={match.home} score={finished ? match.home_score : null} wins={homeWins} />
      <div className="h-px bg-border/25 mx-2" />
      <BracketTeamRow team={match.away} score={finished ? match.away_score : null} wins={awayWins} />
      {finished && (
        <div className={`px-2 py-0.5 border-t border-border/20 text-[8px] font-mono text-center ${isFinal ? "text-gold bg-gold/5" : "text-secondary/70"}`}>
          {isFinal ? "🏆 CAMPEÓN" : "Final"}
        </div>
      )}
    </div>
  );
}

function BracketPlaceholder() {
  return (
    <div className="glass rounded-xl overflow-hidden border border-border/15 opacity-30">
      <div className="px-2 py-1.5 flex items-center gap-1.5">
        <div className="w-5 h-5 rounded-full bg-border/30 flex-shrink-0" />
        <div className="h-2 flex-1 rounded bg-border/30" />
      </div>
      <div className="h-px bg-border/20 mx-2" />
      <div className="px-2 py-1.5 flex items-center gap-1.5">
        <div className="w-5 h-5 rounded-full bg-border/30 flex-shrink-0" />
        <div className="h-2 flex-1 rounded bg-border/30" />
      </div>
    </div>
  );
}

function BracketColumn({ stageKey, label, matches, placeholderCount }: {
  stageKey: string; label: string; matches: Match[]; placeholderCount: number;
}) {
  const isFinal = stageKey === "final";
  const total = matches.length + placeholderCount;
  return (
    <div className="flex flex-col min-w-[148px] sm:min-w-[164px]">
      <div className={`text-center mb-2 px-1 ${isFinal ? "text-gold" : "text-primary"}`}>
        <div className="text-[9px] font-mono font-bold uppercase tracking-wider">{label}</div>
      </div>
      <div className="flex flex-col flex-1 justify-around gap-2">
        {matches.map((m) => <BracketMatchCard key={m.id} match={m} isFinal={isFinal} />)}
        {Array.from({ length: placeholderCount }).map((_, i) => <BracketPlaceholder key={`ph-${i}`} />)}
      </div>
    </div>
  );
}

function BracketView({ matches }: { matches: Match[] }) {
  const byStage = new Map<string, Match[]>();
  for (const m of matches) {
    if (m.stage === "third") continue;
    if (!byStage.has(m.stage)) byStage.set(m.stage, []);
    byStage.get(m.stage)!.push(m);
  }
  for (const [, ms] of byStage) ms.sort((a, b) => a.kickoff.localeCompare(b.kickoff));

  const thirdMatch = matches.find((m) => m.stage === "third");

  // Calcular cuántos partidos debería haber en cada ronda
  const stageSizes: Record<string, number> = { r32: 16, r16: 8, qf: 4, sf: 2, final: 1 };
  const mainStages = ["r32", "r16", "qf", "sf", "final"];
  const activeMainStages = mainStages.filter((k) => byStage.has(k) || (byStage.size > 0));

  // Solo mostrar desde la primera etapa que tiene partidos
  const firstActiveIdx = mainStages.findIndex((k) => byStage.has(k));
  if (firstActiveIdx === -1) return null;
  const stagesToShow = mainStages.slice(firstActiveIdx);

  return (
    <div>
      <div className="overflow-x-auto pb-4 -mx-4 px-4">
        <div className="flex gap-2 sm:gap-3 min-w-max items-stretch" style={{ minHeight: "600px" }}>
          {stagesToShow.map((key) => {
            const stage = KNOCKOUT_STAGES.find((s) => s.key === key)!;
            const stageMatches = byStage.get(key) ?? [];
            const expected = stageSizes[key] ?? 1;
            const placeholders = Math.max(0, expected - stageMatches.length);
            return (
              <BracketColumn
                key={key}
                stageKey={key}
                label={stage.short === "🏆" ? "Final" : stage.label}
                matches={stageMatches}
                placeholderCount={placeholders}
              />
            );
          })}
        </div>
      </div>

      {/* 3er puesto */}
      {thirdMatch && (
        <div className="mt-6 max-w-[200px]">
          <div className="flex items-center gap-2 mb-2">
            <span className="text-[10px] font-mono text-muted-foreground">🥉 3er y 4to puesto</span>
          </div>
          <BracketMatchCard match={thirdMatch} />
        </div>
      )}

      {/* Leyenda */}
      <div className="mt-4 flex flex-wrap gap-4 text-[10px] text-muted-foreground font-mono">
        <span className="flex items-center gap-1.5"><div className="w-3 h-3 rounded bg-primary/20 border border-primary/40" /> Ganador</span>
        <span className="flex items-center gap-1.5"><Trophy className="w-3 h-3 text-gold" /> Campeón</span>
        <span className="opacity-40">░░ Por definirse</span>
      </div>
    </div>
  );
}

/* ─── GROUPS ─── */
function GroupTable({ group, standings }: { group: string; standings: Standing[] }) {
  return (
    <div className="glass-strong rounded-2xl overflow-hidden">
      <div className="flex items-center gap-2 px-4 py-3 border-b border-border/50 bg-primary/5">
        <Shield className="w-4 h-4 text-primary" />
        <span className="font-display font-bold text-base">Grupo {group}</span>
      </div>
      <div className="grid grid-cols-[1fr_32px_32px_32px_32px_40px_40px_40px_40px] sm:grid-cols-[1fr_36px_36px_36px_36px_44px_44px_44px_44px] gap-0 px-3 py-2 text-[9px] sm:text-[10px] font-mono uppercase tracking-widest text-muted-foreground border-b border-border/30">
        <div>Equipo</div>
        <div className="text-center">PJ</div><div className="text-center">PG</div>
        <div className="text-center">PE</div><div className="text-center">PP</div>
        <div className="text-center">GF</div><div className="text-center">GC</div>
        <div className="text-center">GD</div>
        <div className="text-center font-bold text-foreground">Pts</div>
      </div>
      {standings.map((s, i) => {
        const qualifies = i < 2;
        const eliminated = standings.every((x) => x.p > 0) && !qualifies;
        return (
          <div key={s.team.id} className={`grid grid-cols-[1fr_32px_32px_32px_32px_40px_40px_40px_40px] sm:grid-cols-[1fr_36px_36px_36px_36px_44px_44px_44px_44px] gap-0 px-3 py-3 items-center border-b border-border/20 last:border-0 transition ${qualifies && s.p > 0 ? "bg-secondary/5" : ""} ${eliminated ? "opacity-50" : "hover:bg-card/40"}`}>
            <div className="flex items-center gap-2 min-w-0">
              <span className={`text-[10px] font-mono font-bold w-4 flex-shrink-0 ${qualifies && s.p > 0 ? "text-secondary" : "text-muted-foreground"}`}>{i + 1}</span>
              {s.team.flag_url ? <img src={s.team.flag_url} alt="" className="w-5 h-5 rounded-full object-cover flex-shrink-0" /> : <div className="w-5 h-5 rounded-full bg-card flex items-center justify-center flex-shrink-0"><span className="text-[8px] font-mono">{s.team.code}</span></div>}
              <span className="text-sm font-medium truncate">{s.team.name}</span>
              {qualifies && s.p > 0 && <span className="text-[9px] font-mono text-secondary hidden sm:inline">✓</span>}
            </div>
            <div className="text-center font-mono text-xs text-muted-foreground">{s.p}</div>
            <div className="text-center font-mono text-xs text-muted-foreground">{s.w}</div>
            <div className="text-center font-mono text-xs text-muted-foreground">{s.d}</div>
            <div className="text-center font-mono text-xs text-muted-foreground">{s.l}</div>
            <div className="text-center font-mono text-xs text-muted-foreground">{s.gf}</div>
            <div className="text-center font-mono text-xs text-muted-foreground">{s.ga}</div>
            <div className={`text-center font-mono text-xs ${s.gd > 0 ? "text-secondary" : s.gd < 0 ? "text-destructive" : "text-muted-foreground"}`}>{s.gd > 0 ? `+${s.gd}` : s.gd}</div>
            <div className="text-center font-mono font-bold text-sm text-primary">{s.pts}</div>
          </div>
        );
      })}
    </div>
  );
}

/* ─── PAGE ─── */
function StandingsPage() {
  const [view, setView] = useState<"grupos" | "bracket">("bracket");

  const matchesQ = useQuery({
    queryKey: ["group-standings-matches"],
    queryFn: async () => {
      const { data, error } = await supabase.from("matches")
        .select(`id, kickoff, group, stage, status, home_score, away_score,
          home:teams!matches_home_team_id_fkey(id, name, code, flag_url, group),
          away:teams!matches_away_team_id_fkey(id, name, code, flag_url, group)`)
        .eq("stage", "group").order("kickoff", { ascending: true });
      if (error) throw error;
      return (data ?? []) as unknown as Match[];
    },
    refetchInterval: 30_000,
  });

  const knockoutQ = useQuery({
    queryKey: ["knockout-matches-standings"],
    queryFn: async () => {
      const { data, error } = await supabase.from("matches")
        .select(`id, kickoff, group, stage, status, home_score, away_score,
          home:teams!matches_home_team_id_fkey(id, name, code, flag_url, group),
          away:teams!matches_away_team_id_fkey(id, name, code, flag_url, group)`)
        .neq("stage", "group").order("kickoff", { ascending: true });
      if (error) throw error;
      return (data ?? []) as unknown as Match[];
    },
    refetchInterval: 30_000,
  });

  const teamsQ = useQuery({
    queryKey: ["teams-standings"],
    queryFn: async () => {
      const { data, error } = await supabase.from("teams").select("id, name, code, flag_url, group").order("group").order("name");
      if (error) throw error;
      return (data ?? []) as Team[];
    },
  });

  const matches = matchesQ.data ?? [];
  const teams = teamsQ.data ?? [];
  const knockoutMatches = knockoutQ.data ?? [];
  const standingsMap = calcStandings(matches);

  for (const team of teams) {
    const g = team.group;
    if (!standingsMap.has(g)) standingsMap.set(g, []);
    const existing = standingsMap.get(g)!;
    if (!existing.find((s) => s.team.id === team.id)) existing.push({ team, p: 0, w: 0, d: 0, l: 0, gf: 0, ga: 0, gd: 0, pts: 0 });
  }
  for (const [, standings] of standingsMap) {
    standings.sort((a, b) => b.pts - a.pts || b.gd - a.gd || b.gf - a.gf || a.team.name.localeCompare(b.team.name));
  }

  const sortedGroups = [...standingsMap.entries()].sort((a, b) => a[0].localeCompare(b[0]));
  const finishedMatches = matches.filter((m) => m.status === "finished").length;
  const hasBracket = knockoutMatches.length > 0;

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <main className="mx-auto max-w-5xl px-4 sm:px-6 pt-28 pb-20">
        <Link to="/" className="inline-flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition mb-6">
          <ArrowLeft className="w-3.5 h-3.5" /> Volver
        </Link>

        <div className="flex items-start justify-between gap-4 mb-6 flex-wrap">
          <div>
            <h1 className="font-display text-4xl sm:text-5xl font-bold tracking-tight mb-2">
              {view === "bracket"
                ? <>Bracket <span className="text-gradient-hero">2026</span></>
                : <>Tabla de <span className="text-gradient-hero">grupos</span></>}
            </h1>
            <p className="text-muted-foreground text-sm">
              {view === "bracket"
                ? "Cuadro de la fase eliminatoria · Mundial FIFA 2026"
                : `Fase de grupos · ${finishedMatches} partidos jugados`}
            </p>
          </div>
          {view === "grupos" && (
            <div className="flex items-center gap-4 text-xs font-mono text-muted-foreground glass rounded-xl px-4 py-2.5">
              <span className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-full bg-secondary inline-block" /> Clasifican</span>
              <span className="hidden sm:inline">PJ · PG · PE · PP · GF · GC · GD · Pts</span>
            </div>
          )}
        </div>

        {/* Tabs */}
        <div className="flex gap-2 mb-8">
          <button onClick={() => setView("bracket")}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold transition ${view === "bracket" ? "bg-gradient-to-r from-primary to-secondary text-background shadow-glow" : "glass text-muted-foreground hover:text-foreground"}`}>
            <Swords className="w-4 h-4" /> Bracket
            {hasBracket && <span className="w-2 h-2 rounded-full bg-secondary animate-pulse" />}
          </button>
          <button onClick={() => setView("grupos")}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold transition ${view === "grupos" ? "bg-gradient-to-r from-primary to-secondary text-background shadow-glow" : "glass text-muted-foreground hover:text-foreground"}`}>
            <Shield className="w-4 h-4" /> Tabla de Grupos
            <span className="text-[9px] font-mono text-muted-foreground/60">(finalizada)</span>
          </button>
        </div>

        {matchesQ.isLoading || teamsQ.isLoading || knockoutQ.isLoading ? (
          <div className="flex justify-center py-20"><Loader2 className="w-6 h-6 animate-spin text-primary" /></div>
        ) : view === "bracket" ? (
          hasBracket ? (
            <BracketView matches={knockoutMatches} />
          ) : (
            <div className="glass-strong rounded-2xl p-14 text-center">
              <Swords className="w-10 h-10 text-muted-foreground mx-auto mb-4 opacity-30" />
              <h3 className="font-display font-bold text-xl mb-2">Bracket en construcción</h3>
              <p className="text-sm text-muted-foreground">Aparece cuando el admin cargue los cruces eliminatorios.</p>
            </div>
          )
        ) : (
          <>
            <div className="grid sm:grid-cols-2 gap-5">
              {sortedGroups.map(([group, standings]) => <GroupTable key={group} group={group} standings={standings} />)}
            </div>
            {finishedMatches === 0 && <p className="text-center text-xs text-muted-foreground mt-6 font-mono">La tabla se actualiza cuando el admin carga resultados.</p>}
          </>
        )}
      </main>
    </div>
  );
}
