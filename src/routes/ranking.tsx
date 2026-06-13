import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  Trophy, Medal, Loader2, ArrowLeft, Target, Flame,
  TrendingUp, ArrowUp, ArrowDown, Minus, Camera, LineChart, X,
} from "lucide-react";
import {
  ResponsiveContainer, LineChart as RLineChart, Line,
  XAxis, YAxis, Tooltip, CartesianGrid, Legend,
} from "recharts";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { Navbar } from "@/components/landing/Navbar";
import { Lightbox } from "@/components/ui/Lightbox";
import mascota2 from "@/assets/mascota2.jpg.jpeg";
import foto3 from "@/assets/foto3.jpeg";

export const Route = createFileRoute("/ranking")({
  head: () => ({
    meta: [
      { title: "Ranking · Dale Dale" },
      { name: "description", content: "Tabla de posiciones en vivo del PRODE Mundial 2026." },
    ],
  }),
  component: RankingPage,
});

type Profile = { id: string; display_name: string; avatar_url: string | null; total_points: number; exact_hits: number; current_streak: number; };
type HistoryEntry = { user_id: string; position: number; snapshot_at: string; label: string | null; };

const PLAYER_COLORS = [
  "#e8002d","#0090ff","#00d2be","#ff8000","#dc0000",
  "#ffffff","#006f62","#b6babd","#f596c8","#900000",
  "#2293d1","#356cac","#37bedd","#5e8faa","#c92d4b",
  "#fe86bc","#6cd3bf","#ff87bc","#00594f","#cacfd2",
];

/* ─── PLAYER MODAL ─── */
type PlayerPred = {
  match_id: string;
  home_score: number;
  away_score: number;
  points: number | null;
  is_exact: boolean | null;
  match: {
    kickoff: string;
    group: string | null;
    status: string;
    home_score: number | null;
    away_score: number | null;
    home: { name: string; code: string; flag_url: string | null } | null;
    away: { name: string; code: string; flag_url: string | null } | null;
  } | null;
};

