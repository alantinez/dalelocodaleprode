import { motion } from "motion/react";
import { Trophy, Medal, Award } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { PRODE_CONFIG, formatARS, prizeFor } from "@/lib/prode/config";

const icons = { gold: Trophy, silver: Medal, bronze: Award } as const;
const styles = {
  gold: {
    text: "text-gradient-gold",
    border: "border-[color:var(--gold)]/40",
    glow: "shadow-gold",
    bg: "from-[color:var(--gold)]/15 to-transparent",
  },
  silver: {
    text: "text-[color:var(--silver)]",
    border: "border-[color:var(--silver)]/30",
    glow: "",
    bg: "from-[color:var(--silver)]/10 to-transparent",
  },
  bronze: {
    text: "text-[color:var(--bronze)]",
    border: "border-[color:var(--bronze)]/40",
    glow: "",
    bg: "from-[color:var(--bronze)]/10 to-transparent",
  },
} as const;

export function PrizePool() {
  // Conteo real de participantes pagados
  const paidQ = useQuery({
    queryKey: ["paid-count"],
    queryFn: async () => {
      const { count, error } = await supabase
        .from("profiles")
        .select("id", { count: "exact", head: true })
        .eq("paid", true);
      if (error) throw error;
      return count ?? 0;
    },
    refetchInterval: 60_000,
  });

  const paidCount = paidQ.data ?? 0;
  const realPot = paidCount * PRODE_CONFIG.entryFee;

  const prizeAmount = (percent: number) =>
    Math.round((realPot * percent) / 100);

  return (
    <section id="premios" className="relative py-20 sm:py-28">
      <div className="mx-auto max-w-7xl px-4 sm:px-6">
        <div className="text-center mb-12 sm:mb-16">
          <div className="inline-flex items-center gap-2 glass rounded-full px-4 py-1.5 text-xs font-mono uppercase tracking-widest text-secondary mb-4">
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-secondary opacity-75" />
              <span className="relative inline-flex rounded-full h-2 w-2 bg-secondary" />
            </span>
            Pozo en vivo
          </div>
          <h2 className="font-display font-bold text-4xl sm:text-5xl lg:text-6xl">
            <span className="text-gradient-gold">
              {paidQ.isLoading ? "..." : formatARS(realPot)}
            </span>
          </h2>
          <p className="mt-3 text-muted-foreground">
            <span className="font-bold text-foreground">{paidCount}</span> participantes confirmados ·{" "}
            {formatARS(PRODE_CONFIG.entryFee)} c/u · 3 ganadores
          </p>
        </div>

        <div className="grid sm:grid-cols-3 gap-4 sm:gap-6">
          {PRODE_CONFIG.prizes.map((p, i) => {
            const Icon = icons[p.medal];
            const s = styles[p.medal];
            const order = [1, 0, 2][i];
            return (
              <motion.div
                key={p.position}
                initial={{ opacity: 0, y: 30 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.5, delay: i * 0.1 }}
                className={`relative glass-strong rounded-2xl p-6 sm:p-8 border ${s.border} ${s.glow} overflow-hidden ${
                  p.medal === "gold" ? "sm:scale-105 sm:-translate-y-2" : ""
                }`}
                style={{ order }}
              >
                <div className={`absolute inset-0 bg-gradient-to-br ${s.bg} pointer-events-none`} />
                <div className="relative">
                  <div className="flex items-center justify-between mb-6">
                    <div className="flex items-center gap-3">
                      <div className={`w-12 h-12 rounded-xl glass flex items-center justify-center ${s.text}`}>
                        <Icon className="w-6 h-6" />
                      </div>
                      <div>
                        <div className="text-xs font-mono uppercase tracking-widest text-muted-foreground">
                          Puesto
                        </div>
                        <div className={`font-display font-bold text-2xl ${s.text}`}>
                          #{p.position}
                        </div>
                      </div>
                    </div>
                    <span className={`font-mono text-sm ${s.text}`}>{p.percent}%</span>
                  </div>
                  <div className={`font-display font-bold text-3xl sm:text-4xl ${s.text}`}>
                    {paidQ.isLoading ? "..." : formatARS(prizeAmount(p.percent))}
                  </div>
                  <div className="mt-2 text-sm text-muted-foreground">{p.label}</div>
                </div>
              </motion.div>
            );
          })}
        </div>

        {paidCount === 0 && !paidQ.isLoading && (
          <p className="text-center text-xs text-muted-foreground mt-6 font-mono">
            El pozo crece con cada participante que confirma su pago 🏆
          </p>
        )}
      </div>
    </section>
  );
}
