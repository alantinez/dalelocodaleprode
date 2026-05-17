import confetti from "canvas-confetti";
import { Trophy } from "lucide-react";
import { PRODE_CONFIG, formatARS } from "@/lib/prode/config";

export function CtaBand() {
  const fire = () => {
    confetti({
      particleCount: 140,
      spread: 80,
      origin: { y: 0.7 },
      colors: ["#3b82f6", "#10b981", "#f5c542", "#ffffff"],
    });
  };
  return (
    <section className="relative py-20 sm:py-28">
      <div className="mx-auto max-w-5xl px-4 sm:px-6">
        <div className="relative glass-strong rounded-3xl p-8 sm:p-14 text-center overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-br from-primary/20 via-transparent to-secondary/20 pointer-events-none" />
          <div className="absolute -top-24 left-1/2 -translate-x-1/2 w-96 h-96 rounded-full bg-primary/30 blur-3xl pointer-events-none" />
          <div className="relative">
            <h2 className="font-display font-bold text-3xl sm:text-5xl">
              Listo para <span className="text-gradient-hero">romperla</span>?
            </h2>
            <p className="mt-4 text-muted-foreground max-w-xl mx-auto">
              Sumate por {formatARS(PRODE_CONFIG.entryFee)} y peleá el pozo de {formatARS(PRODE_CONFIG.entryFee * PRODE_CONFIG.participants)}.
              Los primeros 3 se lo llevan todo.
            </p>
            <button
              onClick={fire}
              className="mt-8 inline-flex items-center gap-2 rounded-2xl bg-gradient-to-r from-primary to-secondary px-7 py-4 font-semibold text-background shadow-glow hover:scale-[1.03] transition"
            >
              <Trophy className="w-5 h-5" />
              Unirme al PRODE Mundial 2026
            </button>
            <p className="mt-4 text-xs font-mono uppercase tracking-widest text-muted-foreground">
              Las predicciones cierran al inicio de cada partido
            </p>
          </div>
        </div>
      </div>
    </section>
  );
}