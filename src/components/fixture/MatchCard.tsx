import { useEffect, useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Minus, Plus, MapPin, Check, Loader2, Trophy } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { MatchCountdown } from "./MatchCountdown";
import { formatKickoff } from "@/lib/prode/scoring";

export type Team = {
  id: string;
  name: string;
  code: string;
  flag_url: string | null;
};

export type MatchWithTeams = {
  id: string;
  kickoff: string;
  stage: string;
  group: string | null;
  venue: string | null;
  status: string;
  home_score: number | null;
  away_score: number | null;
  home: Team | null;
  away: Team | null;
};

export type Prediction = {
  match_id: string;
  home_score: number;
  away_score: number;
  points: number;
  is_exact: boolean;
};

function TeamSide({ team, score, onInc, onDec, locked }: {
  team: Team | null;
  score: number;
  onInc: () => void;
  onDec: () => void;
  locked: boolean;
}) {
  return (
    <div className="flex-1 flex flex-col items-center gap-2.5">
      <div className="w-12 h-12 sm:w-14 sm:h-14 rounded-full overflow-hidden ring-2 ring-border/60 bg-card flex items-center justify-center">
        {team?.flag_url ? (
          <img src={team.flag_url} alt={team.name} className="w-full h-full object-cover" />
        ) : (
          <span className="font-mono text-xs">{team?.code ?? "?"}</span>
        )}
      </div>
      <div className="text-center">
        <div className="font-display font-semibold text-sm leading-tight">{team?.name ?? "—"}</div>
        <div className="font-mono text-[10px] text-muted-foreground tracking-widest">{team?.code}</div>
      </div>
      <div className="flex items-center gap-1.5">
        <button
          type="button"
          onClick={onDec}
          disabled={locked || score <= 0}
          className="w-7 h-7 rounded-md glass hover:bg-card disabled:opacity-30 disabled:cursor-not-allowed flex items-center justify-center"
        >
          <Minus className="w-3.5 h-3.5" />
        </button>
        <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-primary/20 to-secondary/20 border border-primary/30 flex items-center justify-center font-mono font-bold text-xl tabular-nums">
          {score}
        </div>
        <button
          type="button"
          onClick={onInc}
          disabled={locked || score >= 20}
          className="w-7 h-7 rounded-md glass hover:bg-card disabled:opacity-30 disabled:cursor-not-allowed flex items-center justify-center"
        >
          <Plus className="w-3.5 h-3.5" />
        </button>
      </div>
    </div>
  );
}

export function MatchCard({
  match,
  prediction,
}: {
  match: MatchWithTeams;
  prediction: Prediction | null;
}) {
const { user, profile } = useAuth();
const canPredict = profile?.paid ?? false;
  const queryClient = useQueryClient();
  const kickoff = new Date(match.kickoff);
  const [locked, setLocked] = useState(() => Date.now() >= kickoff.getTime());
  const [home, setHome] = useState(prediction?.home_score ?? 0);
  const [away, setAway] = useState(prediction?.away_score ?? 0);
  const finished = match.status === "finished" && match.home_score !== null;

  useEffect(() => {
    setHome(prediction?.home_score ?? 0);
    setAway(prediction?.away_score ?? 0);
  }, [prediction?.home_score, prediction?.away_score]);

  useEffect(() => {
    if (locked) return;
    const id = setInterval(() => {
      if (Date.now() >= kickoff.getTime()) {
        setLocked(true);
        clearInterval(id);
      }
    }, 1000);
    return () => clearInterval(id);
  }, [locked, kickoff]);

  const dirty =
    !prediction ||
    prediction.home_score !== home ||
    prediction.away_score !== away;

  const mutation = useMutation({
    mutationFn: async () => {
      if (!user) throw new Error("No autenticado");
      const { error } = await supabase
        .from("predictions")
        .upsert(
          {
            user_id: user.id,
            match_id: match.id,
            home_score: home,
            away_score: away,
          },
          { onConflict: "user_id,match_id" },
        );
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Pronóstico guardado");
      queryClient.invalidateQueries({ queryKey: ["predictions"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  return (
    <div className="glass rounded-2xl p-4 sm:p-5 relative overflow-hidden">
      <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-primary/40 to-transparent" />

      <div className="flex items-center justify-between mb-3 text-xs text-muted-foreground">
        <div className="flex items-center gap-2">
          {match.group && (
            <span className="px-2 py-0.5 rounded-md bg-primary/15 text-primary font-mono font-bold">
              Grupo {match.group}
            </span>
          )}
          <span className="font-mono">{formatKickoff(kickoff)}</span>
        </div>
        {finished ? (
          <div className="inline-flex items-center gap-1.5 text-xs font-mono text-secondary">
            <Trophy className="w-3 h-3" /> Final
          </div>
        ) : (
          <MatchCountdown kickoff={kickoff} />
        )}
      </div>

      <div className="flex items-stretch gap-2 sm:gap-4">
        <TeamSide
          team={match.home}
          score={home}
          onInc={() => setHome((s) => Math.min(20, s + 1))}
          onDec={() => setHome((s) => Math.max(0, s - 1))}
          locked={locked}
        />
        <div className="flex flex-col items-center justify-center px-1">
          <div className="font-display font-bold text-muted-foreground/60 text-sm">VS</div>
          {finished && (
            <div className="mt-2 font-mono text-xs text-secondary">
              {match.home_score} - {match.away_score}
            </div>
          )}
        </div>
        <TeamSide
          team={match.away}
          score={away}
          onInc={() => setAway((s) => Math.min(20, s + 1))}
          onDec={() => setAway((s) => Math.max(0, s - 1))}
          locked={locked}
        />
      </div>

      {match.venue && (
        <div className="mt-3 flex items-center gap-1.5 text-[11px] text-muted-foreground">
          <MapPin className="w-3 h-3" />
          <span className="truncate">{match.venue}</span>
        </div>
      )}

      <div className="mt-4 flex items-center justify-between gap-3">
        <div className="text-xs text-muted-foreground">
          {prediction ? (
            finished ? (
              <span>
                Pronóstico:{" "}
                <span className="font-mono text-foreground">
                  {prediction.home_score}-{prediction.away_score}
                </span>
                {" · "}
                <span
                  className={`font-bold ${
                    prediction.is_exact
                      ? "text-gold"
                      : prediction.points > 0
                        ? "text-secondary"
                        : "text-destructive"
                  }`}
                >
                  +{prediction.points} pts
                </span>
              </span>
            ) : (
              <span className="inline-flex items-center gap-1 text-secondary">
                <Check className="w-3 h-3" /> Pronóstico guardado
              </span>
            )
          ) : (
            <span>Sin pronóstico</span>
          )}
        </div>
        <button
          type="button"
          onClick={() => mutation.mutate()}
          disabled={locked || !dirty || mutation.isPending}
          className="inline-flex items-center gap-1.5 rounded-lg bg-gradient-to-r from-primary to-secondary px-3.5 py-1.5 text-xs font-semibold text-background shadow-glow disabled:opacity-40 disabled:cursor-not-allowed hover:scale-[1.03] transition"
        >
          {mutation.isPending ? (
            <Loader2 className="w-3.5 h-3.5 animate-spin" />
          ) : (
            <Check className="w-3.5 h-3.5" />
          )}
          {prediction ? "Actualizar" : "Predecir"}
        </button>
      </div>
    </div>
  );
}
