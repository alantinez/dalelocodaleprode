import { motion } from "motion/react";
import { Link } from "@tanstack/react-router";
import { Sparkles, Trophy, Users, CheckCircle, ArrowRight, MessageCircle } from "lucide-react";
import heroImg from "@/assets/hero-mundial.jpg";
import { Countdown } from "./Countdown";
import { PRODE_CONFIG, formatARS, totalPot } from "@/lib/prode/config";
import { useAuth } from "@/hooks/use-auth";

// ⚠️ Reemplazá con tu número de WhatsApp (código de país sin el +)
const WHATSAPP_NUMBER = "5491168556733";
const WHATSAPP_MSG = encodeURIComponent("Hola Alan! Ya te transferí para el prode 🏆 ¿Me confirmás el pago?");
const WHATSAPP_URL = `https://wa.me/${WHATSAPP_NUMBER}?text=${WHATSAPP_MSG}`;

export function Hero() {
  const { user, profile } = useAuth();

const isPaid = profile?.paid === true;
const isLoggedIn = !!user && profile !== null;

  return (
    <section className="relative pt-32 sm:pt-40 pb-16 sm:pb-24 overflow-hidden">
      {/* Background image */}
      <div className="absolute inset-0 -z-10">
        <img
          src={heroImg}
          alt="Trofeo del Mundial 2026 iluminado en un estadio"
          width={1920}
          height={1080}
          className="w-full h-full object-cover opacity-40"
        />
        <div className="absolute inset-0 bg-gradient-to-b from-background/40 via-background/60 to-background" />
        <div className="absolute inset-0 grid-bg opacity-30" />
      </div>

      <div className="mx-auto max-w-7xl px-4 sm:px-6">
        <div className="grid lg:grid-cols-[1.2fr_1fr] gap-10 lg:gap-16 items-center">
          {/* Copy */}
          <div>
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6 }}
              className="inline-flex items-center gap-2 glass rounded-full px-4 py-1.5 text-xs font-mono uppercase tracking-widest text-primary mb-6"
            >
              <Sparkles className="w-3.5 h-3.5" />
              Edición FIFA 2026 · USA · México · Canadá
            </motion.div>

            <motion.h1
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.7, delay: 0.1 }}
              className="font-display font-bold text-5xl sm:text-6xl lg:text-7xl leading-[0.95] tracking-tight"
            >
              El prode <br className="hidden sm:block" />
              <span className="text-gradient-hero">definitivo.</span><br />
              Por la gloria eterna.
            </motion.h1>

            <motion.p
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.7, delay: 0.2 }}
              className="mt-6 text-base sm:text-lg text-muted-foreground max-w-xl"
            >
              Predecí cada partido, sumá puntos en vivo, escalá el ranking y llevate el pozo.
              Estadísticas premium, logros desbloqueables y el bardeo más sano del grupo.
            </motion.p>

            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.7, delay: 0.3 }}
              className="mt-8 flex flex-col sm:flex-row gap-3"
            >
              {/* Caso 1: No logueado */}
              {!isLoggedIn && (
                <>
                  <a
<Link to="/auth" search={{ redirect: "transferir" }} className="group inline-flex items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-primary to-secondary px-6 py-4 font-semibold text-background shadow-glow hover:scale-[1.02] transition">
  <Trophy className="w-5 h-5" />
  Unirme al Prode · {formatARS(PRODE_CONFIG.entryFee)}
</Link>
                  <Link
                    to="/fixture"
                    className="inline-flex items-center justify-center gap-2 rounded-2xl glass px-6 py-4 font-semibold hover:bg-card transition"
                  >
                    Ver fixture completo
                  </Link>
                </>
              )}

              {/* Caso 2: Logueado pero no pagó */}
              {isLoggedIn && !isPaid && (
                <>
                  <a
                    href="/#transferir"
                    className="group inline-flex items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-gold/80 to-primary px-6 py-4 font-semibold text-background shadow-glow hover:scale-[1.02] transition"
                  >
                    <Trophy className="w-5 h-5" />
                    Confirmar pago · {formatARS(PRODE_CONFIG.entryFee)}
                  </a>
                  <a
                    href={WHATSAPP_URL}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center justify-center gap-2 rounded-2xl bg-green-600 hover:bg-green-500 px-6 py-4 font-semibold text-white transition hover:scale-[1.02]"
                  >
                    <MessageCircle className="w-5 h-5" />
                    Ya pagué → Avisarle a Alan
                  </a>
                </>
              )}

              {/* Caso 3: Logueado y pagó */}
              {isLoggedIn && isPaid && (
                <>
                  <Link
                    to="/fixture"
                    className="group inline-flex items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-primary to-secondary px-6 py-4 font-semibold text-background shadow-glow hover:scale-[1.02] transition"
                  >
                    <ArrowRight className="w-5 h-5" />
                    Ir al fixture
                  </Link>
                  <div className="inline-flex items-center justify-center gap-2 rounded-2xl glass px-6 py-4 font-semibold text-secondary">
                    <CheckCircle className="w-5 h-5" />
                    Pago confirmado ✅
                  </div>
                </>
              )}
            </motion.div>

            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.8, delay: 0.5 }}
              className="mt-8 flex items-center gap-6 text-sm"
            >
              <div className="flex items-center gap-2">
                <Users className="w-4 h-4 text-secondary" />
                <span className="font-mono">
                  <b className="text-foreground">{PRODE_CONFIG.participants}</b> jugadores
                </span>
              </div>
              <div className="h-4 w-px bg-border" />
              <div className="flex items-center gap-2">
                <span className="relative flex h-2 w-2">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-secondary opacity-75" />
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-secondary" />
                </span>
                <span className="font-mono text-muted-foreground">
                  Pozo en vivo · <b className="text-gradient-gold">{formatARS(totalPot())}</b>
                </span>
              </div>
            </motion.div>
          </div>

          {/* Right column: countdown card */}
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.8, delay: 0.3 }}
            className="relative"
          >
            <div className="absolute -inset-4 bg-gradient-to-br from-primary/30 to-secondary/30 rounded-3xl blur-2xl" />
            <div className="relative glass-strong rounded-3xl p-6 sm:p-8 animate-float">
              <div className="flex items-center justify-between mb-1">
                <span className="text-xs font-mono uppercase tracking-widest text-muted-foreground">
                  Arranca el Mundial en
                </span>
                <span className="text-xs font-mono text-secondary">LIVE</span>
              </div>
              <Countdown />
              <div className="mt-6 pt-6 border-t border-border/60 grid grid-cols-2 gap-4">
                <div>
                  <div className="text-xs text-muted-foreground">Inauguración</div>
                  <div className="font-display font-semibold mt-0.5">11 Jun 2026</div>
                </div>
                <div>
                  <div className="text-xs text-muted-foreground">Estadio</div>
                  <div className="font-display font-semibold mt-0.5">Azteca, México</div>
                </div>
              </div>
            </div>
          </motion.div>
        </div>
      </div>
    </section>
  );
}
