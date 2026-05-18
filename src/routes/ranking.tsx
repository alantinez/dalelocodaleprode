import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { Trophy, Medal, Loader2, ArrowLeft, Target, Flame, TrendingUp } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Navbar } from "@/components/landing/Navbar";

export const Route = createFileRoute("/ranking")({
  head: () => ({
    meta: [
      { title: "Ranking · PRODE Mundial 2026" },
      {
        name: "description",
        content: "Tabla de posiciones en vivo del PRODE Mundial 2026. Mirá quién va primero, los aciertos exactos y la racha de cada participante.",
      },
    ],
  }),
  component: RankingPage,
});

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
      return data ?? [];
    },
    refetchInterval: 30_000,
  });

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <main className="mx-auto max-w-5xl px-4 sm:px-6 pt-28 pb-20">
        <div className="mb-8 flex items-center justify-between">
          <div>
            <Link to="/" className="inline-flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition mb-3">
              <ArrowLeft className="w-3.5 h-3.5" /> Volver
            </Link>
            <h1 className="font-display text-4xl sm:text-5xl font-bold tracking-tight">
              Tabla de <span className="text-gradient-hero">posiciones</span>
            </h1>
            <p className="text-muted-foreground mt-2">
              Actualizada en tiempo real · Top 100 participantes
            </p>
          </div>
          <div className="hidden sm:flex items-center gap-2 glass rounded-xl px-3 py-2">
            <div className="w-2 h-2 rounded-full bg-primary animate-pulse" />
            <span className="text-xs font-mono text-muted-foreground">LIVE</span>
          </div>
        </div>

        {q.isLoading ? (
          <div className="flex items-center justify-center py-20">
            <Loader2 className="w-6 h-6 animate-spin text-primary" />
          </div>
        ) : !q.data || q.data.length === 0 ? (
          <div className="glass-strong rounded-2xl p-12 text-center">
            <Trophy className="w-10 h-10 text-muted-foreground mx-auto mb-3" />
            <p className="text-muted-foreground">
              Todavía no hay participantes. ¡Sé el primero!
            </p>
          </div>
        ) : (
          <div className="glass-strong rounded-2xl overflow-hidden">
            <div className="grid grid-cols-[40px_1fr_60px_60px_60px] sm:grid-cols-[60px_1fr_100px_100px_100px] gap-3 px-4 sm:px-6 py-3 border-b border-border/50 text-[10px] sm:text-xs uppercase tracking-widest font-mono text-muted-foreground">
              <div>#</div>
              <div>Jugador</div>
              <div className="text-right flex items-center justify-end gap-1"><TrendingUp className="w-3 h-3" /><span className="hidden sm:inline">Pts</span></div>
              <div className="text-right flex items-center justify-end gap-1"><Target className="w-3 h-3" /><span className="hidden sm:inline">Exa</span></div>
              <div className="text-right flex items-center justify-end gap-1"><Flame className="w-3 h-3" /><span className="hidden sm:inline">Rch</span></div>
            </div>
            {q.data.map((p, i) => {
              const pos = i + 1;
              const medal =
                pos === 1 ? "text-gold" : pos === 2 ? "text-silver" : pos === 3 ? "text-bronze" : "text-muted-foreground";
              const initials = p.display_name
                ?.split(" ").map((s) => s[0]).slice(0, 2).join("").toUpperCase() ?? "?";
              return (
                <div
                  key={p.id}
                  className="grid grid-cols-[40px_1fr_60px_60px_60px] sm:grid-cols-[60px_1fr_100px_100px_100px] gap-3 px-4 sm:px-6 py-4 items-center border-b border-border/30 last:border-0 hover:bg-card/50 transition"
                >
                  <div className={`font-display font-bold text-lg sm:text-xl ${medal} flex items-center gap-1`}>
                    {pos <= 3 && <Medal className="w-4 h-4" />}
                    {pos}
                  </div>
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-lg bg-gradient-to-br from-primary to-secondary flex items-center justify-center overflow-hidden shrink-0">
                      {p.avatar_url ? (
                        <img src={p.avatar_url} alt="" className="w-full h-full object-cover" />
                      ) : (
                        <span className="text-xs font-bold text-background">{initials}</span>
                      )}
                    </div>
                    <span className="font-medium truncate">{p.display_name}</span>
                  </div>
                  <div className="text-right font-mono font-bold text-base sm:text-lg text-primary">
                    {p.total_points}
                  </div>
                  <div className="text-right font-mono text-sm text-muted-foreground">
                    {p.exact_hits}
                  </div>
                  <div className="text-right font-mono text-sm text-muted-foreground">
                    {p.current_streak}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </main>
    </div>
  );
}