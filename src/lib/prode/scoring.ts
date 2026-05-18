// Sistema de puntaje del PRODE
// - Resultado exacto: 5 pts
// - Acierta ganador o empate (diferencia correcta): 3 pts
// - Acierta solo el signo (ganador/empate): 2 pts
// - Nada: 0 pts

export type ScoreLike = { home: number; away: number };

export function scorePrediction(pred: ScoreLike, real: ScoreLike) {
  if (pred.home === real.home && pred.away === real.away) {
    return { points: 5, exact: true };
  }
  const predDiff = pred.home - pred.away;
  const realDiff = real.home - real.away;
  if (predDiff === realDiff) return { points: 3, exact: false };
  const sign = (n: number) => (n > 0 ? 1 : n < 0 ? -1 : 0);
  if (sign(predDiff) === sign(realDiff)) return { points: 2, exact: false };
  return { points: 0, exact: false };
}

export function formatKickoff(d: Date) {
  return new Intl.DateTimeFormat("es-AR", {
    weekday: "short",
    day: "2-digit",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  }).format(d);
}

export function dayKey(d: Date) {
  return new Intl.DateTimeFormat("es-AR", {
    weekday: "long",
    day: "2-digit",
    month: "long",
  }).format(d);
}