import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import QRCode from "qrcode";
import { Copy, Check, Banknote, Sparkles } from "lucide-react";
import { toast } from "sonner";
import mascota from "@/assets/mascota-prode.png";
import { PRODE_CONFIG, formatARS } from "@/lib/prode/config";

const CVU = "0000003100091909835217";
const ALIAS = "alan.eze.martinez";

function CopyButton({ label, value }: { label: string; value: string }) {
  const [done, setDone] = useState(false);
  return (
    <button
      type="button"
      onClick={async () => {
        try {
          await navigator.clipboard.writeText(value);
          setDone(true);
          toast.success(`${label} copiado`);
          setTimeout(() => setDone(false), 1800);
        } catch {
          toast.error("No se pudo copiar");
        }
      }}
      className="inline-flex items-center gap-1.5 rounded-lg glass hover:bg-card px-3 py-1.5 text-xs font-mono font-semibold transition active:scale-95"
    >
      {done ? <Check className="w-3.5 h-3.5 text-secondary" /> : <Copy className="w-3.5 h-3.5" />}
      Copiar {label}
    </button>
  );
}

export function TransferimeRaton() {
  const qr = useQuery({
    queryKey: ["qr", ALIAS],
    queryFn: () =>
      QRCode.toDataURL(`ALIAS:${ALIAS}\nCVU:${CVU}\nMonto:${PRODE_CONFIG.entryFee}`, {
        margin: 1,
        width: 320,
        color: { dark: "#0b0b14", light: "#ffffffff" },
      }),
  });

  return (
    <section id="transferir" className="relative py-20 sm:py-28 overflow-hidden">
      <div className="absolute inset-0 -z-10 bg-gradient-to-b from-transparent via-primary/5 to-transparent" />
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 -z-10 w-[600px] h-[600px] rounded-full bg-gold/10 blur-3xl" />

      <div className="mx-auto max-w-6xl px-4 sm:px-6">
        <div className="text-center mb-10">
          <div className="inline-flex items-center gap-2 glass rounded-full px-3 py-1 text-xs font-mono uppercase tracking-widest text-gold">
            <Sparkles className="w-3 h-3" /> Inscripción oficial
          </div>
          <h2 className="font-display font-black text-4xl sm:text-6xl mt-3 text-gradient-gold">
            💸 Transferime, ratón
          </h2>
          <p className="mt-3 text-muted-foreground max-w-xl mx-auto">
            Si querés entrar al prode soltá la biyuya y dejá de especular. Inscripción{" "}
            <span className="text-gold font-bold">{formatARS(PRODE_CONFIG.entryFee)}</span>. El que paga, juega.
          </p>
        </div>

        <div className="grid lg:grid-cols-[1.1fr_1fr] gap-6 items-stretch">
          {/* Card pago */}
          <div className="glass-strong rounded-3xl p-6 sm:p-8 relative overflow-hidden group">
            <div className="absolute -top-px inset-x-0 h-px bg-gradient-to-r from-transparent via-gold/60 to-transparent" />
            <div className="absolute -inset-px rounded-3xl bg-gradient-to-br from-gold/20 via-transparent to-primary/20 opacity-0 group-hover:opacity-100 transition pointer-events-none" />

            <div className="flex items-center gap-2 text-xs font-mono uppercase tracking-widest text-muted-foreground">
              <Banknote className="w-4 h-4 text-gold" /> Datos para transferir
            </div>

            <div className="mt-6 space-y-5">
              <div>
                <div className="text-[10px] font-mono uppercase tracking-widest text-muted-foreground mb-1">
                  Alias
                </div>
                <div className="flex items-center justify-between gap-3 glass rounded-xl px-4 py-3">
                  <span className="font-mono font-bold text-base sm:text-lg text-gradient-gold break-all">
                    {ALIAS}
                  </span>
                  <CopyButton label="alias" value={ALIAS} />
                </div>
              </div>
              <div>
                <div className="text-[10px] font-mono uppercase tracking-widest text-muted-foreground mb-1">
                  CVU
                </div>
                <div className="flex items-center justify-between gap-3 glass rounded-xl px-4 py-3">
                  <span className="font-mono text-sm sm:text-base break-all">{CVU}</span>
                  <CopyButton label="CVU" value={CVU} />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="glass rounded-xl px-4 py-3">
                  <div className="text-[10px] font-mono uppercase tracking-widest text-muted-foreground">Titular</div>
                  <div className="font-display font-semibold mt-0.5">Alan Martínez</div>
                </div>
                <div className="glass rounded-xl px-4 py-3">
                  <div className="text-[10px] font-mono uppercase tracking-widest text-muted-foreground">Monto</div>
                  <div className="font-display font-bold mt-0.5 text-gold">
                    {formatARS(PRODE_CONFIG.entryFee)}
                  </div>
                </div>
              </div>
            </div>

            <div className="mt-6 text-[11px] text-muted-foreground border-t border-border/40 pt-4">
              Después de transferir avisale a Alan por WhatsApp con captura. Sin pago no entrás al pozo.
            </div>
          </div>

          {/* QR + mascota */}
          <div className="relative">
            <div className="glass-strong rounded-3xl p-6 sm:p-8 h-full flex flex-col items-center justify-center text-center relative overflow-hidden">
              <div className="absolute inset-0 bg-gradient-to-br from-gold/10 via-transparent to-primary/10" />
              <div className="relative">
                {qr.data ? (
                  <div className="rounded-2xl bg-white p-3 shadow-glow">
                    <img src={qr.data} alt="QR de pago" className="w-44 h-44 sm:w-52 sm:h-52" />
                  </div>
                ) : (
                  <div className="w-44 h-44 sm:w-52 sm:h-52 rounded-2xl bg-card animate-pulse" />
                )}
              </div>
              <div className="relative mt-4 font-mono text-[11px] uppercase tracking-widest text-muted-foreground">
                Escaneá y transferí
              </div>
            </div>

            {/* Mascota sticker */}
            <div className="hidden sm:block absolute -bottom-6 -right-6 lg:-bottom-10 lg:-right-10 w-40 lg:w-52 pointer-events-none select-none animate-float">
              <div className="absolute inset-0 -z-10 bg-gold/30 blur-2xl rounded-full" />
              <div className="relative rounded-2xl overflow-hidden border-4 border-gold shadow-glow rotate-6 hover:rotate-0 transition pointer-events-auto">
                <img src={mascota} alt="Mascota oficial del Prode" className="w-full h-auto" />
                <div className="absolute bottom-0 inset-x-0 bg-gradient-to-t from-background/90 to-transparent p-2 text-center">
                  <span className="font-display font-black text-[10px] uppercase tracking-widest text-gold">
                    Transferí, ratón
                  </span>
                </div>
              </div>
            </div>

            <div className="sm:hidden mt-4 flex justify-center">
              <div className="relative w-32">
                <div className="absolute inset-0 -z-10 bg-gold/30 blur-2xl rounded-full" />
                <div className="rounded-2xl overflow-hidden border-4 border-gold shadow-glow rotate-3">
                  <img src={mascota} alt="Mascota oficial del Prode" className="w-full h-auto" />
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}