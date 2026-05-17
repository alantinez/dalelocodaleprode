import { useEffect, useState } from "react";
import { PRODE_CONFIG } from "@/lib/prode/config";

function diff(target: Date) {
  const ms = Math.max(0, target.getTime() - Date.now());
  const d = Math.floor(ms / 86400000);
  const h = Math.floor((ms % 86400000) / 3600000);
  const m = Math.floor((ms % 3600000) / 60000);
  const s = Math.floor((ms % 60000) / 1000);
  return { d, h, m, s };
}

const pad = (n: number) => String(n).padStart(2, "0");

export function Countdown() {
  const [t, setT] = useState(() => diff(PRODE_CONFIG.worldCupStart));
  useEffect(() => {
    const id = setInterval(() => setT(diff(PRODE_CONFIG.worldCupStart)), 1000);
    return () => clearInterval(id);
  }, []);

  const items = [
    { label: "Días", value: t.d },
    { label: "Horas", value: pad(t.h) },
    { label: "Min", value: pad(t.m) },
    { label: "Seg", value: pad(t.s) },
  ];

  return (
    <div className="grid grid-cols-4 gap-2 sm:gap-3">
      {items.map((it) => (
        <div
          key={it.label}
          className="glass rounded-xl p-3 sm:p-4 text-center relative overflow-hidden"
        >
          <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-primary/60 to-transparent" />
          <div className="font-mono font-bold text-2xl sm:text-4xl text-gradient-hero tabular-nums">
            {it.value}
          </div>
          <div className="text-[10px] sm:text-xs uppercase tracking-widest text-muted-foreground mt-1">
            {it.label}
          </div>
        </div>
      ))}
    </div>
  );
}