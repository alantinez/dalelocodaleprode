import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { ArrowLeft, Loader2, Trophy, Star, TrendingUp, Swords } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Navbar } from "@/components/landing/Navbar";

export const Route = createFileRoute("/_authenticated/resumen")({
  head: () => ({ meta: [{ title: "Resumen de rondas · Dale Dale" }] }),
  component: ResumenPage,
});

type StageRow = {
  stage: string;
  user_id: string;
  display_name: string;
  avatar_url: string | null;
  stage_points: number;
  stage_exacts: number;
};

const STAGE_META: Record<string, { label: string; emoji: string; color: string; bg: string }> = {
  r32:   { label: "16avos de Final", emoji: "⚔️",  color: "text-primary",    bg: "from-primary/20 to-primary/5" },
  r16:   { label: "Octavos de Final", emoji: "🔥", color: "text-secondary",  bg: "from-secondary/20 to-secondary/5" },
  qf:    { label: "Cuartos de Final", emoji: "💥", color: "text-gold",       bg: "from-gold/20 to-gold/5" },
  sf:    { label: "Semifinales",      emoji: "🌟", color: "text-primary",    bg: "from-primary/20 to-primary/5" },
  final: { label: "Gran Final",       emoji: "🏆", color: "text-gold",       bg: "from-gold/30 to-gold/5" },
};

function Avatar({ name, url }: { name: string; url: string | null }) {
  const initials = name.split(" ").map((s) => s[0]).slice(0, 2).join("").toUpperCase();
  return (
    <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-primary to-secondary flex items-center justify-center overflow-hidden flex-shrink-0">
      {url ? <img src={url} alt="" className="w-full h-full object-cover" />
           : <span className="text-[10px] font-bold text-background">{initials}</span>}
    </div>
  );
}

function StageCard({ stage, rows }: { stage: string; rows: StageRow[] }) {
  const meta = STAGE_META[stage] ?? { label: stage, emoji: "⚽", color: "text-primary", bg: "from-primary/20 to-primary/5" };
  const sorted = [...rows].sort((a, b) => b.stage_points - a.stage_points || b.stage_exacts - a.stage_exacts);
  const top = sorted[0];
  const maxPts = top?.stage_points ?? 1;

  return (
    <div className={`glass-strong rounded-3xl overflow-hidden border border-border/30`}>
      {/* Header */}
      <div className={`bg-gradient-to-r ${meta.bg} px-6 py-4 border-b border-border/30`}>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <span className="text-2xl">{meta.emoji}</span>
            <div>
              <h2 className={`font-display font-bold text-lg ${meta.color}`}>{meta.label}</h2>
              <p className="text-xs text-muted-foreground font-mono">{sorted.length} participantes</p>
            </div>
          </div>
          {top && (
            <div className="text-right">
              <div className={`font-display font-black text-2xl ${meta.color}`}>{top.stage_points} pts</div>
              <div className="text-xs text-muted-foreground">máximo</div>
            </div>
          )}
        </div>
      </div>

      {/* Tabla */}
      <div className="divide-y divide-border/20">
        {sorted.map((r, i) => {
          const pct = maxPts > 0 ? (r.stage_points / maxPts) * 100 : 0;
          const isFirst = i === 0;
          const isSecond = i === 1;
          const isThird = i === 2;
          const medalColor = isFirst ? "text-gold" : isSecond ? "text-silver" : isThird ? "text-bronze" : "text-muted-foreground";

          return (
            <div key={r.user_id} className={`px-5 py-3.5 flex items-center gap-3 ${isFirst ? "bg-gold/5" : ""}`}>
              {/* Posición */}
              <span className={`font-display font-bold text-lg w-6 flex-shrink-0 ${medalColor}`}>
                {i + 1}
              </span>

              {/* Avatar */}
              <Avatar name={r.display_name} url={r.avatar_url} />

              {/* Info */}
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  <span className="font-medium text-sm truncate">{r.display_name}</span>
                  {r.stage_exacts > 0 && (
                    <span className="text-[10px] font-mono text-gold flex-shrink-0">⭐ ×{r.stage_exacts}</span>
                  )}
                </div>
                {/* Barra de progreso */}
                <div className="h-1.5 rounded-full bg-border/30 overflow-hidden">
                  <div
                    className={`h-full rounded-full transition-all duration-700 ${isFirst ? "bg-gold" : "bg-primary/60"}`}
                    style={{ width: `${pct}%` }}
                  />
                </div>
              </div>

              {/* Puntos */}
              <div className="text-right flex-shrink-0">
                <div className={`font-mono font-bold text-sm ${isFirst ? "text-gold" : meta.color}`}>
                  +{r.stage_points}
                </div>
                <div className="text-[10px] text-muted-foreground">pts</div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function ResumenPage() {
  const q = useQuery({
    queryKey: ["stage-leaderboard"],
    queryFn: async () => {
      const { data, error } = await supabase.rpc("get_stage_leaderboard");
      if (error) throw error;
      return (data ?? []) as StageRow[];
    },
    refetchInterval: 60_000,
  });

  // Agrupar por etapa
  const byStage = new Map<string, StageRow[]>();
  for (const row of q.data ?? []) {
    if (!byStage.has(row.stage)) byStage.set(row.stage, []);
    byStage.get(row.stage)!.push(row);
  }

  const stageOrder = ["r32", "r16", "qf", "sf", "final"];
  const activeStages = stageOrder.filter((s) => byStage.has(s));

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <main className="mx-auto max-w-3xl px-4 sm:px-6 pt-28 pb-20">
        <Link to="/fixture" className="inline-flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition mb-6">
          <ArrowLeft className="w-3.5 h-3.5" /> Volver al fixture
        </Link>

        <div className="flex items-center gap-2 text-xs font-mono uppercase tracking-widest text-primary mb-2">
          <TrendingUp className="w-4 h-4" /> Por etapa
        </div>
        <h1 className="font-display text-4xl sm:text-5xl font-bold tracking-tight mb-2">
          Resumen de <span className="text-gradient-hero">rondas</span>
        </h1>
        <p className="text-muted-foreground mb-10 text-sm">
          Quién sumó más puntos en cada fase eliminatoria.
        </p>

        {q.isLoading ? (
          <div className="flex justify-center py-20"><Loader2 className="w-6 h-6 animate-spin text-primary" /></div>
        ) : activeStages.length === 0 ? (
          <div className="glass-strong rounded-2xl p-14 text-center">
            <Swords className="w-10 h-10 text-muted-foreground mx-auto mb-4 opacity-30" />
            <h3 className="font-display font-bold text-xl mb-2">Todavía no hay rondas</h3>
            <p className="text-sm text-muted-foreground">
              Aparece acá cuando terminen los primeros partidos de la fase eliminatoria.
            </p>
          </div>
        ) : (
          <div className="space-y-6">
            {activeStages.map((stage) => (
              <StageCard key={stage} stage={stage} rows={byStage.get(stage)!} />
            ))}
          </div>
        )}

        {/* Mini leyenda */}
        {activeStages.length > 0 && (
          <div className="mt-8 flex flex-wrap items-center gap-4 text-xs text-muted-foreground font-mono justify-center">
            <span className="flex items-center gap-1.5"><Star className="w-3 h-3 text-gold" /> = exacto en esa ronda</span>
            <span className="flex items-center gap-1.5"><Trophy className="w-3 h-3 text-gold" /> = líder de ronda</span>
          </div>
        )}
      </main>
    </div>
  );
}
