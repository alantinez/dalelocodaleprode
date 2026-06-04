import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import {
  ArrowLeft, ArrowRight, Loader2, Trophy, Star,
  TrendingUp, ChevronLeft, ChevronRight, Calendar,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Navbar } from "@/components/landing/Navbar";
import { useState } from "react";

export const Route = createFileRoute("/_authenticated/resumen")({
  head: () => ({ meta: [{ title: "Resumen de fechas · Dale Dale" }] }),
  component: ResumenPage,
});

type MatchResult = {
  id: string;
  kickoff: string;
  group: string | null;
  stage: string;
  home_score: number;
  away_score: number;
  home: { name: string; code: string; flag_url: string | null } | null;
  away: { name: string; code: string; flag_url: string | null } | null;
};

type PredRow = {
  user_id: string;
  match_id: string;
  home_score: number;
  away_score: number;
  points: number;
  is_exact: boolean;
  profiles: { display_name: string; avatar_url: string | null } | null;
};

type DaySummary = {
  date: string; // YYYY-MM-DD
  label: string;
  matches: MatchResult[];
  predictions: PredRow[];
};

function toDateStr(iso: string) {
  return new Date(iso).toLocaleDateString("es-AR", { timeZone: "America/Argentina/Buenos_Aires" }).split("/").reverse().map((s, i) => i === 2 ? s : s.padStart(2, "0")).join("-");
}

function fmtLabel(dateStr: string) {
  const [y, m, d] = dateStr.split("-");
  const months = ["Ene","Feb","Mar","Abr","May","Jun","Jul","Ago","Sep","Oct","Nov","Dic"];
  return `${parseInt(d)} ${months[parseInt(m) - 1]} ${y}`;
}

function Avatar({ profile }: { profile: PredRow["profiles"] }) {
  const initials = profile?.display_name?.split(" ").map((s) => s[0]).slice(0, 2).join("").toUpperCase() ?? "?";
  return (
    <div className="w-8 h-8 rounded-full bg-gradient-to-br from-primary to-secondary flex items-center justify-center overflow-hidden flex-shrink-0">
      {profile?.avatar_url
        ? <img src={profile.avatar_url} alt="" className="w-full h-full object-cover" />
        : <span className="text-[10px] font-bold text-background">{initials}</span>}
    </div>
  );
}

