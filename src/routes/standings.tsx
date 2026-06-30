import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { ArrowLeft, Loader2, Shield, Swords } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Navbar } from "@/components/landing/Navbar";

export const Route = createFileRoute("/standings")({
  head: () => ({ meta: [{ title: "Tabla de grupos · Dale Dale" }] }),
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
  { key: "qf",    label: "Cuartos de Final",  short: "QF" },
  { key: "sf",    label: "Semifinales",       short: "SF" },
  { key: "third", label: "3er y 4to Puesto",  short: "3°" },
  { key: "final", label: "Gran Final",        short: "🏆" },
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

function TeamChip({ team, winner }: { team: Team | null; winner?: boolean }) {
  return (
    <div className={`flex items-center gap-2 flex-1 min-w-0 ${winner ? "opacity-100" : "opacity-70"}`}>
      {team?.flag_url
        ? <img src={team.flag_url} alt="" className="w-6 h-6 rounded-full object-cover flex-shrink-0 ring-1 ring-border/60" />
        : <div className="w-6 h-6 rounded-full bg-border/40 flex items-center justify-center flex-shrink-0">
            <span className="text-[8px] font-mono text-muted-foreground">{team?.code ?? "?"}</span>
          </div>}
      <span className={`text-sm truncate ${winner ? "font-semibold text-foreground" : "font-medium text-muted-foreground"}`}>
        {team?.name ?? <span className="italic text-muted-foreground/50">Por definir</span>}
      </span>
    </div>
  );
}

function KnockoutMatchCard({ match }: { match: Match }) {
  const finished = match.status === "finished" && match.home_score !== null;
  const homeWins = finished && match.home_score! > match.away_score!;
  const awayWins = finished && match.away_score! > match.home_score!;
  const kickoff = new Date(match.kickoff);
  return (
    <div className={`glass rounded-xl p-3 border ${finished ? "border-primary/20" : "border-border/30"}`}>
      {!finished && (
        <div className="text-[10px] font-mono text-muted-foreground mb-2">
          {kickoff.toLocaleDateString("es-AR", { day: "2-digit", month: "2-digit" })}
          {" "}{kickoff.toLocaleTimeString("es-AR", { hour: "2-digit", minute: "2-digit" })}
        </div>
      )}
      <div className="flex items-center gap-2 mb-1.5">
        <TeamChip team={match.home} winner={homeWins} />
        {finished && <span className={`font-mono font-bold text-sm flex-shrink-0 w-5 text-right ${homeWins ? "text-primary" : "text-muted-foreground"}`}>{match.home_score}</span>}
      </div>
      {finished && <div className="h-px bg-border/30 my-1.5 mx-8" />}
      <div className="flex items-center gap-2">
        <TeamChip team={match.away} winner={awayWins} />
        {finished && <span className={`font-mono font-bold text-sm flex-shrink-0 w-5 text-right ${awayWins ? "text-primary" : "text-muted-foreground"}`}>{match.away_score}</span>}
      </div>
      {finished && <div className="mt-2 text-[9px] font-mono uppercase tracking-widest text-secondary">Final</div>}
    </div>
  );
}

function KnockoutBracket({ matches }: { matches: Match[] }) {
  if (matches.length === 0) return null;
  const byStage = new Map<string, Match[]>();
  for (const m of matches) { if (!byStage.has(m.stage)) byStage.set(m.stage, []); byStage.get(m.stage)!.push(m); }
  for (const [, ms] of byStage) ms.sort((a, b) => a.kickoff.localeCompare(b.kickoff));
  const activeStages = KNOCKOUT_STAGES.filter((s) => byStage.has(s.key));
  if (activeStages.length === 0) return null;

  return (
    <div className="mt-12">
      <div className="flex items-center gap-3 mb-6">
        <div className="w-px h-8 bg-gradient-to-b from-transparent via-primary to-transparent" />
        <div>
          <div className="flex items-center gap-2 mb-1">
            <Swords className="w-4 h-4 text-primary" />
            <span className="font-mono text-xs uppercase tracking-widest text-primary">Fase Eliminatoria</span>
          </div>
          <h2 className="font-display font-bold text-3xl">Cuadro de <span className="text-gradient-hero">eliminatorias</span></h2>
        </div>
      </div>
      <div className="space-y-8">
        {activeStages.map((stage) => {
          const stageMatches = byStage.get(stage.key)!;
          const isFinal = stage.key === "final";
          const isThird = stage.key === "third";
          return (
            <div key={stage.key}>
              <div className="flex items-center gap-3 mb-3">
                <div className={`px-3 py-1 rounded-full text-xs font-mono font-bold ${isFinal ? "bg-gold/20 text-gold" : "bg-primary/10 text-primary"}`}>
                  {isFinal ? "🏆" : isThird ? "🥉" : stage.short}
                </div>
                <span className="font-semibold text-sm">{stage.label}</span>
                <div className="flex-1 h-px bg-border/30" />
                <span className="text-xs font-mono text-muted-foreground">{stageMatches.length} partidos</span>
              </div>
              <div className={`grid gap-3 ${
                isFinal || isThird ? "sm:grid-cols-1 max-w-sm" :
                stageMatches.length >= 8 ? "grid-cols-2 sm:grid-cols-3 lg:grid-cols-4" :
                stageMatches.length >= 4 ? "grid-cols-2 sm:grid-cols-2 lg:grid-cols-4" :
                "grid-cols-1 sm:grid-cols-2"
              }`}>
                {stageMatches.map((m) => <KnockoutMatchCard key={m.id} match={m} />)}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

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

function StandingsPage() {
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

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <main className="mx-auto max-w-5xl px-4 sm:px-6 pt-28 pb-20">
        <Link to="/" className="inline-flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition mb-6">
          <ArrowLeft className="w-3.5 h-3.5" /> Volver
        </Link>
        <div className="flex items-start justify-between gap-4 mb-8 flex-wrap">
          <div>
            <h1 className="font-display text-4xl sm:text-5xl font-bold tracking-tight mb-2">Tabla de <span className="text-gradient-hero">grupos</span></h1>
            <p className="text-muted-foreground">Fase de grupos · {finishedMatches} partidos jugados{finishedMatches > 0 && " · actualizada en tiempo real"}</p>
          </div>
          <div className="flex items-center gap-4 text-xs font-mono text-muted-foreground glass rounded-xl px-4 py-2.5">
            <span className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-full bg-secondary inline-block" /> Clasifican</span>
            <span className="hidden sm:inline">PJ · PG · PE · PP · GF · GC · GD · Pts</span>
          </div>
        </div>

        {matchesQ.isLoading || teamsQ.isLoading ? (
          <div className="flex justify-center py-20"><Loader2 className="w-6 h-6 animate-spin text-primary" /></div>
        ) : (
          <>
            <div className="grid sm:grid-cols-2 gap-5">
              {sortedGroups.map(([group, standings]) => <GroupTable key={group} group={group} standings={standings} />)}
            </div>
            {finishedMatches === 0 && <p className="text-center text-xs text-muted-foreground mt-6 font-mono">La tabla se actualiza automáticamente cuando el admin carga resultados.</p>}
            {knockoutQ.isLoading ? (
              <div className="flex justify-center py-10 mt-10"><Loader2 className="w-5 h-5 animate-spin text-primary" /></div>
            ) : knockoutMatches.length > 0 ? (
              <KnockoutBracket matches={knockoutMatches} />
            ) : (
              <div className="mt-12 glass rounded-2xl p-8 text-center border border-border/30">
                <Swords className="w-8 h-8 text-muted-foreground mx-auto mb-3 opacity-30" />
                <p className="text-sm text-muted-foreground">El cuadro de eliminatorias aparece acá cuando el admin cargue los 16avos de final.</p>
              </div>
            )}
          </>
        )}
      </main>
    </div>
  );
}
