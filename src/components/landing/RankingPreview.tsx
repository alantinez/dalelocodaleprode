import { motion } from "motion/react";
import { Flame, Trophy, Link2 } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { Link } from "@tanstack/react-router";
import { supabase } from "@/integrations/supabase/client";

type Player = {
  id: string;
  display_name: string;
  avatar_url: string | null;
  total_points: number;
  exact_hits: number;
  current_streak: number;
};

const medalColor = (p: number) =>
  p === 1 ? "text-gold" : p === 2 ? "text-[color:var(--silver)]" : p === 3 ? "text-[color:var(--bronze)]" : "text-muted-foreground";

export function RankingPreview() {
  const q = useQuery({
    queryKey: ["ranking-preview"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("profiles")
        .select("id, display_name, avatar_url, total_points, exact_hits, current_streak")
        .order("total_points", { ascending: false })
        .order("exact_hits", { ascending: false })
        .limit(6);
      if (error) throw error;
      return (data ?? []) as Player[];
    },
    refetchInterval: 60_000,
  });

  const players = q.data ?? [];
  const hasData = players.length > 0 && players.some((p) => p.total_points > 0);

  return (
    <section id="ranking" className="relative py-20 sm:py-28">
      <div className="mx-auto max-w-6xl px-4 sm:px-6">
        <div className="text-center mb-10">
          <div className="inline-flex items-center gap-2 glass rounded-full px-4 py-1.5 text-xs font-mono uppercase tracking-widest text-primary mb-4">
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-secondary opacity-75" />
              <span className="relative inline-flex rounded-full h-2 w-2 bg-secondary" />
            </span>
            Live
          </div>
          <h2 className="font-display font-bold text-3xl sm:text-5xl">
            Tabla de <span className="text-gradient-hero">posiciones</span>
          </h2>
          <p className="mt-3 text-muted-foreground">
            {hasData ? "Top 6 en vivo · actualizado en tiempo real." : "Arranca el 11 de junio. ¿Vas a estar?"}
          </p>
        </div>

        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
          className="glass-strong rounded-2xl overflow-hidden"
        >
          {/* Header */}
          <div className="grid grid-cols-[44px_1fr_70px_60px_50px] sm:grid-cols-[60px_1fr_100px_90px_70px] gap-3 px-4 sm:px-6 py-3 border-b border-border/60 text-[10px] sm:text-xs font-mono uppercase tracking-widest text-muted-foreground">
            <span>#</span>
            <span>Jugador</span>
            <span className="text-right">Exactos</span>
            <span className="text-right">Racha</span>
            <span className="text-right">Pts</span>
          </div>

          {q.isLoading ? (
            <div className="py-12 text-center text-muted-foreground text-sm">Cargando...</div>
          ) : players.length === 0 ? (
            <div className="py-12 text-center">
              <Trophy className="w-8 h-8 text-muted-foreground mx-auto mb-3 opacity-40" />
              <p className="text-muted-foreground text-sm">Los participantes aparecerán aquí cuando arranque el torneo.</p>
            </div>
          ) : (
            players.map((r, i) => {
              const pos = i + 1;
              const initials = r.display_name?.split(" ").map((s) => s[0]).slice(0, 2).join("").toUpperCase() ?? "?";
              return (
                <motion.div
                  key={r.id}
                  initial={{ opacity: 0, x: -20 }}
                  whileInView={{ opacity: 1, x: 0 }}
                  viewport={{ once: true }}
                  transition={{ duration: 0.3, delay: i * 0.05 }}
                  className={`grid grid-cols-[44px_1fr_70px_60px_50px] sm:grid-cols-[60px_1fr_100px_90px_70px] gap-3 items-center px-4 sm:px-6 py-3.5 border-b border-border/40 last:border-0 hover:bg-card/60 transition ${
                    pos === 1 ? "bg-gradient-to-r from-gold/10 to-transparent" : ""
                  }`}
                >
                  <span className={`font-display font-bold text-lg sm:text-xl ${medalColor(pos)}`}>
                    {String(pos).padStart(2, "0")}
                  </span>
                  <div className="flex items-center gap-2 sm:gap-3 min-w-0">
                    <div className="shrink-0 w-8 h-8 sm:w-9 sm:h-9 rounded-full bg-gradient-to-br from-primary to-secondary flex items-center justify-center overflow-hidden text-xs font-bold text-background">
                      {r.avatar_url
                        ? <img src={r.avatar_url} alt="" className="w-full h-full object-cover" />
                        : initials
                      }
                    </div>
                    <span className="font-medium truncate text-sm sm:text-base">{r.display_name}</span>
                  </div>
                  <span className="text-right font-mono text-sm">{r.exact_hits}</span>
                  <span className="text-right font-mono text-sm">
                    {r.current_streak > 0 ? (
                      <span className="inline-flex items-center gap-1 text-secondary">
                        <Flame className="w-3.5 h-3.5" />{r.current_streak}
                      </span>
                    ) : "—"}
                  </span>
                  <span className="text-right font-display font-bold text-base sm:text-lg tabular-nums">
                    {r.total_points}
                  </span>
                </motion.div>
              );
            })
          )}
        </motion.div>

        <div className="text-center mt-6">
          <Link
            to="/ranking"
            className="inline-flex items-center gap-2 glass rounded-xl px-5 py-2.5 text-sm font-medium hover:bg-card transition"
          >
            <Link2 className="w-4 h-4" />
            Ver ranking completo
          </Link>
        </div>
      </div>
    </section>
  );
}