function MatchSummaryCard({ match, predictions }: { match: MatchResult; predictions: PredRow[] }) {
  const matchPreds = predictions.filter((p) => p.match_id === match.id);
  const exactos = matchPreds.filter((p) => p.is_exact);
  const totalPreds = matchPreds.length;

  const homeWins = match.home_score > match.away_score;
  const awayWins = match.away_score > match.home_score;

  return (
    <div className="glass rounded-2xl p-4">
      {/* Match header */}
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          {match.group && <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-primary/15 text-primary">Grupo {match.group}</span>}
          {match.stage !== "group" && <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-secondary/15 text-secondary capitalize">{match.stage}</span>}
        </div>
        {totalPreds > 0 && (
          <span className="text-[10px] font-mono text-muted-foreground">{totalPreds} pronósticos</span>
        )}
      </div>

      {/* Teams + score */}
      <div className="flex items-center gap-3 mb-3">
        <div className={`flex items-center gap-2 flex-1 min-w-0 ${homeWins ? "" : "opacity-60"}`}>
          {match.home?.flag_url && <img src={match.home.flag_url} alt="" className="w-6 h-6 rounded-full object-cover flex-shrink-0" />}
          <span className={`text-sm font-medium truncate ${homeWins ? "font-bold" : ""}`}>{match.home?.name}</span>
        </div>
        <div className="font-display font-black text-xl flex-shrink-0 text-secondary">
          {match.home_score} – {match.away_score}
        </div>
        <div className={`flex items-center gap-2 flex-1 min-w-0 justify-end ${awayWins ? "" : "opacity-60"}`}>
          <span className={`text-sm font-medium truncate text-right ${awayWins ? "font-bold" : ""}`}>{match.away?.name}</span>
          {match.away?.flag_url && <img src={match.away.flag_url} alt="" className="w-6 h-6 rounded-full object-cover flex-shrink-0" />}
        </div>
      </div>

      {/* Exactos */}
      {exactos.length > 0 && (
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-[10px] font-mono text-gold uppercase tracking-wider">⭐ Exacto:</span>
          {exactos.map((p, i) => (
            <div key={i} className="flex items-center gap-1.5">
              <Avatar profile={p.profiles} />
              <span className="text-xs font-medium">{p.profiles?.display_name?.split(" ")[0]}</span>
              <span className="text-[10px] font-mono text-gold">+{p.points}pts</span>
            </div>
          ))}
        </div>
      )}

      {totalPreds > 0 && exactos.length === 0 && (
        <div className="text-[10px] font-mono text-muted-foreground">😅 Nadie acertó el exacto</div>
      )}
    </div>
  );
}

function DayView({ day }: { day: DaySummary }) {
  // Calcular puntos por usuario en este día
  const userPoints = new Map<string, { display_name: string; avatar_url: string | null; pts: number; exactos: number }>();

  for (const p of day.predictions) {
    if (!userPoints.has(p.user_id)) {
      userPoints.set(p.user_id, {
        display_name: p.profiles?.display_name ?? "?",
        avatar_url: p.profiles?.avatar_url ?? null,
        pts: 0, exactos: 0,
      });
    }
    const u = userPoints.get(p.user_id)!;
    u.pts += p.points ?? 0;
    if (p.is_exact) u.exactos++;
  }

  const sorted = [...userPoints.values()].sort((a, b) => b.pts - a.pts || b.exactos - a.exactos);
  const top3 = sorted.slice(0, 3);
  const worst = sorted.filter((u) => u.pts === 0 && sorted.some((x) => x.pts > 0));
  const totalExactos = day.predictions.filter((p) => p.is_exact).length;

  return (
    <div className="space-y-6">
      {/* Stats del día */}
      {sorted.length > 0 && (
        <div className="grid grid-cols-3 gap-3">
          <div className="glass rounded-2xl p-4 text-center">
            <div className="font-display font-bold text-2xl text-primary">{day.matches.length}</div>
            <div className="text-[10px] font-mono uppercase tracking-widest text-muted-foreground mt-1">Partidos</div>
          </div>
          <div className="glass rounded-2xl p-4 text-center">
            <div className="font-display font-bold text-2xl text-gold">{totalExactos}</div>
            <div className="text-[10px] font-mono uppercase tracking-widest text-muted-foreground mt-1">Exactos ⭐</div>
          </div>
          <div className="glass rounded-2xl p-4 text-center">
            <div className="font-display font-bold text-2xl text-secondary">{top3[0]?.pts ?? 0}</div>
            <div className="text-[10px] font-mono uppercase tracking-widest text-muted-foreground mt-1">Máx. pts</div>
          </div>
        </div>
      )}

      {/* Podio del día */}
      {top3.length > 0 && (
        <div className="glass-strong rounded-2xl p-5">
          <h3 className="font-display font-bold text-base mb-4 flex items-center gap-2">
            <TrendingUp className="w-4 h-4 text-primary" /> Top de la jornada
          </h3>
          <div className="space-y-2">
            {top3.map((u, i) => {
              const medals = ["🥇", "🥈", "🥉"];
              return (
                <div key={u.display_name} className="flex items-center gap-3">
                  <span className="text-lg w-6 flex-shrink-0">{medals[i]}</span>
                  <Avatar profile={u} />
                  <span className="font-medium text-sm flex-1 truncate">{u.display_name}</span>
                  <div className="text-right flex-shrink-0">
                    <div className="font-mono font-bold text-sm text-primary">+{u.pts} pts</div>
                    {u.exactos > 0 && <div className="text-[10px] text-gold">⭐ {u.exactos} exacto{u.exactos > 1 ? "s" : ""}</div>}
                  </div>
                </div>
              );
            })}
          </div>

          {/* Mufa del día */}
          {worst.length > 0 && (
            <div className="mt-4 pt-4 border-t border-border/40">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-sm">😈 Mufa del día:</span>
                {worst.slice(0, 3).map((u, i) => (
                  <div key={i} className="flex items-center gap-1.5">
                    <Avatar profile={u} />
                    <span className="text-xs text-muted-foreground">{u.display_name.split(" ")[0]}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Partidos del día */}
      <div>
        <h3 className="font-display font-bold text-base mb-3 flex items-center gap-2">
          <Trophy className="w-4 h-4 text-secondary" /> Partidos
        </h3>
        <div className="space-y-3">
          {day.matches.map((m) => (
            <MatchSummaryCard key={m.id} match={m} predictions={day.predictions} />
          ))}
        </div>
      </div>

      {/* Tabla completa del día */}
      {sorted.length > 3 && (
        <div className="glass-strong rounded-2xl overflow-hidden">
          <div className="px-4 py-3 border-b border-border/50 text-sm font-semibold">Todos los jugadores</div>
          <div className="divide-y divide-border/20">
            {sorted.map((u, i) => (
              <div key={u.display_name} className="flex items-center gap-3 px-4 py-3 hover:bg-card/40 transition">
                <span className="text-xs font-mono text-muted-foreground w-4">{i + 1}</span>
                <Avatar profile={u} />
                <span className="font-medium text-sm flex-1 truncate">{u.display_name}</span>
                {u.exactos > 0 && <span className="text-[10px] text-gold font-mono">⭐{u.exactos}</span>}
                <span className={`font-mono font-bold text-sm ${u.pts > 0 ? "text-primary" : "text-muted-foreground"}`}>
                  +{u.pts}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function ResumenPage() {
  const [dayIdx, setDayIdx] = useState(0); // 0 = más reciente

  const matchesQ = useQuery({
    queryKey: ["resumen-matches"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("matches")
        .select(`id, kickoff, group, stage, home_score, away_score,
          home:teams!matches_home_team_id_fkey(name, code, flag_url),
          away:teams!matches_away_team_id_fkey(name, code, flag_url)`)
        .eq("status", "finished")
        .order("kickoff", { ascending: true });
      if (error) throw error;
      return (data ?? []) as unknown as MatchResult[];
    },
    refetchInterval: 60_000,
  });

  const predsQ = useQuery({
    queryKey: ["resumen-predictions"],
    enabled: (matchesQ.data?.length ?? 0) > 0,
    queryFn: async () => {
      const matchIds = matchesQ.data!.map((m) => m.id);
      const { data, error } = await supabase
        .from("predictions")
        .select("user_id, match_id, home_score, away_score, points, is_exact, profiles(display_name, avatar_url)")
        .in("match_id", matchIds);
      if (error) throw error;
      return (data ?? []) as unknown as PredRow[];
    },
    refetchInterval: 60_000,
  });

  const matches = matchesQ.data ?? [];
  const predictions = predsQ.data ?? [];

  // Agrupar partidos por día
  const dayMap = new Map<string, MatchResult[]>();
  for (const m of matches) {
    const d = toDateStr(m.kickoff);
    if (!dayMap.has(d)) dayMap.set(d, []);
    dayMap.get(d)!.push(m);
  }

  const days: DaySummary[] = [...dayMap.entries()]
    .sort((a, b) => b[0].localeCompare(a[0])) // más reciente primero
    .map(([date, ms]) => ({
      date, label: fmtLabel(date), matches: ms,
      predictions: predictions.filter((p) => ms.some((m) => m.id === p.match_id)),
    }));

  const currentDay = days[dayIdx];
  const loading = matchesQ.isLoading || predsQ.isLoading;

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <main className="mx-auto max-w-3xl px-4 sm:px-6 pt-28 pb-20">
        <Link to="/" className="inline-flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition mb-6">
          <ArrowLeft className="w-3.5 h-3.5" /> Volver
        </Link>

        <div className="flex items-center gap-3 mb-2">
          <Calendar className="w-5 h-5 text-primary" />
          <span className="font-mono text-xs uppercase tracking-widest text-primary">Resumen por jornada</span>
        </div>
        <h1 className="font-display text-4xl sm:text-5xl font-bold tracking-tight mb-8">
          Resumen de <span className="text-gradient-hero">fechas</span>
        </h1>

        {loading ? (
          <div className="flex justify-center py-20"><Loader2 className="w-6 h-6 animate-spin text-primary" /></div>
        ) : days.length === 0 ? (
          <div className="glass-strong rounded-2xl p-14 text-center">
            <Calendar className="w-10 h-10 text-muted-foreground mx-auto mb-4 opacity-30" />
            <h3 className="font-display font-bold text-xl mb-2">Sin fechas todavía</h3>
            <p className="text-sm text-muted-foreground">El resumen aparece cuando el admin cargue los primeros resultados.</p>
          </div>
        ) : (
          <>
            {/* Navegación entre días */}
            <div className="flex items-center gap-3 mb-6">
              <button onClick={() => setDayIdx((i) => Math.min(days.length - 1, i + 1))}
                disabled={dayIdx >= days.length - 1}
                className="w-10 h-10 rounded-xl glass flex items-center justify-center hover:bg-card transition disabled:opacity-30">
                <ChevronLeft className="w-5 h-5" />
              </button>

              <div className="flex-1 overflow-x-auto flex gap-2 pb-1 scrollbar-hide">
                {days.map((d, i) => (
                  <button key={d.date} onClick={() => setDayIdx(i)}
                    className={`flex-shrink-0 px-3 py-2 rounded-xl text-xs font-mono font-medium transition whitespace-nowrap ${
                      i === dayIdx ? "bg-primary text-background" : "glass text-muted-foreground hover:text-foreground"
                    }`}>
                    {d.label}
                  </button>
                ))}
              </div>

              <button onClick={() => setDayIdx((i) => Math.max(0, i - 1))}
                disabled={dayIdx <= 0}
                className="w-10 h-10 rounded-xl glass flex items-center justify-center hover:bg-card transition disabled:opacity-30">
                <ChevronRight className="w-5 h-5" />
              </button>
            </div>

            {/* Contenido del día */}
            {currentDay && <DayView day={currentDay} />}
          </>
        )}
      </main>
    </div>
  );
}
