import { motion } from "motion/react";
import { Target, Trophy, TrendingUp, X, CheckCircle, Star } from "lucide-react";

const scoring = [
  {
    icon: Star,
    points: 5,
    label: "Resultado exacto",
    desc: "Acertás el marcador exacto del partido",
    example: "Predecís 2-1 y termina 2-1",
    color: "text-gold",
    bg: "from-gold/20 to-gold/5",
    border: "border-gold/30",
  },
  {
    icon: TrendingUp,
    points: 3,
    label: "Diferencia correcta",
    desc: "Acertás la diferencia de goles pero no el marcador exacto",
    example: "Predecís 3-1 y termina 2-0 (ambas +2)",
    color: "text-primary",
    bg: "from-primary/20 to-primary/5",
    border: "border-primary/30",
  },
  {
    icon: CheckCircle,
    points: 2,
    label: "Ganador o empate",
    desc: "Acertás quién gana o si empata, pero la diferencia no",
    example: "Predecís 2-0 y termina 1-0 (mismo ganador)",
    color: "text-secondary",
    bg: "from-secondary/20 to-secondary/5",
    border: "border-secondary/30",
  },
  {
    icon: X,
    points: 0,
    label: "Sin puntos",
    desc: "Predijiste mal el resultado",
    example: "Predecís 1-0 y termina 0-1",
    color: "text-muted-foreground",
    bg: "from-muted/20 to-muted/5",
    border: "border-border/40",
  },
];

const rules = [
  "Cada pronóstico se bloquea automáticamente cuando arranca el partido.",
  "Solo participantes que confirmen su pago pueden predecir.",
  "El campeón del prode es quien más puntos acumule al final del torneo.",
  "En caso de empate en puntos, gana quien tenga más exactos.",
  "El Gran Pronóstico (campeón del Mundial) suma 10 puntos extra si acertás.",
  "Los premios se distribuyen: 60% al 1°, 30% al 2° y 10% al 3°.",
  "El admin carga los resultados oficiales, que son los de FIFA.",
];

export function Reglamento() {
  return (
    <section id="reglamento" className="relative py-20 sm:py-28">
      <div className="mx-auto max-w-6xl px-4 sm:px-6">
        <div className="text-center mb-12">
          <div className="inline-flex items-center gap-2 glass rounded-full px-4 py-1.5 text-xs font-mono uppercase tracking-widest text-primary mb-4">
            <Target className="w-3 h-3" /> Sistema de puntos
          </div>
          <h2 className="font-display font-bold text-3xl sm:text-5xl">
            Reglamento <span className="text-gradient-hero">oficial</span>
          </h2>
          <p className="mt-3 text-muted-foreground max-w-xl mx-auto">
            Cuánto sumás por cada pronóstico y cómo se reparte el pozo.
          </p>
        </div>

        {/* Sistema de puntos */}
        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-12">
          {scoring.map((s, i) => (
            <motion.div
              key={s.label}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.4, delay: i * 0.08 }}
              className={`glass-strong rounded-2xl p-5 border ${s.border} bg-gradient-to-br ${s.bg} relative overflow-hidden`}
            >
              <div className="flex items-center justify-between mb-3">
                <s.icon className={`w-5 h-5 ${s.color}`} />
                <span className={`font-display font-black text-4xl ${s.color}`}>
                  {s.points > 0 ? `+${s.points}` : "0"}
                </span>
              </div>
              <div className={`font-display font-bold text-base ${s.color}`}>{s.label}</div>
              <p className="text-xs text-muted-foreground mt-1 leading-relaxed">{s.desc}</p>
              <div className="mt-3 glass rounded-lg px-2.5 py-1.5 text-[10px] font-mono text-muted-foreground">
                Ej: {s.example}
              </div>
            </motion.div>
          ))}
        </div>

        {/* Gran Pronóstico destacado */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="glass-strong rounded-2xl p-6 border border-gold/40 bg-gradient-to-r from-gold/10 via-transparent to-primary/10 mb-10 flex flex-col sm:flex-row items-center gap-4"
        >
          <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-gold/30 to-gold/10 border border-gold/40 flex items-center justify-center flex-shrink-0">
            <Trophy className="w-7 h-7 text-gold" />
          </div>
          <div className="flex-1 text-center sm:text-left">
            <div className="font-display font-bold text-xl text-gold">Gran Pronóstico — Campeón del Mundial</div>
            <p className="text-sm text-muted-foreground mt-0.5">
              Elegí el equipo que va a ganar el Mundial antes del primer partido. Si acertás, sumás <span className="text-gold font-bold">+10 puntos</span> al final del torneo. Se bloquea el 11 de junio.
            </p>
          </div>
          <div className="font-display font-black text-5xl text-gold flex-shrink-0">+10</div>
        </motion.div>

        {/* Reglas */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="glass rounded-2xl p-6 sm:p-8"
        >
          <h3 className="font-display font-bold text-xl mb-5 flex items-center gap-2">
            📋 Reglas generales
          </h3>
          <ul className="space-y-3">
            {rules.map((rule, i) => (
              <li key={i} className="flex items-start gap-3 text-sm text-muted-foreground">
                <span className="font-mono text-xs text-primary font-bold mt-0.5 flex-shrink-0">
                  {String(i + 1).padStart(2, "0")}
                </span>
                {rule}
              </li>
            ))}
          </ul>
        </motion.div>
      </div>
    </section>
  );
}
