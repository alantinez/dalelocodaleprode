import { motion } from "motion/react";
import { Activity, BarChart3, Trophy, Users, Zap, MessageCircle } from "lucide-react";
import { Link } from "@tanstack/react-router";

const features = [
  {
    icon: Activity,
    title: "Ranking en vivo",
    desc: "El ranking se actualiza minuto a minuto durante los partidos.",
    gradient: "from-cyan-400 to-primary",
    glow: "group-hover:bg-cyan-400/20",
    iconBg: "from-cyan-400/20 to-primary/20 border-cyan-400/40",
    iconColor: "text-cyan-400",
    link: "/ranking",
  },
  {
    icon: BarChart3,
    title: "Stats avanzadas",
    desc: "Efectividad, racha, mejor fecha y evolución de puntos partido a partido.",
    gradient: "from-blue-400 to-violet-500",
    glow: "group-hover:bg-blue-400/20",
    iconBg: "from-blue-400/20 to-violet-500/20 border-blue-400/40",
    iconColor: "text-blue-400",
    link: "/stats",
  },
  {
    icon: Trophy,
    title: "Logros y badges",
    desc: "Pulpo Paul, Mufa Oficial, Visionario y más medallas desbloqueables.",
    gradient: "from-yellow-400 to-orange-500",
    glow: "group-hover:bg-yellow-400/20",
    iconBg: "from-yellow-400/20 to-orange-500/20 border-yellow-400/40",
    iconColor: "text-yellow-400",
    link: null,
  },
  {
    icon: Users,
    title: "Perfil social",
    desc: "Avatar, historial, predicciones públicas y campeón elegido.",
    gradient: "from-violet-400 to-purple-600",
    glow: "group-hover:bg-violet-400/20",
    iconBg: "from-violet-400/20 to-purple-600/20 border-violet-400/40",
    iconColor: "text-violet-400",
    link: "/perfil",
  },
  {
    icon: MessageCircle,
    title: "Chat en vivo",
    desc: "Hablá con el grupo, reaccioná con emojis y bardeá en tiempo real.",
    gradient: "from-emerald-400 to-secondary",
    glow: "group-hover:bg-emerald-400/20",
    iconBg: "from-emerald-400/20 to-secondary/20 border-emerald-400/40",
    iconColor: "text-emerald-400",
    link: "/chat",
  },
  {
    icon: Zap,
    title: "Gran Pronóstico",
    desc: "Elegí el campeón del Mundial y sumá 10 puntos extra si acertás.",
    gradient: "from-orange-400 to-red-500",
    glow: "group-hover:bg-orange-400/20",
    iconBg: "from-orange-400/20 to-red-500/20 border-orange-400/40",
    iconColor: "text-orange-400",
    link: "/fixture",
  },
];

export function Features() {
  return (
    <section id="como-funciona" className="relative py-20 sm:py-28">
      {/* Background decoration */}
      <div className="absolute inset-0 -z-10 overflow-hidden">
        <div className="absolute top-1/2 left-1/4 w-96 h-96 rounded-full bg-primary/5 blur-3xl" />
        <div className="absolute top-1/3 right-1/4 w-80 h-80 rounded-full bg-secondary/5 blur-3xl" />
      </div>

      <div className="mx-auto max-w-7xl px-4 sm:px-6">
        <div className="max-w-2xl mb-14">
          <div className="inline-flex items-center gap-2 glass rounded-full px-4 py-1.5 text-xs font-mono uppercase tracking-widest text-primary mb-4">
            Experiencia premium
          </div>
          <h2 className="font-display font-bold text-3xl sm:text-5xl">
            Como una <span className="text-gradient-hero">app deportiva real</span>.
          </h2>
          <p className="mt-4 text-muted-foreground text-lg">
            Inspirado en FIFA, ESPN y Sofascore. Todo lo que necesitás para vivir el Mundial con tus amigos.
          </p>
        </div>

        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-5">
          {features.map((f, i) => {
            const Card = (
              <motion.div
                key={f.title}
                initial={{ opacity: 0, y: 24 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.45, delay: i * 0.07 }}
                className="group relative glass rounded-2xl p-6 hover:bg-card/80 transition-all duration-300 overflow-hidden cursor-default"
              >
                {/* Top gradient line */}
                <div className={`absolute top-0 inset-x-0 h-[2px] bg-gradient-to-r ${f.gradient} opacity-60 group-hover:opacity-100 transition-opacity`} />

                {/* Glow blob */}
                <div className={`absolute -top-10 -right-10 w-40 h-40 rounded-full blur-3xl transition-all duration-500 bg-transparent ${f.glow}`} />

                <div className="relative">
                  {/* Icon */}
                  <div className={`w-13 h-13 w-12 h-12 rounded-2xl bg-gradient-to-br ${f.iconBg} border flex items-center justify-center mb-5`}>
                    <f.icon className={`w-6 h-6 ${f.iconColor}`} />
                  </div>

                  {/* Text */}
                  <h3 className="font-display font-bold text-lg mb-1.5">{f.title}</h3>
                  <p className="text-sm text-muted-foreground leading-relaxed">{f.desc}</p>

                  {/* Arrow hint if has link */}
                  {f.link && (
                    <div className={`mt-4 text-xs font-mono ${f.iconColor} opacity-0 group-hover:opacity-100 transition-opacity flex items-center gap-1`}>
                      Ver →
                    </div>
                  )}
                </div>
              </motion.div>
            );

            return f.link ? (
              <Link key={f.title} to={f.link as any}>
                {Card}
              </Link>
            ) : (
              <div key={f.title}>{Card}</div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
