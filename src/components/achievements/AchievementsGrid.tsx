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

const tierStyles: Record<string, string> = {
  gold: "from-gold/30 to-gold/5 border-gold/40 text-gold",
  silver: "from-slate-300/25 to-slate-300/5 border-slate-300/30 text-slate-200",
  bronze: "from-amber-700/25 to-amber-700/5 border-amber-700/40 text-amber-400",
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
      return new Set((data ?? []).map((r) => r.achievement_id));
    },
  });

  const got = unlocked.data ?? new Set<string>();

  return (
    <div>
      <div className="flex items-end justify-between mb-4">
        <div>
          <h2 className="font-display font-semibold text-lg">Logros</h2>
          <p className="text-xs text-muted-foreground">
            {got.size} / {catalog.data?.length ?? 0} desbloqueados
          </p>
        </div>
      </div>
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
        {(catalog.data ?? []).map((a) => {
          const owned = got.has(a.id);
          const tier = tierStyles[a.tier] ?? tierStyles.bronze;
          return (
            <div
              key={a.id}
              className={`relative rounded-2xl p-4 border bg-gradient-to-br transition group ${
                owned
                  ? `${tier} shadow-glow hover:-translate-y-0.5`
                  : "border-border/40 bg-card/40 text-muted-foreground"
              }`}
            >
              <div className={`text-3xl ${owned ? "animate-float" : "grayscale opacity-50"}`}>
                {a.icon}
              </div>
              <div className="font-display font-bold text-sm mt-2 leading-tight">{a.title}</div>
              <div className="text-[11px] mt-1 opacity-80 leading-snug">{a.description}</div>
              {!owned && (
                <Lock className="absolute top-3 right-3 w-3.5 h-3.5 opacity-50" />
              )}
            </div>
          );
        })}
        {catalog.isLoading &&
          Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="rounded-2xl h-32 bg-card/40 animate-pulse" />
          ))}
      </div>
    </div>
  );
}