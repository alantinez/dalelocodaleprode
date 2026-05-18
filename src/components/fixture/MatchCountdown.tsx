import { useEffect, useState } from "react";
import { Lock, Radio } from "lucide-react";

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

  if (ms <= 0) {
    return (
      <div className="inline-flex items-center gap-1.5 text-xs font-mono uppercase tracking-widest text-destructive">
        <Lock className="w-3 h-3" />
        Cerrado
      </div>
    );
  }

  const d = Math.floor(ms / 86400000);
  const h = Math.floor((ms % 86400000) / 3600000);
  const m = Math.floor((ms % 3600000) / 60000);
  const s = Math.floor((ms % 60000) / 1000);
  const urgent = ms < 60 * 60 * 1000;

  return (
    <div
      className={`inline-flex items-center gap-1.5 text-xs font-mono tabular-nums ${
        urgent ? "text-destructive" : "text-secondary"
      }`}
    >
      <Radio className={`w-3 h-3 ${urgent ? "animate-pulse" : ""}`} />
      {d > 0 && <span>{d}d</span>}
      <span>
        {pad(h)}:{pad(m)}:{pad(s)}
      </span>
    </div>
  );
}