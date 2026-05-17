import { motion } from "motion/react";
import { ArrowUp, ArrowDown, Minus, Flame } from "lucide-react";

const mockRanking = [
  { pos: 1, prev: 2, name: "Juan Pérez", points: 87, exact: 4, eff: 72, streak: 5, avatar: "JP" },
  { pos: 2, prev: 1, name: "Alan Torres", points: 84, exact: 3, eff: 68, streak: 2, avatar: "AT" },
  { pos: 3, prev: 3, name: "Sofi Romero", points: 79, exact: 3, eff: 65, streak: 0, avatar: "SR" },
  { pos: 4, prev: 6, name: "Diego Núñez", points: 76, exact: 2, eff: 61, streak: 3, avatar: "DN" },
  { pos: 5, prev: 4, name: "Maca Ríos", points: 74, exact: 2, eff: 60, streak: 1, avatar: "MR" },
  { pos: 6, prev: 5, name: "Luca Vidal", points: 70, exact: 2, eff: 58, streak: 0, avatar: "LV" },
];

const medalColor = (p: number) =>
  p === 1 ? "text-gradient-gold" : p === 2 ? "text-[color:var(--silver)]" : p === 3 ? "text-[color:var(--bronze)]" : "text-muted-foreground";

function Move({ pos, prev }: { pos: number; prev: number }) {
  if (prev > pos) return <span className="inline-flex items-center text-secondary text-xs"><ArrowUp className="w-3 h-3" />{prev - pos}</span>;
  if (prev < pos) return <span className="inline-flex items-center text-destructive text-xs"><ArrowDown className="w-3 h-3" />{pos - prev}</span>;
  return <span className="inline-flex items-center text-muted-foreground text-xs"><Minus className="w-3 h-3" /></span>;
}

export function RankingPreview() {
  return (
    <section id="ranking" className="relative py-20 sm:py-28">
      <div className="mx-auto max-w-6xl px-4 sm:px-6">
        <div className="text-center mb-10">
          <div className="inline-flex items-center gap-2 glass rounded-full px-4 py-1.5 text-xs font-mono uppercase tracking-widest text-primary mb-4">
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-secondary opacity-75" />
              <span className="relative inline-flex rounded-full h-2 w-2 bg-secondary" />
            </span>
            Live preview
          </div>
          <h2 className="font-display font-bold text-3xl sm:text-5xl">
            Tabla de <span className="text-gradient-hero">posiciones</span>
          </h2>
          <p className="mt-3 text-muted-foreground">Así se ve el ranking durante el torneo.</p>
        </div>

        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
          className="glass-strong rounded-2xl overflow-hidden"
        >
          <div className="grid grid-cols-[44px_36px_1fr_60px_60px_70px_50px] sm:grid-cols-[60px_44px_1fr_80px_80px_90px_70px] gap-3 px-4 sm:px-6 py-3 border-b border-border/60 text-[10px] sm:text-xs font-mono uppercase tracking-widest text-muted-foreground">
            <span>Pos</span>
            <span></span>
            <span>Jugador</span>
            <span className="text-right hidden sm:block">Exactos</span>
            <span className="text-right">Efec.</span>
            <span className="text-right">Racha</span>
            <span className="text-right">Pts</span>
          </div>
          {mockRanking.map((r, i) => (
            <motion.div
              key={r.name}
              initial={{ opacity: 0, x: -20 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.3, delay: i * 0.05 }}
              className={`grid grid-cols-[44px_36px_1fr_60px_60px_70px_50px] sm:grid-cols-[60px_44px_1fr_80px_80px_90px_70px] gap-3 items-center px-4 sm:px-6 py-3 border-b border-border/40 last:border-0 hover:bg-card/60 transition ${
                r.pos === 1 ? "bg-gradient-to-r from-[color:var(--gold)]/10 to-transparent" : ""
              }`}
            >
              <span className={`font-display font-bold text-lg sm:text-xl ${medalColor(r.pos)}`}>
                {String(r.pos).padStart(2, "0")}
              </span>
              <Move pos={r.pos} prev={r.prev} />
              <div className="flex items-center gap-2 sm:gap-3 min-w-0">
                <div className="shrink-0 w-8 h-8 sm:w-9 sm:h-9 rounded-full bg-gradient-to-br from-primary to-secondary flex items-center justify-center text-xs font-bold text-background">
                  {r.avatar}
                </div>
                <span className="font-medium truncate text-sm sm:text-base">{r.name}</span>
              </div>
              <span className="text-right font-mono text-sm hidden sm:block">{r.exact}</span>
              <span className="text-right font-mono text-sm">{r.eff}%</span>
              <span className="text-right font-mono text-sm">
                {r.streak > 0 ? (
                  <span className="inline-flex items-center gap-1 text-secondary">
                    <Flame className="w-3.5 h-3.5" />{r.streak}
                  </span>
                ) : "—"}
              </span>
              <span className="text-right font-display font-bold text-base sm:text-lg tabular-nums">{r.points}</span>
            </motion.div>
          ))}
        </motion.div>
      </div>
    </section>
  );
}