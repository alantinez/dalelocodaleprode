import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import {
  Trophy, Medal, Loader2, ArrowLeft, Target, Flame,
  TrendingUp, ArrowUp, ArrowDown, Minus, Camera, LineChart,
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
          <p className="text-muted-foreground mt-2">Actualizada en tiempo real · Top 100 participantes</p>
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

        {/* Skeleton o tabla */}
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
                  <div key={p.id} className={`grid ${gridCols} gap-2 sm:gap-3 px-4 sm:px-6 py-4 items-center border-b border-border/30 last:border-0 transition ${rowBg}`}>
                    <div className={`font-display font-bold text-lg sm:text-xl ${medal} flex items-center gap-0.5`}>
                      {pos <= 3 ? <Medal className="w-3.5 h-3.5 sm:w-4 sm:h-4" /> : null}{pos}
                    </div>
                    {hasHistory && <div className="flex items-center justify-center"><PositionDelta delta={delta} /></div>}
                    <div className="flex items-center gap-2 sm:gap-3 min-w-0">
                      <div className={`w-8 h-8 sm:w-10 sm:h-10 rounded-lg flex items-center justify-center overflow-hidden shrink-0 ${isMe ? "ring-2 ring-primary bg-gradient-to-br from-primary to-secondary" : "bg-gradient-to-br from-primary to-secondary"}`}>
                        {p.avatar_url ? <img src={p.avatar_url} alt="" className="w-full h-full object-cover" /> : <span className="text-xs font-bold text-background">{initials}</span>}
                      </div>
                      <div className="min-w-0 flex-1">
                        <span className={`font-medium truncate block text-sm sm:text-base ${isMe ? "text-primary font-semibold" : ""}`}>{p.display_name}</span>
                        {isMe && <span className="text-[10px] font-mono text-primary/70 uppercase tracking-widest">Vos</span>}
                      </div>
                    </div>
                    <div className="text-right font-mono font-bold text-base sm:text-lg text-primary">{p.total_points}</div>
                    <div className="hidden sm:block text-right font-mono text-sm text-muted-foreground">{p.exact_hits}</div>
                    <div className="hidden sm:block text-right font-mono text-sm text-muted-foreground">{p.current_streak}</div>
                  </div>
                );
              })}
            </div>

            {showChart && <div id="evolucion"><EvolutionChart allHistory={enrichedHistory as any} /></div>}
            {!hasHistory && <p className="text-center text-xs text-muted-foreground mt-6 font-mono">Las flechas y el gráfico aparecerán cuando el admin guarde el primer snapshot.</p>}
          </>
        )}
      </main>
    </div>
  );
}
