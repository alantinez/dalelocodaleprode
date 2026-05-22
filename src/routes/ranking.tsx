import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { Trophy, Medal, Loader2, ArrowLeft, Target, Flame, TrendingUp } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Navbar } from "@/components/landing/Navbar";
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

type ChampionPick = {
  user_id: string;
  team: { name: string; code: string; flag_url: string | null } | null;
};

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

  // Traer las predicciones del campeón de todos
  const champQ = useQuery({
    queryKey: ["champion-picks-all"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("champion_predictions")
        .select("user_id, team:teams(name, code, flag_url)");
      if (error) throw error;
      return (data ?? []) as unknown as ChampionPick[];
    },
    refetchInterval: 60_000,
  });

  // Map userId → pick
  const champByUser = new Map<string, ChampionPick["team"]>();
  (champQ.data ?? []).forEach((c) => {
    if (c.team) champByUser.set(c.user_id, c.team);
  });

  const hasChampions = champByUser.size > 0;

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <main className="mx-auto max-w-5xl px-4 sm:px-6 pt-28 pb-20">
        <div className="mb-8 flex items-center justify-between relative">
          <div>
            <Link to="/" className="inline-flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition mb-3">
              <ArrowLeft className="w-3.5 h-3.5" /> Volver
            </Link>
            <h1 className="font-display text-4xl sm:text-5xl font-bold tracking-tight">
              Tabla de <span className="text-gradient-hero">posiciones</span>
            </h1>
            <div className="absolute -top-4 right-0 w-24 sm:w-28 pointer-events-none select-none hidden sm:block">
              <div className="rounded-xl overflow-hidden border-2 border-primary shadow-glow rotate-3">
                <img src={mascota2} alt="" className="w-full h-auto" />
              </div>
            </div>
            <p className="text-muted-foreground mt-2">
              Actualizada en tiempo real · Top 100 participantes
            </p>
          </div>
          <div className="hidden sm:flex items-center gap-2 glass rounded-xl px-3 py-2">
            <div className="w-2 h-2 rounded-full bg-primary animate-pulse" />
            <span className="text-xs font-mono text-muted-foreground">LIVE</span>
          </div>
        </div>

        {/* foto3 */}
        <div className="hidden sm:flex justify-start mb-5 pointer-events-none select-none">
          <div className="w-36 rounded-2xl overflow-hidden border-2 border-secondary/30 shadow-glow -rotate-2">
            <img src={foto3} alt="" className="w-full h-auto" />
          </div>
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
            <div className={`grid gap-3 px-4 sm:px-6 py-3 border-b border-border/50 text-[10px] sm:text-xs uppercase tracking-widest font-mono text-muted-foreground ${
              hasChampions
                ? "grid-cols-[40px_1fr_70px_60px_60px_60px] sm:grid-cols-[60px_1fr_110px_100px_100px_100px]"
                : "grid-cols-[40px_1fr_60px_60px_60px] sm:grid-cols-[60px_1fr_100px_100px_100px]"
            }`}>
              <div>#</div>
              <div>Jugador</div>
              {hasChampions && (
                <div className="flex items-center gap-1">
                  <Trophy className="w-3 h-3 text-gold" />
                  <span className="hidden sm:inline text-gold">Campeón</span>
                </div>
              )}
              <div className="text-right flex items-center justify-end gap-1"><TrendingUp className="w-3 h-3" /><span className="hidden sm:inline">Pts</span></div>
              <div className="text-right flex items-center justify-end gap-1"><Target className="w-3 h-3" /><span className="hidden sm:inline">Exa</span></div>
              <div className="text-right flex items-center justify-end gap-1"><Flame className="w-3 h-3" /><span className="hidden sm:inline">Rch</span></div>
            </div>

            {/* Rows */}
            {q.data.map((p, i) => {
              const pos = i + 1;
              const medal = pos === 1 ? "text-gold" : pos === 2 ? "text-silver" : pos === 3 ? "text-bronze" : "text-muted-foreground";
              const initials = p.display_name?.split(" ").map((s: string) => s[0]).slice(0, 2).join("").toUpperCase() ?? "?";
              const pick = champByUser.get(p.id);

              return (
                <div
                  key={p.id}
                  className={`grid gap-3 px-4 sm:px-6 py-4 items-center border-b border-border/30 last:border-0 hover:bg-card/50 transition ${
                    hasChampions
                      ? "grid-cols-[40px_1fr_70px_60px_60px_60px] sm:grid-cols-[60px_1fr_110px_100px_100px_100px]"
                      : "grid-cols-[40px_1fr_60px_60px_60px] sm:grid-cols-[60px_1fr_100px_100px_100px]"
                  }`}
                >
                  <div className={`font-display font-bold text-lg sm:text-xl ${medal} flex items-center gap-1`}>
                    {pos <= 3 && <Medal className="w-4 h-4" />}{pos}
                  </div>

                  <div className="flex items-center gap-3 min-w-0">
                    <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-lg bg-gradient-to-br from-primary to-secondary flex items-center justify-center overflow-hidden shrink-0">
                      {p.avatar_url
                        ? <img src={p.avatar_url} alt="" className="w-full h-full object-cover" />
                        : <span className="text-xs font-bold text-background">{initials}</span>
                      }
                    </div>
                    <span className="font-medium truncate">{p.display_name}</span>
                  </div>

                  {hasChampions && (
                    <div className="flex items-center gap-1.5 min-w-0">
                      {pick ? (
                        <>
                          {pick.flag_url && (
                            <img src={pick.flag_url} alt={pick.name} className="w-6 h-6 rounded object-cover flex-shrink-0" />
                          )}
                          <span className="font-mono text-[10px] sm:text-xs text-muted-foreground truncate hidden sm:block">
                            {pick.code}
                          </span>
                        </>
                      ) : (
                        <span className="text-[10px] text-muted-foreground/50 font-mono">—</span>
                      )}
                    </div>
                  )}

                  <div className="text-right font-mono font-bold text-base sm:text-lg text-primary">{p.total_points}</div>
                  <div className="text-right font-mono text-sm text-muted-foreground">{p.exact_hits}</div>
                  <div className="text-right font-mono text-sm text-muted-foreground">{p.current_streak}</div>
                </div>
              );
            })}
          </div>
        )}
      </main>
    </div>
  );
}
