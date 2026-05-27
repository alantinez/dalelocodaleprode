import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import {
  Trophy, Medal, Loader2, ArrowLeft, Target, Flame,
  TrendingUp, ArrowUp, ArrowDown, Minus, Camera,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
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

type Profile = {
  id: string;
  display_name: string;
  avatar_url: string | null;
  total_points: number;
  exact_hits: number;
  current_streak: number;
};

type HistoryEntry = {
  user_id: string;
  position: number;
  snapshot_at: string;
  label: string | null;
};

function PositionDelta({ delta }: { delta: number | null | "new" }) {
  if (delta === "new") {
    return (
      <span className="text-[9px] font-mono font-bold text-gold uppercase tracking-wider">
        NEW
      </span>
    );
  }
  if (delta === null) return null;
  if (delta === 0) {
    return <Minus className="w-3 h-3 text-muted-foreground/50" />;
  }
  if (delta > 0) {
    return (
      <span className="inline-flex items-center gap-0.5 text-[10px] font-mono font-bold text-secondary">
        <ArrowUp className="w-2.5 h-2.5" />{delta}
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-0.5 text-[10px] font-mono font-bold text-destructive">
      <ArrowDown className="w-2.5 h-2.5" />{Math.abs(delta)}
    </span>
  );
}

function RankingPage() {
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

  // Traer el último snapshot para comparar posiciones
  const historyQ = useQuery({
    queryKey: ["ranking-history-latest"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("ranking_history")
        .select("user_id, position, snapshot_at, label")
        .order("snapshot_at", { ascending: false })
        .limit(300);

      if (error || !data || data.length === 0) {
        return { prevMap: new Map<string, number>(), label: null };
      }

      // Agrupar: el snapshot más reciente
      const timestamps = [...new Set(data.map((d: HistoryEntry) => d.snapshot_at))].sort().reverse();
      const latestTs = timestamps[0];
      const latestRows = data.filter((d: HistoryEntry) => d.snapshot_at === latestTs);

      const prevMap = new Map<string, number>();
      latestRows.forEach((d: HistoryEntry) => prevMap.set(d.user_id, d.position));

      const label = latestRows[0]?.label ?? null;
      return { prevMap, label };
    },
    refetchInterval: 60_000,
  });

  const hasHistory = (historyQ.data?.prevMap.size ?? 0) > 0;

  return (
    <div className="min-h-screen bg-background">
      <Navbar />

      {/* Fotos fijas en los márgenes — solo pantallas 2xl+ */}
      <div className="fixed top-32 right-4 w-36 z-10 hidden 2xl:block">
        <Lightbox
          src={mascota2}
          className="rounded-2xl overflow-hidden border-2 border-primary shadow-glow rotate-3"
          imgClassName="w-full h-auto"
        />
      </div>
      <div className="fixed top-[26rem] right-4 w-36 z-10 hidden 2xl:block">
        <Lightbox
          src={foto3}
          className="rounded-2xl overflow-hidden border-2 border-secondary/40 shadow-glow -rotate-2"
          imgClassName="w-full h-auto"
        />
      </div>

      <main className="mx-auto max-w-5xl px-4 sm:px-6 pt-28 pb-20">
        <div className="mb-6">
          <Link to="/" className="inline-flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition mb-3">
            <ArrowLeft className="w-3.5 h-3.5" /> Volver
          </Link>
          <h1 className="font-display text-4xl sm:text-5xl font-bold tracking-tight">
            Tabla de <span className="text-gradient-hero">posiciones</span>
          </h1>
          <p className="text-muted-foreground mt-2">Actualizada en tiempo real · Top 100 participantes</p>
        </div>

        {/* Indicadores */}
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

          {hasHistory && (
            <div className="inline-flex items-center gap-3 text-xs font-mono text-muted-foreground glass rounded-xl px-3 py-2 gap-3">
              <span className="inline-flex items-center gap-1 text-secondary"><ArrowUp className="w-3 h-3" /> Subió</span>
              <span className="inline-flex items-center gap-1 text-destructive"><ArrowDown className="w-3 h-3" /> Bajó</span>
              <span className="inline-flex items-center gap-1"><Minus className="w-3 h-3" /> Igual</span>
              <span className="text-gold">NEW</span>
            </div>
          )}
        </div>

        {q.isLoading ? (
          <div className="flex items-center justify-center py-20">
            <Loader2 className="w-6 h-6 animate-spin text-primary" />
          </div>
        ) : !q.data || q.data.length === 0 ? (
          <div className="glass-strong rounded-2xl p-12 text-center">
            <Trophy className="w-10 h-10 text-muted-foreground mx-auto mb-3" />
            <p className="text-muted-foreground">Todavía no hay participantes. ¡Sé el primero!</p>
          </div>
        ) : (
          <div className="glass-strong rounded-2xl overflow-hidden">
            {/* Header */}
            <div className={`grid ${hasHistory ? "grid-cols-[44px_28px_1fr_60px_60px_60px]" : "grid-cols-[44px_1fr_60px_60px_60px]"} sm:gap-3 gap-2 px-4 sm:px-6 py-3 border-b border-border/50 text-[10px] sm:text-xs uppercase tracking-widest font-mono text-muted-foreground`}>
              <div>#</div>
              {hasHistory && <div />}
              <div>Jugador</div>
              <div className="text-right flex items-center justify-end gap-1">
                <TrendingUp className="w-3 h-3" /><span className="hidden sm:inline">Pts</span>
              </div>
              <div className="text-right flex items-center justify-end gap-1">
                <Target className="w-3 h-3" /><span className="hidden sm:inline">Exa</span>
              </div>
              <div className="text-right flex items-center justify-end gap-1">
                <Flame className="w-3 h-3" /><span className="hidden sm:inline">Rch</span>
              </div>
            </div>

            {/* Filas */}
            {q.data.map((p, i) => {
              const pos = i + 1;
              const medal =
                pos === 1 ? "text-gold" :
                pos === 2 ? "text-silver" :
                pos === 3 ? "text-bronze" :
                "text-muted-foreground";
              const initials = p.display_name
                ?.split(" ").map((s: string) => s[0]).slice(0, 2).join("").toUpperCase() ?? "?";

              // Delta de posición
              let delta: number | null | "new" = null;
              if (hasHistory) {
                const prev = historyQ.data?.prevMap.get(p.id);
                if (prev === undefined) {
                  delta = "new";
                } else {
                  delta = prev - pos; // positivo = subió
                }
              }

              // Highlight top 3
              const rowBg =
                pos === 1 ? "bg-gold/5 hover:bg-gold/10" :
                pos === 2 ? "bg-silver/5 hover:bg-silver/10" :
                pos === 3 ? "bg-bronze/5 hover:bg-bronze/10" :
                "hover:bg-card/50";

              return (
                <div
                  key={p.id}
                  className={`grid ${hasHistory ? "grid-cols-[44px_28px_1fr_60px_60px_60px]" : "grid-cols-[44px_1fr_60px_60px_60px]"} sm:gap-3 gap-2 px-4 sm:px-6 py-4 items-center border-b border-border/30 last:border-0 transition ${rowBg}`}
                >
                  {/* Posición */}
                  <div className={`font-display font-bold text-lg sm:text-xl ${medal} flex items-center gap-1`}>
                    {pos <= 3 ? <Medal className="w-4 h-4" /> : null}{pos}
                  </div>

                  {/* Delta */}
                  {hasHistory && (
                    <div className="flex items-center justify-center">
                      <PositionDelta delta={delta} />
                    </div>
                  )}

                  {/* Jugador */}
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-lg bg-gradient-to-br from-primary to-secondary flex items-center justify-center overflow-hidden shrink-0">
                      {p.avatar_url
                        ? <img src={p.avatar_url} alt="" className="w-full h-full object-cover" />
                        : <span className="text-xs font-bold text-background">{initials}</span>
                      }
                    </div>
                    <span className="font-medium truncate">{p.display_name}</span>
                  </div>

                  {/* Pts */}
                  <div className="text-right font-mono font-bold text-base sm:text-lg text-primary">
                    {p.total_points}
                  </div>

                  {/* Exactos */}
                  <div className="text-right font-mono text-sm text-muted-foreground">
                    {p.exact_hits}
                  </div>

                  {/* Racha */}
                  <div className="text-right font-mono text-sm text-muted-foreground">
                    {p.current_streak}
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {!hasHistory && q.data && q.data.length > 0 && (
          <p className="text-center text-xs text-muted-foreground mt-6 font-mono">
            Las flechas de posición aparecerán cuando el admin guarde el primer snapshot del ranking.
          </p>
        )}
      </main>
    </div>
  );
}
