import { useQuery } from "@tanstack/react-query";
import { Lock } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

type Achievement = {
  id: string;
  title: string;
  description: string;
  icon: string;
  tier: "bronze" | "silver" | "gold" | string;
  sort_order: number;
};

const tierStyles: Record<string, { card: string; bar: string }> = {
  gold:   { card: "from-gold/30 to-gold/5 border-gold/40 text-gold",               bar: "bg-gold" },
  silver: { card: "from-slate-300/25 to-slate-300/5 border-slate-300/30 text-slate-200", bar: "bg-slate-300" },
  bronze: { card: "from-amber-700/25 to-amber-700/5 border-amber-700/40 text-amber-400", bar: "bg-amber-500" },
};

export function AchievementsGrid({ userId }: { userId: string }) {
  const catalog = useQuery({
    queryKey: ["achievements"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("achievements")
        .select("id,title,description,icon,tier,sort_order")
        .order("sort_order");
      if (error) throw error;
      return data as Achievement[];
    },
  });

  const unlocked = useQuery({
    queryKey: ["user_achievements", userId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("user_achievements")
        .select("achievement_id")
        .eq("user_id", userId);
      if (error) throw error;
      return new Set((data ?? []).map((r: any) => r.achievement_id));
    },
  });

  const progressQ = useQuery({
    queryKey: ["achievement_progress", userId],
    queryFn: async () => {
      const { data, error } = await supabase.rpc("get_achievement_progress", { p_user_id: userId });
      if (error) throw error;
      return data as Record<string, { current: number; goal: number }>;
    },
  });

  const got = unlocked.data ?? new Set<string>();
  const progress = progressQ.data ?? {};

  return (
    <div>
      <div className="flex items-end justify-between mb-4">
        <div>
          <h2 className="font-display font-semibold text-lg">Logros</h2>
          <p className="text-xs text-muted-foreground">
            {got.size} / {catalog.data?.length ?? 0} desbloqueados
          </p>
        </div>
        {got.size > 0 && (
          <div className="text-xs font-mono text-muted-foreground">
            {Math.round((got.size / (catalog.data?.length ?? 1)) * 100)}% completado
          </div>
        )}
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
        {(catalog.data ?? []).map((a) => {
          const owned = got.has(a.id);
          const tier = tierStyles[a.tier] ?? tierStyles.bronze;
          const prog = progress[a.id];
          const pct = prog ? Math.round((prog.current / prog.goal) * 100) : 0;

          return (
            <div key={a.id}
              className={`relative rounded-2xl p-4 border bg-gradient-to-br transition group ${
                owned
                  ? `${tier.card} shadow-glow hover:-translate-y-0.5`
                  : "border-border/40 bg-card/40 text-muted-foreground"
              }`}
            >
              {/* Icono */}
              <div className={`text-3xl ${owned ? "" : "grayscale opacity-40"}`}>{a.icon}</div>

              {/* Título y descripción */}
              <div className={`font-display font-bold text-sm mt-2 leading-tight ${owned ? "" : "text-muted-foreground"}`}>
                {a.title}
              </div>
              <div className="text-[11px] mt-1 opacity-70 leading-snug">{a.description}</div>

              {/* Barra de progreso (solo si no desbloqueado y hay progreso) */}
              {!owned && prog && prog.goal > 1 && (
                <div className="mt-2.5">
                  <div className="h-1 rounded-full bg-border/40 overflow-hidden">
                    <div
                      className={`h-full rounded-full ${tier.bar} opacity-60 transition-all duration-700`}
                      style={{ width: `${pct}%` }}
                    />
                  </div>
                  <div className="text-[9px] font-mono text-muted-foreground mt-1 text-right">
                    {prog.current}/{prog.goal}
                  </div>
                </div>
              )}

              {/* Lock */}
              {!owned && <Lock className="absolute top-3 right-3 w-3.5 h-3.5 opacity-40" />}

              {/* Desbloqueado badge */}
              {owned && (
                <div className="absolute top-2 right-2 text-[9px] font-mono font-bold uppercase tracking-wider opacity-70">
                  ✓
                </div>
              )}
            </div>
          );
        })}

        {catalog.isLoading && Array.from({ length: 10 }).map((_, i) => (
          <div key={i} className="rounded-2xl h-32 bg-card/40 animate-pulse" />
        ))}
      </div>
    </div>
  );
}
