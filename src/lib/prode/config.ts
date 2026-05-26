export const PRODE_CONFIG = {
  name: "PRODE MUNDIAL 2026",
  entryFee: 30000,
  currency: "ARS",
  participants: 24,  
  

  prizes: [
    { position: 1, label: "1er puesto", percent: 60, medal: "gold" as const },
    { position: 2, label: "2do puesto", percent: 30, medal: "silver" as const },
    { position: 3, label: "3er puesto", percent: 10, medal: "bronze" as const },
  ],
  // Inauguración estimada Mundial 2026
  worldCupStart: new Date("2026-06-11T20:00:00-03:00"),
};

export const formatARS = (n: number) =>
  new Intl.NumberFormat("es-AR", {
    style: "currency",
    currency: "ARS",
    maximumFractionDigits: 0,
  }).format(n);

export const totalPot = () => PRODE_CONFIG.entryFee * PRODE_CONFIG.participants;
export const prizeFor = (percent: number) => Math.round((totalPot() * percent) / 100);
