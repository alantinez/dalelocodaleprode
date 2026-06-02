import { motion } from "motion/react";
import { Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { Sparkles, Trophy, Users, CheckCircle, ArrowRight, MessageCircle, Clock } from "lucide-react";
import heroImg from "@/assets/hero-mundial.jpg";
import { Countdown } from "./Countdown";
import { PRODE_CONFIG, formatARS } from "@/lib/prode/config";
import { useAuth } from "@/hooks/use-auth";
import foto7 from "@/assets/foto7.jpg";
import { Lightbox } from "@/components/ui/Lightbox";
import { supabase } from "@/integrations/supabase/client";

const WHATSAPP_NUMBER = "5491168556733";
const WHATSAPP_MSG = encodeURIComponent("Hola Alan! Ya te transferí para el prode 🏆 ¿Me confirmás el pago?");
const WHATSAPP_URL = `https://wa.me/${WHATSAPP_NUMBER}?text=${WHATSAPP_MSG}`;

function daysUntil(target: Date): number {
  return Math.max(0, Math.ceil((target.getTime() - Date.now()) / 86_400_000));
}

export function Hero() {
  const { user, profile } = useAuth();
  const isPaid = profile?.paid === true;
  const isLoggedIn = !!user && profile !== null;

  // Participantes pagados en vivo
  const paidQ = useQuery({
    queryKey: ["hero-paid-participants"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("profiles")
        .select("id, display_name, avatar_url")
        .eq("paid", true)
        .limit(12);
      if (error) throw error;
      return data ?? [];
    },
    refetchInterval: 60_000,
  });

  const paidCount = paidQ.data?.length ?? 0;
  const prizePool = paidCount * PRODE_CONFIG.entryFee;
  const daysLeft = daysUntil(PRODE_CONFIG.worldCupStart);
  const worldCupStarted = Date.now() >= PRODE_CONFIG.worldCupStart.getTime();

  return (
    <section className="relative pt-32 sm:pt-40 pb-16 sm:pb-24 overflow-hidden">
      <div className="absolute inset-0 -z-10">
        <img src={heroImg} alt="Trofeo del Mundial 2026" width={1920} height={1080} className="w-full h-full object-cover opacity-40" />
        <div className="absolute inset-0 bg-gradient-to-b from-background/40 via-background/60 to-background" />
        <div className="absolute inset-0 grid-bg opacity-30" />
      </div>

      <div className="mx-auto max-w-7xl px-4 sm:px-6">
        <div className="grid lg:grid-cols-[1.2fr_1fr] gap-10 lg:gap-8 items-start">
          <div>
            {/* Badge */}
            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6 }}
              className="inline-flex items-center gap-2 glass rounded-full px-4 py-1.5 text-xs font-mono uppercase tracking-widest text-primary mb-6">
              <Sparkles className="w-3.5 h-3.5" />
              Edición FIFA 2026 · USA · México · Canadá
            </motion.div>

            {/* Headline */}
            <motion.h1 initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.7, delay: 0.1 }}
              className="font-display font-bold text-5xl sm:text-6xl lg:text-7xl leading-[0.95] tracking-tight">
              El prode <br className="hidden sm:block" />
              <span className="text-gradient-hero">definitivo.</span><br />
              Por la gloria eterna.
            </motion.h1>

            <motion.p initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.7, delay: 0.2 }}
              className="mt-6 text-base sm:text-lg text-muted-foreground max-w-xl">
              Predecí cada partido, sumá puntos en vivo, escalá el ranking y llevate el pozo.
              Estadísticas premium, logros desbloqueables y el bardeo más sano del grupo.
            </motion.p>

            {/* Urgencia */}
            {!worldCupStarted && daysLeft <= 14 && (
              <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.25 }}
                className="mt-4 inline-flex items-center gap-2 glass rounded-xl px-4 py-2 border border-gold/30">
                <Clock className="w-4 h-4 text-gold flex-shrink-0" />
                <span className="text-sm font-medium">
                  <span className="text-gold font-bold">{daysLeft === 0 ? "¡Hoy arranca!" : `${daysLeft} días`}</span>
                  {daysLeft > 0 && <span className="text-muted-foreground"> para el primer partido — inscribite antes que cierre</span>}
                </span>
              </motion.div>
            )}
            {worldCupStarted && (
              <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.25 }}
                className="mt-4 inline-flex items-center gap-2 glass rounded-xl px-4 py-2 border border-destructive/30">
                <span className="relative flex h-2 w-2 flex-shrink-0">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-destructive opacity-75" />
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-destructive" />
                </span>
                <span className="text-sm font-medium text-destructive">El torneo ya arrancó — todavía podés unirte</span>
              </motion.div>
            )}

            {/* CTAs */}
            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.7, delay: 0.3 }}
              className="mt-8 flex flex-col sm:flex-row gap-3">
              {!isLoggedIn && (
                <>
                  <a href="/auth?redirect=transferir"
                    className="group inline-flex items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-primary to-secondary px-6 py-4 font-semibold text-background shadow-glow hover:scale-[1.02] transition">
                    <Trophy className="w-5 h-5" />
                    Unirme al Prode · {formatARS(PRODE_CONFIG.entryFee)}
                  </a>
                  <Link to="/fixture"
                    className="inline-flex items-center justify-center gap-2 rounded-2xl glass px-6 py-4 font-semibold hover:bg-card transition">
                    Ver fixture completo
                  </Link>
                </>
              )}
              {isLoggedIn && !isPaid && (
                <>
                  <a href="/#transferir"
                    className="group inline-flex items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-gold/80 to-primary px-6 py-4 font-semibold text-background shadow-glow hover:scale-[1.02] transition">
                    <Trophy className="w-5 h-5" />
                    Confirmar pago · {formatARS(PRODE_CONFIG.entryFee)}
                  </a>
                  <a href={WHATSAPP_URL} target="_blank" rel="noopener noreferrer"
                    className="inline-flex items-center justify-center gap-2 rounded-2xl bg-green-600 hover:bg-green-500 px-6 py-4 font-semibold text-white transition hover:scale-[1.02]">
                    <MessageCircle className="w-5 h-5" />
                    Ya pagué → Avisarle a Alan
                  </a>
                </>
              )}
              {isLoggedIn && isPaid && (
                <>
                  <Link to="/fixture"
                    className="group inline-flex items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-primary to-secondary px-6 py-4 font-semibold text-background shadow-glow hover:scale-[1.02] transition">
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

            {/* Stats row */}
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.8, delay: 0.5 }}
              className="mt-8 flex flex-wrap items-center gap-4 sm:gap-6 text-sm">

              {/* Avatares + contador */}
              <div className="flex items-center gap-2">
                {paidQ.data && paidQ.data.length > 0 && (
                  <div className="flex -space-x-2">
                    {paidQ.data.slice(0, 5).map((p: any) => {
                      const initials = p.display_name?.split(" ").map((s: string) => s[0]).slice(0, 2).join("").toUpperCase() ?? "?";
                      return (
                        <div key={p.id} className="w-7 h-7 rounded-full ring-2 ring-background bg-gradient-to-br from-primary to-secondary flex items-center justify-center overflow-hidden flex-shrink-0">
                          {p.avatar_url
                            ? <img src={p.avatar_url} alt="" className="w-full h-full object-cover" />
                            : <span className="text-[9px] font-bold text-background">{initials}</span>}
                        </div>
                      );
                    })}
                  </div>
                )}
                <div className="flex items-center gap-1.5">
                  <Users className="w-4 h-4 text-secondary" />
                  <span className="font-mono">
                    <b className="text-foreground">{paidCount > 0 ? paidCount : "—"}</b>
                    <span className="text-muted-foreground"> confirmados</span>
                  </span>
                </div>
              </div>

              <div className="h-4 w-px bg-border hidden sm:block" />

              {/* Pozo en vivo */}
              <div className="flex items-center gap-1.5">
                <span className="relative flex h-2 w-2 flex-shrink-0">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-gold opacity-75" />
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-gold" />
                </span>
                <span className="font-mono text-muted-foreground">
                  Pozo: <b className="text-gold">{prizePool > 0 ? formatARS(prizePool) : "creciendo 🔥"}</b>
                </span>
              </div>
            </motion.div>

            {/* Social proof — "Ya están adentro" */}
            {paidQ.data && paidQ.data.length >= 3 && (
              <motion.p initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.7 }}
                className="mt-3 text-xs text-muted-foreground font-mono">
                {paidQ.data.slice(0, 3).map((p: any) => p.display_name?.split(" ")[0]).join(", ")}
                {paidCount > 3 && ` y ${paidCount - 3} más`} ya están adentro.
              </motion.p>
            )}
          </div>

          {/* Right column */}
          <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} transition={{ duration: 0.8, delay: 0.3 }}
            className="flex flex-col gap-4">
            <div className="relative">
              <div className="absolute -inset-4 bg-gradient-to-br from-primary/30 to-secondary/30 rounded-3xl blur-2xl" />
              <div className="relative glass-strong rounded-3xl p-6 sm:p-8 animate-float">
                <div className="flex items-center justify-between mb-1">
                  <span className="text-xs font-mono uppercase tracking-widest text-muted-foreground">
                    {worldCupStarted ? "El Mundial está en curso" : "Arranca el Mundial en"}
                  </span>
                  <span className="text-xs font-mono text-secondary">LIVE</span>
                </div>
                {!worldCupStarted ? <Countdown /> : (
                  <div className="py-4 text-center">
                    <div className="font-display font-bold text-3xl text-gradient-hero">¡EN JUEGO!</div>
                    <p className="text-xs text-muted-foreground mt-2">FIFA World Cup 2026</p>
                  </div>
                )}
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
                {prizePool > 0 && (
                  <div className="mt-4 pt-4 border-t border-border/60 text-center">
                    <div className="text-xs text-muted-foreground mb-1">Pozo acumulado</div>
                    <div className="font-display font-bold text-2xl text-gold">{formatARS(prizePool)}</div>
                  </div>
                )}
              </div>
            </div>

            <Lightbox
              src={foto7}
              className="relative rounded-3xl overflow-hidden border-2 border-secondary/40 shadow-glow"
              imgClassName="w-full h-auto max-h-64 object-cover"
            />
          </motion.div>
        </div>
      </div>
    </section>
  );
}
