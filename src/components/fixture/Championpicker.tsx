import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Trophy, Lock, Check, Loader2, Search } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";

const LOCK_DATE = new Date("2026-06-11T20:00:00-03:00");

type Team = {
  id: string;
  name: string;
  code: string;
  flag_url: string | null;
  group: string | null;
};

type ChampionPrediction = {
  team_id: string;
  points: number;
  is_correct: boolean;
};

export function ChampionPicker() {
  const { user, profile, isAdmin } = useAuth();
  const qc = useQueryClient();
  const [search, setSearch] = useState("");
  const [open, setOpen] = useState(false);
  const locked = new Date() >= LOCK_DATE;
  const canPredict = isAdmin || (profile?.paid ?? false);

  const teamsQ = useQuery({
    queryKey: ["teams-all"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("teams")
        .select("id, name, code, flag_url, group")
        .order("group")
        .order("name");
      if (error) throw error;
      return data as Team[];
    },
  });

  const predQ = useQuery({
    queryKey: ["champion-pred", user?.id],
    enabled: !!user,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("champion_predictions")
        .select("team_id, points, is_correct")
        .eq("user_id", user!.id)
        .maybeSingle();
      if (error) throw error;
      return data as ChampionPrediction | null;
    },
  });

  const saveMut = useMutation({
    mutationFn: async (teamId: string) => {
      if (!user) throw new Error("No autenticado");
      const { error } = await supabase
        .from("champion_predictions")
        .upsert({ user_id: user.id, team_id: teamId }, { onConflict: "user_id" });
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("¡Campeón guardado! 🏆");
      qc.invalidateQueries({ queryKey: ["champion-pred", user?.id] });
      setOpen(false);
      setSearch("");
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const teams = teamsQ.data ?? [];
  const currentTeam = teams.find((t) => t.id === predQ.data?.team_id);
  const filtered = teams.filter(
    (t) =>
      search === "" ||
      t.name.toLowerCase().includes(search.toLowerCase()) ||
      t.code.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="glass-strong rounded-2xl p-5 sm:p-6 mb-6 relative overflow-hidden">
      <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-gold/60 to-transparent" />
      <div className="absolute -inset-px rounded-2xl bg-gradient-to-br from-gold/10 via-transparent to-primary/10 pointer-events-none" />

      <div className="flex items-center gap-2 text-xs font-mono uppercase tracking-widest text-gold mb-3">
        <Trophy className="w-4 h-4" />
        El Gran Pronóstico · Vale 10 pts
      </div>

      <div className="flex flex-col sm:flex-row sm:items-center gap-4">
        <div className="flex-1">
          <h3 className="font-display font-bold text-xl sm:text-2xl">
            ¿Quién va a ganar el Mundial?
          </h3>
          <p className="text-sm text-muted-foreground mt-0.5">
            {locked
              ? "El torneo arrancó — predicción cerrada"
              : "Se bloquea el 11 Jun cuando arranca el primer partido"}
          </p>
        </div>

        {/* Selección actual o botón */}
        {currentTeam ? (
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2.5 glass rounded-xl px-4 py-2.5">
              {currentTeam.flag_url && (
                <img src={currentTeam.flag_url} alt="" className="w-8 h-8 rounded-md object-cover" />
              )}
              <div>
                <div className="font-display font-bold text-sm">{currentTeam.name}</div>
                <div className="font-mono text-[10px] text-muted-foreground">{currentTeam.code}</div>
              </div>
              {predQ.data?.is_correct && (
                <span className="text-gold text-sm">✅ +10 pts</span>
              )}
            </div>
            {!locked && canPredict && (
              <button
                onClick={() => setOpen(true)}
                className="text-xs text-muted-foreground hover:text-foreground transition underline"
              >
                Cambiar
              </button>
            )}
          </div>
        ) : !locked && canPredict ? (
          <button
            onClick={() => setOpen(true)}
            className="inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-gold/80 to-primary px-5 py-3 text-sm font-semibold text-background shadow-glow hover:scale-[1.02] transition"
          >
            <Trophy className="w-4 h-4" />
            Elegir campeón
          </button>
        ) : locked ? (
          <div className="inline-flex items-center gap-2 glass rounded-xl px-4 py-2.5 text-sm text-muted-foreground">
            <Lock className="w-4 h-4" /> Sin predicción
          </div>
        ) : (
          <div className="inline-flex items-center gap-2 glass rounded-xl px-4 py-2.5 text-sm text-muted-foreground">
            <Lock className="w-4 h-4" /> Confirmá tu pago para predecir
          </div>
        )}
      </div>

      {/* Modal selector */}
      {open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center px-4 bg-background/80 backdrop-blur-sm">
          <div className="glass-strong rounded-2xl w-full max-w-md p-5 max-h-[80vh] flex flex-col">
            <div className="flex items-center justify-between mb-4">
              <h4 className="font-display font-bold text-lg">Elegí tu campeón</h4>
              <button
                onClick={() => { setOpen(false); setSearch(""); }}
                className="text-muted-foreground hover:text-foreground transition text-sm"
              >
                Cancelar
              </button>
            </div>

            <div className="relative mb-3">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <input
                autoFocus
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Buscar equipo..."
                className="w-full glass rounded-xl pl-9 pr-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary/40"
              />
            </div>

            <div className="overflow-y-auto flex-1 space-y-1 pr-1">
              {filtered.map((team) => {
                const isSelected = team.id === predQ.data?.team_id;
                return (
                  <button
                    key={team.id}
                    onClick={() => saveMut.mutate(team.id)}
                    disabled={saveMut.isPending}
                    className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-left transition active:scale-95 ${
                      isSelected
                        ? "bg-primary/20 ring-1 ring-primary"
                        : "hover:bg-card"
                    }`}
                  >
                    {team.flag_url ? (
                      <img src={team.flag_url} alt="" className="w-8 h-8 rounded-md object-cover flex-shrink-0" />
                    ) : (
                      <div className="w-8 h-8 rounded-md bg-card flex items-center justify-center text-xs font-mono flex-shrink-0">
                        {team.code}
                      </div>
                    )}
                    <div className="flex-1 min-w-0">
                      <div className="font-medium text-sm truncate">{team.name}</div>
                      <div className="text-[10px] font-mono text-muted-foreground">
                        Grupo {team.group} · {team.code}
                      </div>
                    </div>
                    {isSelected && <Check className="w-4 h-4 text-primary flex-shrink-0" />}
                    {saveMut.isPending && <Loader2 className="w-4 h-4 animate-spin flex-shrink-0" />}
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}