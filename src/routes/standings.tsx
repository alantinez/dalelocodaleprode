import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { ArrowLeft, Loader2, Shield } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Navbar } from "@/components/landing/Navbar";

export const Route = createFileRoute("/standings")({
  head: () => ({ meta: [{ title: "Tabla de grupos · Dale Dale" }] }),
  component: StandingsPage,
});

type Team = {
  id: string;
  name: string;
  code: string;
  flag_url: string | null;
  group: string;
};

type Match = {
  id: string;
  group: string | null;
  status: string;
  home_score: number | null;
  away_score: number | null;
  home: Team | null;
  away: Team | null;
};

type Standing = {
  team: Team;
  p: number; w: number; d: number; l: number;
  gf: number; ga: number; gd: number; pts: number;
};

function calcStandings(matches: Match[]): Map<string, Standing[]> {
  const teamMap = new Map<string, Standing>();

  const ensure = (team: Team) => {
    if (!teamMap.has(team.id)) {
      teamMap.set(team.id, { team, p: 0, w: 0, d: 0, l: 0, gf: 0, ga: 0, gd: 0, pts: 0 });
    }
    return teamMap.get(team.id)!;
  };

  for (const m of matches) {
    if (m.status !== "finished" || m.home_score === null || m.away_score === null) continue;
    if (!m.home || !m.away) continue;

    const home = ensure(m.home);
    const away = ensure(m.away);
    const hs = m.home_score, as_ = m.away_score;

    home.p++; away.p++;
    home.gf += hs; home.ga += as_; home.gd = home.gf - home.ga;
    away.gf += as_; away.ga += hs; away.gd = away.gf - away.ga;

    if (hs > as_) { home.w++; home.pts += 3; away.l++; }
    else if (hs < as_) { away.w++; away.pts += 3; home.l++; }
    else { home.d++; home.pts++; away.d++; away.pts++; }
  }

  // Agrupar por grupo
  const groupMap = new Map<string, Standing[]>();
  for (const s of teamMap.values()) {
    const g = s.team.group;
    if (!groupMap.has(g)) groupMap.set(g, []);
    groupMap.get(g)!.push(s);
  }

  // Ordenar cada grupo
  for (const [, standings] of groupMap) {
    standings.sort((a, b) =>
      b.pts - a.pts || b.gd - a.gd || b.gf - a.gf || a.team.name.localeCompare(b.team.name)
    );
  }

  return new Map([...groupMap.entries()].sort());
}