function PlayerModal({ player, position, onClose }: { player: Profile; position: number; onClose: () => void }) {
  const predsQ = useQuery({
    queryKey: ["player-modal-preds", player.id],
    queryFn: async () => {
      // Paso 1: predicciones del jugador
      const { data: preds, error } = await supabase
        .from("predictions")
        .select("match_id, home_score, away_score, points, is_exact")
        .eq("user_id", player.id);
      if (error) throw error;
      if (!preds || preds.length === 0) return [];

      // Paso 2: datos de los partidos
      const matchIds = preds.map((p: any) => p.match_id);
      const { data: matches } = await supabase
        .from("matches")
        .select(`id, kickoff, group, status, home_score, away_score,
          home:teams!matches_home_team_id_fkey(name, code, flag_url),
          away:teams!matches_away_team_id_fkey(name, code, flag_url)`)
        .in("id", matchIds);

      const matchMap = new Map((matches ?? []).map((m: any) => [m.id, m]));
      return (preds as any[]).map((p): PlayerPred => ({
        ...p,
        match: matchMap.get(p.match_id) ?? null,
      })).filter((p) => p.match).sort((a, b) =>
        new Date(b.match!.kickoff).getTime() - new Date(a.match!.kickoff).getTime()
      );
    },
  });

  const preds = predsQ.data ?? [];
  const finished = preds.filter((p) => p.match?.status === "finished");
  const exactos = finished.filter((p) => p.is_exact).length;
  const correctos = finished.filter((p) => !p.is_exact && (p.points ?? 0) > 0).length;
  const fallados = finished.filter((p) => (p.points ?? 0) === 0).length;
  const pct = finished.length > 0 ? Math.round(((exactos + correctos) / finished.length) * 100) : 0;

  const initials = player.display_name.split(" ").map((s) => s[0]).slice(0, 2).join("").toUpperCase();
  const medalColor = position === 1 ? "text-gold" : position === 2 ? "text-silver" : position === 3 ? "text-bronze" : "text-primary";

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4" onClick={onClose}>
      <div className="absolute inset-0 bg-background/80 backdrop-blur-sm" />
      <div
        className="relative w-full sm:max-w-lg glass-strong rounded-t-3xl sm:rounded-3xl overflow-hidden max-h-[90vh] flex flex-col"
        onClick={(e) => e.stopPropagation()}>

        {/* Header */}
        <div className="flex items-center gap-4 p-6 border-b border-border/40">
          <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-primary to-secondary flex items-center justify-center overflow-hidden flex-shrink-0 ring-2 ring-primary/30">
            {player.avatar_url
              ? <img src={player.avatar_url} alt="" className="w-full h-full object-cover" />
              : <span className="font-bold text-lg text-background">{initials}</span>}
          </div>
          <div className="flex-1 min-w-0">
            <div className={`font-mono text-xs font-bold mb-0.5 ${medalColor}`}>#{position}</div>
            <h2 className="font-display font-bold text-xl truncate">{player.display_name}</h2>
          </div>
          <button onClick={onClose} className="w-9 h-9 rounded-xl glass flex items-center justify-center hover:bg-card transition flex-shrink-0">
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Stats rápidas */}
        <div className="grid grid-cols-4 gap-2 px-4 py-4 border-b border-border/30">
          {[
            { label: "Puntos", value: player.total_points, color: "text-gold" },
            { label: "Exactos", value: exactos, color: "text-primary" },
            { label: "% Aciertos", value: finished.length > 0 ? `${pct}%` : "—", color: "text-secondary" },
            { label: "Racha", value: player.current_streak, color: "text-muted-foreground" },
          ].map((s) => (
            <div key={s.label} className="glass rounded-xl p-2.5 text-center">
              <div className={`font-display font-bold text-lg ${s.color}`}>{s.value}</div>
              <div className="text-[9px] font-mono uppercase tracking-widest text-muted-foreground mt-0.5">{s.label}</div>
            </div>
          ))}
        </div>

        {/* Mini stats */}
        {finished.length > 0 && (
          <div className="flex items-center gap-3 px-4 py-2.5 border-b border-border/30 text-xs font-mono">
            <span className="text-gold">⭐ {exactos} exactos</span>
            <span className="text-muted-foreground/40">·</span>
            <span className="text-secondary">✓ {correctos} correctos</span>
            <span className="text-muted-foreground/40">·</span>
            <span className="text-destructive">✗ {fallados} sin pts</span>
          </div>
        )}

        {/* Lista de predicciones */}
        <div className="overflow-y-auto flex-1">
          {predsQ.isLoading ? (
            <div className="flex justify-center py-10"><Loader2 className="w-5 h-5 animate-spin text-primary" /></div>
          ) : preds.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-10">No hizo pronósticos todavía.</p>
          ) : (
            <div className="divide-y divide-border/20">
              {preds.map((p) => {
                const m = p.match!;
                const isFinished = m.status === "finished";
                const isExact = p.is_exact;
                const hasPoints = (p.points ?? 0) > 0;

                const rowBg = isExact ? "bg-gold/5" : isFinished && hasPoints ? "bg-secondary/5" : "";

                const badge = isExact
                  ? <span className="text-[10px] font-mono font-bold text-gold px-2 py-0.5 rounded-full bg-gold/15 flex-shrink-0">⭐ +{p.points}</span>
                  : isFinished && hasPoints
                  ? <span className="text-[10px] font-mono font-bold text-secondary px-2 py-0.5 rounded-full bg-secondary/15 flex-shrink-0">✓ +{p.points}</span>
                  : isFinished
                  ? <span className="text-[10px] font-mono font-bold text-destructive px-2 py-0.5 rounded-full bg-destructive/10 flex-shrink-0">✗ 0</span>
                  : <span className="text-[10px] font-mono text-muted-foreground px-2 py-0.5 rounded-full glass flex-shrink-0">⏳</span>;

                return (
                  <div key={p.match_id} className={`flex items-center gap-3 px-4 py-3 ${rowBg}`}>
                    {/* Teams */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-1 mb-1">
                        {m.group && <span className="text-[9px] font-mono px-1 py-0.5 rounded bg-primary/15 text-primary">{m.group}</span>}
                        <span className="text-[9px] text-muted-foreground font-mono">
                          {new Date(m.kickoff).toLocaleDateString("es-AR", { day: "2-digit", month: "2-digit" })}
                        </span>
                      </div>
                      <div className="flex items-center gap-1 text-xs font-medium">
                        {m.home?.flag_url && <img src={m.home.flag_url} alt="" className="w-3.5 h-3.5 rounded-full object-cover" />}
                        <span className="truncate max-w-[55px]">{m.home?.name}</span>
                        <span className="text-muted-foreground text-[10px]">vs</span>
                        {m.away?.flag_url && <img src={m.away.flag_url} alt="" className="w-3.5 h-3.5 rounded-full object-cover" />}
                        <span className="truncate max-w-[55px]">{m.away?.name}</span>
                      </div>
                    </div>

                    {/* Su pronóstico */}
                    <div className="text-center flex-shrink-0">
                      <div className="text-[8px] text-muted-foreground font-mono mb-0.5">PRON.</div>
                      <div className={`font-mono font-bold text-sm ${isExact ? "text-gold" : isFinished && hasPoints ? "text-secondary" : "text-foreground"}`}>
                        {p.home_score}–{p.away_score}
                      </div>
                    </div>

                    {/* Resultado real */}
                    {isFinished && (
                      <div className="text-center flex-shrink-0">
                        <div className="text-[8px] text-muted-foreground font-mono mb-0.5">REAL</div>
                        <div className="font-mono font-bold text-sm">{m.home_score}–{m.away_score}</div>
                      </div>
                    )}

                    {badge}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

/* ─── SKELETON ─── */
function SkeletonRow({ hasHistory }: { hasHistory: boolean }) {
  const cols = hasHistory
    ? "grid-cols-[40px_24px_1fr_52px] sm:grid-cols-[44px_28px_1fr_60px_60px_60px]"
    : "grid-cols-[40px_1fr_52px] sm:grid-cols-[44px_1fr_60px_60px_60px]";
  return (
    <div className={`grid ${cols} gap-2 sm:gap-3 px-4 sm:px-6 py-4 items-center border-b border-border/20`}>
      <div className="h-6 w-8 rounded-lg bg-border/30 animate-pulse" />
      {hasHistory && <div className="h-4 w-5 rounded bg-border/30 animate-pulse mx-auto" />}
      <div className="flex items-center gap-2.5">
        <div className="w-9 h-9 rounded-lg bg-border/30 animate-pulse flex-shrink-0" />
        <div className="h-4 rounded-lg bg-border/30 animate-pulse flex-1 max-w-[140px]" />
      </div>
      <div className="h-5 w-8 rounded-lg bg-border/30 animate-pulse ml-auto" />
      <div className="hidden sm:block h-4 w-6 rounded bg-border/30 animate-pulse ml-auto" />
      <div className="hidden sm:block h-4 w-6 rounded bg-border/30 animate-pulse ml-auto" />
    </div>
  );
}

function RankingSkeleton() {
  return (
    <div className="glass-strong rounded-2xl overflow-hidden">
      <div className="px-4 sm:px-6 py-3 border-b border-border/50 h-10 bg-card/20 animate-pulse" />
      {Array.from({ length: 8 }).map((_, i) => <SkeletonRow key={i} hasHistory={false} />)}
    </div>
  );
}

function PositionDelta({ delta }: { delta: number | null | "new" }) {
  if (delta === "new") return <span className="text-[9px] font-mono font-bold text-gold uppercase tracking-wider">NEW</span>;
  if (delta === null) return null;
  if (delta === 0) return <Minus className="w-3 h-3 text-muted-foreground/50" />;
  if (delta > 0) return (
    <span className="inline-flex items-center gap-0.5 text-[10px] font-mono font-bold text-secondary">
      <ArrowUp className="w-2.5 h-2.5" />{delta}
    </span>
  );
  return (
    <span className="inline-flex items-center gap-0.5 text-[10px] font-mono font-bold text-destructive">
      <ArrowDown className="w-2.5 h-2.5" />{Math.abs(delta)}
    </span>
  );
}

function ChartTooltip({ active, payload, label }: any) {
  if (!active || !payload || payload.length === 0) return null;
  const sorted = [...payload].sort((a, b) => a.value - b.value);
  return (
    <div className="glass-strong rounded-xl p-3 text-xs shadow-xl border border-border/50 min-w-[160px]">
      <p className="font-mono font-bold text-muted-foreground mb-2 uppercase tracking-widest text-[10px]">{label}</p>
      {sorted.map((entry: any) => (
        <div key={entry.dataKey} className="flex items-center justify-between gap-3 py-0.5">
          <div className="flex items-center gap-1.5">
            <div className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ background: entry.color }} />
            <span className="font-medium truncate max-w-[100px]">{entry.dataKey}</span>
          </div>
          <span className="font-mono font-bold" style={{ color: entry.color }}>#{entry.value}</span>
        </div>
      ))}
    </div>
  );
}

function EvolutionChart({ allHistory }: { allHistory: HistoryEntry[] }) {
  const snapshotMap = new Map<string, { label: string; entries: HistoryEntry[] }>();
  for (const row of allHistory) {
    if (!snapshotMap.has(row.snapshot_at)) snapshotMap.set(row.snapshot_at, { label: row.label ?? row.snapshot_at.slice(0, 10), entries: [] });
    snapshotMap.get(row.snapshot_at)!.entries.push(row);
  }
  const snapshots = [...snapshotMap.entries()].sort((a, b) => a[0].localeCompare(b[0])).map(([, v]) => v);
  if (snapshots.length < 2) return null;

  const playerIds = new Set(allHistory.map((r) => r.user_id));
  const userNames = new Map<string, string>();
  playerIds.forEach((id) => userNames.set(id, id.slice(0, 6)));

  const chartData = snapshots.map((snap) => {
    const point: Record<string, any> = { snapshot: snap.label };
    for (const entry of snap.entries) {
      const name = userNames.get(entry.user_id) ?? entry.user_id.slice(0, 6);
      point[name] = entry.position;
    }
    return point;
  });

  const players = [...playerIds].map((id, idx) => ({
    id, name: userNames.get(id) ?? id.slice(0, 6), color: PLAYER_COLORS[idx % PLAYER_COLORS.length],
  }));

  const maxPos = Math.max(...allHistory.map((r) => r.position));

  return (
    <div className="glass-strong rounded-2xl p-5 sm:p-6 mt-8">
      <div className="flex items-center gap-2 mb-5">
        <LineChart className="w-4 h-4 text-primary" />
        <h2 className="font-display font-bold text-lg">Evolución del ranking</h2>
        <span className="text-xs font-mono text-muted-foreground ml-1">estilo F1</span>
      </div>
      <div className="h-[320px] sm:h-[400px]">
        <ResponsiveContainer width="100%" height="100%">
          <RLineChart data={chartData} margin={{ top: 8, right: 16, left: -20, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.06)" />
            <XAxis dataKey="snapshot" tick={{ fill: "#888", fontSize: 11, fontFamily: "monospace" }} axisLine={{ stroke: "rgba(255,255,255,0.1)" }} tickLine={false} />
            <YAxis reversed domain={[1, maxPos]} tickCount={maxPos} tick={{ fill: "#888", fontSize: 11, fontFamily: "monospace" }} axisLine={false} tickLine={false} tickFormatter={(v) => `#${v}`} />
            <Tooltip content={<ChartTooltip />} />
            {players.map((p) => (
              <Line key={p.id} type="monotone" dataKey={p.name} stroke={p.color} strokeWidth={2.5}
                dot={{ r: 5, fill: p.color, strokeWidth: 2, stroke: "#0a0a0f" }}
                activeDot={{ r: 7, stroke: p.color, strokeWidth: 2, fill: "#0a0a0f" }}
                connectNulls />
            ))}
            <Legend formatter={(value) => <span style={{ color: "#ccc", fontSize: 11, fontFamily: "monospace" }}>{value}</span>} iconType="circle" iconSize={8} />
          </RLineChart>
        </ResponsiveContainer>
      </div>
      <p className="text-[10px] text-muted-foreground mt-3 font-mono text-center">
        Posición 1 = primero · Los puntos corresponden a los snapshots guardados por el admin
      </p>
    </div>
  );
}

function RankingPage() {
  const { user } = useAuth();
  const [selectedPlayer, setSelectedPlayer] = useState<{ player: Profile; position: number } | null>(null);

  const q = useQuery({
    queryKey: ["ranking"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("profiles")
        .select("id, display_name, avatar_url, total_points, exact_hits, current_streak")
        .order("total_points", { ascending: false })
        .order("exact_hits", { ascending: false })
        .limit(100);
      if (error) throw error;
      return (data ?? []) as Profile[];
    },
    refetchInterval: 30_000,
  });

  const allHistoryQ = useQuery({
    queryKey: ["ranking-history-all"],
    queryFn: async () => {
      const { data, error } = await supabase.from("ranking_history").select("user_id, position, snapshot_at, label").order("snapshot_at", { ascending: true });
      if (error) throw error;
      return (data ?? []) as HistoryEntry[];
    },
    refetchInterval: 120_000,
  });

  const historyQ = useQuery({
    queryKey: ["ranking-history-latest"],
    queryFn: async () => {
      const { data, error } = await supabase.from("ranking_history").select("user_id, position, snapshot_at, label").order("snapshot_at", { ascending: false }).limit(300);
      if (error || !data || data.length === 0) return { prevMap: new Map<string, number>(), label: null };
      const timestamps = [...new Set(data.map((d: HistoryEntry) => d.snapshot_at))].sort().reverse();
      const latestTs = timestamps[0];
      const latestRows = data.filter((d: HistoryEntry) => d.snapshot_at === latestTs);
      const prevMap = new Map<string, number>();
      latestRows.forEach((d: HistoryEntry) => prevMap.set(d.user_id, d.position));
      return { prevMap, label: latestRows[0]?.label ?? null };
    },
    refetchInterval: 60_000,
  });

  const hasHistory = (historyQ.data?.prevMap.size ?? 0) > 0;
  const distinctSnapshots = new Set(allHistoryQ.data?.map((r) => r.snapshot_at) ?? []).size;
  const showChart = distinctSnapshots >= 2;

  const enrichedHistory = (() => {
    if (!allHistoryQ.data || !q.data) return allHistoryQ.data ?? [];
    const nameMap = new Map(q.data.map((p) => [p.id, p.display_name]));
    return allHistoryQ.data.map((row) => ({ ...row, display_name: nameMap.get(row.user_id) ?? row.user_id.slice(0, 6) }));
  })();

  const gridCols = hasHistory
    ? "grid-cols-[40px_24px_1fr_52px] sm:grid-cols-[44px_28px_1fr_60px_60px_60px]"
    : "grid-cols-[40px_1fr_52px] sm:grid-cols-[44px_1fr_60px_60px_60px]";

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <div className="fixed top-32 right-4 w-36 z-10 hidden 2xl:block">
        <Lightbox src={mascota2} className="rounded-2xl overflow-hidden border-2 border-primary shadow-glow rotate-3" imgClassName="w-full h-auto" />
      </div>
      <div className="fixed top-[26rem] right-4 w-36 z-10 hidden 2xl:block">
        <Lightbox src={foto3} className="rounded-2xl overflow-hidden border-2 border-secondary/40 shadow-glow -rotate-2" imgClassName="w-full h-auto" />
      </div>

      <main className="mx-auto max-w-5xl px-4 sm:px-6 pt-28 pb-24">
        <div className="mb-6">
          <Link to="/" className="inline-flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition mb-3">
            <ArrowLeft className="w-3.5 h-3.5" /> Volver
          </Link>
          <h1 className="font-display text-4xl sm:text-5xl font-bold tracking-tight">
            Tabla de <span className="text-gradient-hero">posiciones</span>
          </h1>
          <p className="text-muted-foreground mt-2">Actualizada en tiempo real · Tocá un jugador para ver sus pronósticos</p>
        </div>

        <div className="flex flex-wrap items-center gap-3 mb-4">
          <div className="inline-flex items-center gap-2 glass rounded-xl px-3 py-2">
            <div className="w-2 h-2 rounded-full bg-primary animate-pulse" />
            <span className="text-xs font-mono text-muted-foreground">LIVE</span>
          </div>
          {hasHistory && historyQ.data?.label && (
            <div className="inline-flex items-center gap-2 glass rounded-xl px-3 py-2">
              <Camera className="w-3.5 h-3.5 text-muted-foreground" />
              <span className="text-xs font-mono text-muted-foreground">
                vs snapshot: <span className="text-foreground">{historyQ.data.label}</span>
              </span>
            </div>
          )}
          {showChart && (
            <a href="#evolucion" className="inline-flex items-center gap-1.5 glass rounded-xl px-3 py-2 text-xs font-mono text-primary hover:bg-card transition">
              <LineChart className="w-3.5 h-3.5" /> Ver evolución F1
            </a>
          )}
        </div>

        {q.isLoading ? (
          <RankingSkeleton />
        ) : !q.data || q.data.length === 0 ? (
          <div className="glass-strong rounded-2xl p-12 text-center">
            <Trophy className="w-10 h-10 text-muted-foreground mx-auto mb-3" />
            <p className="text-muted-foreground">Todavía no hay participantes. ¡Sé el primero!</p>
          </div>
        ) : (
          <>
            <div className="glass-strong rounded-2xl overflow-hidden">
              <div className={`grid ${gridCols} gap-2 sm:gap-3 px-4 sm:px-6 py-3 border-b border-border/50 text-[10px] sm:text-xs uppercase tracking-widest font-mono text-muted-foreground`}>
                <div>#</div>
                {hasHistory && <div />}
                <div>Jugador</div>
                <div className="text-right flex items-center justify-end gap-1"><TrendingUp className="w-3 h-3" /><span className="hidden sm:inline">Pts</span></div>
                <div className="hidden sm:flex text-right items-center justify-end gap-1"><Target className="w-3 h-3" /><span className="hidden sm:inline">Exa</span></div>
                <div className="hidden sm:flex text-right items-center justify-end gap-1"><Flame className="w-3 h-3" /><span className="hidden sm:inline">Rch</span></div>
              </div>

              {q.data.map((p, i) => {
                const pos = i + 1;
                const isMe = p.id === user?.id;
                const medal = pos === 1 ? "text-gold" : pos === 2 ? "text-silver" : pos === 3 ? "text-bronze" : isMe ? "text-primary" : "text-muted-foreground";
                const initials = p.display_name?.split(" ").map((s: string) => s[0]).slice(0, 2).join("").toUpperCase() ?? "?";
                let delta: number | null | "new" = null;
                if (hasHistory) {
                  const prev = historyQ.data?.prevMap.get(p.id);
                  delta = prev === undefined ? "new" : prev - pos;
                }
                const rowBg = isMe ? "bg-primary/8 ring-1 ring-primary/30 ring-inset" : pos === 1 ? "bg-gold/5" : pos === 2 ? "bg-silver/5" : pos === 3 ? "bg-bronze/5" : "hover:bg-card/50";

                return (
                  <button
                    key={p.id}
                    onClick={() => setSelectedPlayer({ player: p, position: pos })}
                    className={`w-full grid ${gridCols} gap-2 sm:gap-3 px-4 sm:px-6 py-4 items-center border-b border-border/30 last:border-0 transition cursor-pointer active:scale-[0.99] ${rowBg}`}
                  >
                    <div className={`font-display font-bold text-lg sm:text-xl ${medal} flex items-center gap-0.5`}>
                      {pos <= 3 ? <Medal className="w-3.5 h-3.5 sm:w-4 sm:h-4" /> : null}{pos}
                    </div>
                    {hasHistory && <div className="flex items-center justify-center"><PositionDelta delta={delta} /></div>}
                    <div className="flex items-center gap-2 sm:gap-3 min-w-0">
                      <div className={`w-8 h-8 sm:w-10 sm:h-10 rounded-lg flex items-center justify-center overflow-hidden shrink-0 bg-gradient-to-br from-primary to-secondary ${isMe ? "ring-2 ring-primary" : ""}`}>
                        {p.avatar_url ? <img src={p.avatar_url} alt="" className="w-full h-full object-cover" /> : <span className="text-xs font-bold text-background">{initials}</span>}
                      </div>
                      <div className="min-w-0 flex-1 text-left">
                        <span className={`font-medium truncate block text-sm sm:text-base ${isMe ? "text-primary font-semibold" : ""}`}>{p.display_name}</span>
                        {isMe && <span className="text-[10px] font-mono text-primary/70 uppercase tracking-widest">Vos</span>}
                      </div>
                    </div>
                    <div className="text-right font-mono font-bold text-base sm:text-lg text-primary">{p.total_points}</div>
                    <div className="hidden sm:block text-right font-mono text-sm text-muted-foreground">{p.exact_hits}</div>
                    <div className="hidden sm:block text-right font-mono text-sm text-muted-foreground">{p.current_streak}</div>
                  </button>
                );
              })}
            </div>

            {showChart && <div id="evolucion"><EvolutionChart allHistory={enrichedHistory as any} /></div>}
            {!hasHistory && <p className="text-center text-xs text-muted-foreground mt-6 font-mono">Las flechas y el gráfico aparecerán cuando el admin guarde el primer snapshot.</p>}
          </>
        )}
      </main>

      {/* Modal de jugador */}
      {selectedPlayer && (
        <PlayerModal
          player={selectedPlayer.player}
          position={selectedPlayer.position}
          onClose={() => setSelectedPlayer(null)}
        />
      )}
    </div>
  );
}
