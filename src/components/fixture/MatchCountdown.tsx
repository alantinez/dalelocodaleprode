import { useEffect, useState } from "react";
import { Lock } from "lucide-react";

function diff(target: Date) {
  return Math.max(0, target.getTime() - Date.now());
}
const pad = (n: number) => String(n).padStart(2, "0");

export function MatchCountdown({ kickoff }: { kickoff: Date }) {
  const [ms, setMs] = useState(() => diff(kickoff));

  useEffect(() => {
    const id = setInterval(() => setMs(diff(kickoff)), 1000);
    return () => clearInterval(id);
  }, [kickoff]);

  // --- Partido en juego o cerrado ---
  if (ms <= 0) {
    return (
      <div className="inline-flex items-center gap-1.5 text-xs font-mono uppercase tracking-widest text-destructive">
        <span className="relative flex h-2 w-2">
          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-destructive opacity-75" />
          <span className="relative inline-flex rounded-full h-2 w-2 bg-destructive" />
        </span>
        En juego
      </div>
    );
  }

  const days = Math.floor(ms / 86_400_000);
  const hours = Math.floor((ms % 86_400_000) / 3_600_000);
  const mins = Math.floor((ms % 3_600_000) / 60_000);
  const secs = Math.floor((ms % 60_000) / 1_000);

  // Urgencia: <1hs rojo, <24hs naranja, resto verde
  const critical = ms < 60 * 60 * 1_000;          // < 1 hora
  const warning  = ms < 24 * 60 * 60 * 1_000;     // < 24 horas

  const colorClass = critical
    ? "text-destructive bg-destructive/10 border-destructive/30"
    : warning
    ? "text-orange-400 bg-orange-400/10 border-orange-400/30"
    : "text-secondary bg-secondary/10 border-secondary/30";

  // Formato dinámico según distancia
  let timeStr: string;
  if (days >= 2) {
    timeStr = `${days}d ${pad(hours)}hs`;
  } else if (days === 1) {
    timeStr = `1d ${pad(hours)}hs`;
  } else if (hours >= 1) {
    timeStr = `${pad(hours)}h ${pad(mins)}m`;
  } else {
    timeStr = `${pad(mins)}m ${pad(secs)}s`;
  }

  return (
    <div
      className={`inline-flex items-center gap-1.5 text-xs font-mono tabular-nums px-2 py-0.5 rounded-full border ${colorClass} transition-colors`}
    >
      {critical ? (
        <span className="relative flex h-1.5 w-1.5">
          <span className="animate-ping absolute inline-flex h-full w-full rounded-full opacity-75 bg-current" />
          <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-current" />
        </span>
      ) : (
        <Lock className="w-2.5 h-2.5 opacity-60" />
      )}
      <span>{timeStr}</span>
    </div>
  );
}