function GroupTable({ group, standings }: { group: string; standings: Standing[] }) {
  return (
    <div className="glass-strong rounded-2xl overflow-hidden">
      {/* Header del grupo */}
      <div className="flex items-center gap-2 px-4 py-3 border-b border-border/50 bg-primary/5">
        <Shield className="w-4 h-4 text-primary" />
        <span className="font-display font-bold text-base">Grupo {group}</span>
      </div>

      {/* Columnas */}
      <div className="grid grid-cols-[1fr_32px_32px_32px_32px_40px_40px_40px_40px] sm:grid-cols-[1fr_36px_36px_36px_36px_44px_44px_44px_44px] gap-0 px-3 py-2 text-[9px] sm:text-[10px] font-mono uppercase tracking-widest text-muted-foreground border-b border-border/30">
        <div>Equipo</div>
        <div className="text-center">PJ</div>
        <div className="text-center">PG</div>
        <div className="text-center">PE</div>
        <div className="text-center">PP</div>
        <div className="text-center">GF</div>
        <div className="text-center">GC</div>
        <div className="text-center">GD</div>
        <div className="text-center font-bold text-foreground">Pts</div>
      </div>

      {standings.map((s, i) => {
        const qualifies = i < 2;
        const eliminated = standings.every((x) => x.p > 0) && !qualifies;
        return (
          <div key={s.team.id}
            className={`grid grid-cols-[1fr_32px_32px_32px_32px_40px_40px_40px_40px] sm:grid-cols-[1fr_36px_36px_36px_36px_44px_44px_44px_44px] gap-0 px-3 py-3 items-center border-b border-border/20 last:border-0 transition
              ${qualifies && s.p > 0 ? "bg-secondary/5" : ""}
              ${eliminated ? "opacity-50" : "hover:bg-card/40"}`}
          >
            {/* Equipo */}
            <div className="flex items-center gap-2 min-w-0">
              <span className={`text-[10px] font-mono font-bold w-4 flex-shrink-0 ${qualifies && s.p > 0 ? "text-secondary" : "text-muted-foreground"}`}>
                {i + 1}
              </span>
              {s.team.flag_url
                ? <img src={s.team.flag_url} alt="" className="w-5 h-5 rounded-full object-cover flex-shrink-0" />
                : <div className="w-5 h-5 rounded-full bg-card flex items-center justify-center flex-shrink-0"><span className="text-[8px] font-mono">{s.team.code}</span></div>
              }
              <span className="text-sm font-medium truncate">{s.team.name}</span>
              {qualifies && s.p > 0 && (
                <span className="text-[9px] font-mono text-secondary hidden sm:inline">✓</span>
              )}
            </div>

            {/* Stats */}
            <div className="text-center font-mono text-xs text-muted-foreground">{s.p}</div>
            <div className="text-center font-mono text-xs text-muted-foreground">{s.w}</div>
            <div className="text-center font-mono text-xs text-muted-foreground">{s.d}</div>
            <div className="text-center font-mono text-xs text-muted-foreground">{s.l}</div>
            <div className="text-center font-mono text-xs text-muted-foreground">{s.gf}</div>
            <div className="text-center font-mono text-xs text-muted-foreground">{s.ga}</div>
            <div className={`text-center font-mono text-xs ${s.gd > 0 ? "text-secondary" : s.gd < 0 ? "text-destructive" : "text-muted-foreground"}`}>
              {s.gd > 0 ? `+${s.gd}` : s.gd}
            </div>
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
      const { data, error } = await supabase
        .from("matches")
        .select(`id, group, status, home_score, away_score,
          home:teams!matches_home_team_id_fkey(id, name, code, flag_url, group),
          away:teams!matches_away_team_id_fkey(id, name, code, flag_url, group)`)
        .eq("stage", "group")
        .order("kickoff", { ascending: true });
      if (error) throw error;
      return (data ?? []) as unknown as Match[];
    },
    refetchInterval: 30_000,
  });

  // También traemos teams para mostrar los 0-0 (equipos sin partidos jugados aún)
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

  // Calcular standings con resultados reales
  const standingsMap = calcStandings(matches);

  // Agregar equipos sin partidos jugados
  for (const team of teams) {
    const g = team.group;
    if (!standingsMap.has(g)) standingsMap.set(g, []);
    const existing = standingsMap.get(g)!;
    if (!existing.find((s) => s.team.id === team.id)) {
      existing.push({ team, p: 0, w: 0, d: 0, l: 0, gf: 0, ga: 0, gd: 0, pts: 0 });
    }
  }

  // Re-ordenar (por pts → gd → gf) todos los grupos (incluye los sin resultados)
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
            <h1 className="font-display text-4xl sm:text-5xl font-bold tracking-tight mb-2">
              Tabla de <span className="text-gradient-hero">grupos</span>
            </h1>
            <p className="text-muted-foreground">
              Fase de grupos · {finishedMatches} partidos jugados
              {finishedMatches > 0 && " · actualizada en tiempo real"}
            </p>
          </div>
          <div className="flex items-center gap-4 text-xs font-mono text-muted-foreground glass rounded-xl px-4 py-2.5">
            <span className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-full bg-secondary inline-block" /> Clasifican</span>
            <span>PJ · PG · PE · PP · GF · GC · GD · Pts</span>
          </div>
        </div>

        {matchesQ.isLoading || teamsQ.isLoading ? (
          <div className="flex justify-center py-20"><Loader2 className="w-6 h-6 animate-spin text-primary" /></div>
        ) : (
          <div className="grid sm:grid-cols-2 gap-5">
            {sortedGroups.map(([group, standings]) => (
              <GroupTable key={group} group={group} standings={standings} />
            ))}
          </div>
        )}

        {finishedMatches === 0 && !matchesQ.isLoading && (
          <p className="text-center text-xs text-muted-foreground mt-6 font-mono">
            La tabla se actualiza automáticamente cuando el admin carga resultados.
          </p>
        )}
      </main>
    </div>
  );
}
