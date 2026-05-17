import { motion } from "motion/react";
import { Activity, BarChart3, Trophy, Users, Zap, MessageCircle } from "lucide-react";

const features = [
  { icon: Activity, title: "Ranking en vivo", desc: "El ranking se actualiza minuto a minuto durante los partidos." },
  { icon: Zap, title: "Multiplicadores", desc: "Doble puntos, All-In y Pick Sorpresa para arriesgar y romperla." },
  { icon: BarChart3, title: "Stats avanzadas", desc: "Efectividad, racha, mejor fecha y picks más arriesgados." },
  { icon: Trophy, title: "Logros y badges", desc: "Pulpo Paul, Mufa Oficial, Visionario y más medallas." },
  { icon: Users, title: "Perfil social", desc: "Avatar, historial, ranking histórico y predicciones públicas." },
  { icon: MessageCircle, title: "Chat y bardeo", desc: "Comentarios por partido, reacciones y feed de actividad." },
];

export function Features() {
  return (
    <section id="como-funciona" className="relative py-20 sm:py-28">
      <div className="mx-auto max-w-7xl px-4 sm:px-6">
        <div className="max-w-2xl mb-12">
          <div className="inline-flex items-center gap-2 glass rounded-full px-4 py-1.5 text-xs font-mono uppercase tracking-widest text-primary mb-4">
            Experiencia premium
          </div>
          <h2 className="font-display font-bold text-3xl sm:text-5xl">
            Como una <span className="text-gradient-hero">app deportiva real</span>.
          </h2>
          <p className="mt-4 text-muted-foreground">
            Inspirado en FIFA, ESPN y Sofascore. Todo lo que necesitás para vivir el Mundial con tus amigos.
          </p>
        </div>

        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-5">
          {features.map((f, i) => (
            <motion.div
              key={f.title}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.4, delay: i * 0.05 }}
              className="group glass rounded-2xl p-6 hover:bg-card/80 transition relative overflow-hidden"
            >
              <div className="absolute -top-12 -right-12 w-32 h-32 rounded-full bg-primary/20 blur-3xl group-hover:bg-primary/40 transition" />
              <div className="relative">
                <div className="w-11 h-11 rounded-xl bg-gradient-to-br from-primary/20 to-secondary/20 border border-primary/30 flex items-center justify-center mb-4">
                  <f.icon className="w-5 h-5 text-primary" />
                </div>
                <h3 className="font-display font-semibold text-lg">{f.title}</h3>
                <p className="mt-1.5 text-sm text-muted-foreground">{f.desc}</p>
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}