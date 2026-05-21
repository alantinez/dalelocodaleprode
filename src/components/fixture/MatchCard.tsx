import { useEffect, useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Minus, Plus, MapPin, Check, Loader2, Trophy, Lock } from "lucide-react";
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

function TeamInfo({ team }: { team: Team | null }) {
  return (
    <div className="flex flex-col items-center gap-2 w-24 sm:w-28">
      <div className="w-14 h-14 sm:w-16 sm:h-16 rounded-full overflow-hidden ring-2 ring-border/60 bg-card flex items-center justify-center flex-shrink-0">
        {team?.flag_url ? (
          <img src={team.flag_url} alt={team.name} className="w-full h-full object-cover" />
        ) : (
          <span className="font-mono text-xs">{team?.code ?? "?"}</span>
        )}
      </div>
      <div className="text-center">
        <div className="font-display font-semibold text-sm leading-tight">{team?.name ?? "—"}</div>
        <div className="font-mono text-[10px] text-muted-foreground tracking-widest mt-0.5">{team?.code}</div>
      </div>
    </div>
  );
}

function ScoreInput({
  score, onInc, onDec, disabled,
}: {
  score: number;
  onInc: () => void;
  onDec: () => void;
  disabled: boolean;
}) {
  return (
    <div className="flex items-center gap-2">
      <button
        type="button"
        onClick={onDec}
        disabled={disabled || score <= 0}
        className="w-11 h-11 rounded-xl glass hover:bg-card active:scale-95 disabled:opacity-30 disabled:cursor-not-allowed flex items-center justify-center transition touch-manipulation"
      >
        <Minus className="w-4 h-4" />
      </button>
      <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-primary/20 to-secondary/20 border border-primary/30 flex items-center justify-center font-mono font-bold text-2xl tabular-nums">
        {score}
      </div>
      <button
        type="button"
        onClick={onInc}
        disabled={disabled || score >= 20}
        className="w-11 h-11 rounded-xl glass hover:bg-card active:scale-95 disabled:opacity-30 disabled:cursor-not-allowed flex items-center justify-center transition touch-manipulation"
      >
        <Plus className="w-4 h-4" />
      </button>
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
  const { user, profile, isAdmin } = useAuth();
  const canPredict = isAdmin || (profile?.paid ?? false);
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
          { user_id: user.id, match_id: match.id, home_score: home, away_score: away },
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

      {/* Header */}
      <div className="flex items-center justify-between mb-4 text-xs text-muted-foreground">
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

      {/* Teams + Scores */}
      <div className="flex items-center justify-between gap-2">
        <TeamInfo team={match.home} />

        <div className="flex flex-col items-center gap-3 flex-1">
          {finished && (
            <div className="font-mono text-lg font-bold text-secondary">
              {match.home_score} - {match.away_score}
            </div>
          )}

          {!locked && canPredict && (
            <div className="flex items-center gap-2">
              <ScoreInput
                score={home}
                onInc={() => setHome((s) => Math.min(20, s + 1))}
                onDec={() => setHome((s) => Math.max(0, s - 1))}
                disabled={false}
              />
              <span className="font-bold text-muted-foreground/60 text-sm">-</span>
              <ScoreInput
                score={away}
                onInc={() => setAway((s) => Math.min(20, s + 1))}
                onDec={() => setAway((s) => Math.max(0, s - 1))}
                disabled={false}
              />
            </div>
          )}

          {!locked && !canPredict && (
            <div className="flex items-center gap-1.5 text-xs text-gold font-mono px-3 py-2 glass rounded-xl">
              <Lock className="w-3.5 h-3.5" /> Confirmá tu pago
            </div>
          )}

          {locked && !finished && (
            <div className="text-xs text-muted-foreground font-mono px-3 py-1.5 glass rounded-lg">
              {prediction ? `${prediction.home_score} - ${prediction.away_score}` : "Sin pronóstico"}
            </div>
          )}
        </div>

        <TeamInfo team={match.away} />
      </div>

      {/* Venue */}
      {match.venue && (
        <div className="mt-3 flex items-center gap-1.5 text-[11px] text-muted-foreground">
          <MapPin className="w-3 h-3 flex-shrink-0" />
          <span className="truncate">{match.venue}</span>
        </div>
      )}

      {/* Footer */}
      <div className="mt-4 flex items-center justify-between gap-3">
        <div className="text-xs text-muted-foreground">
          {prediction ? (
            finished ? (
              <span>
                Tu pron:{" "}
                <span className="font-mono text-foreground">
                  {prediction.home_score}-{prediction.away_score}
                </span>
                {" · "}
                <span className={`font-bold ${
                  prediction.is_exact ? "text-gold" : prediction.points > 0 ? "text-secondary" : "text-destructive"
                }`}>
                  +{prediction.points} pts
                </span>
              </span>
            ) : (
              <span className="inline-flex items-center gap-1 text-secondary">
                <Check className="w-3 h-3" /> Guardado
              </span>
            )
          ) : (
            <span>{locked ? "Sin pronóstico" : canPredict ? "Cargá tu pronóstico" : ""}</span>
          )}
        </div>

        {!locked && canPredict && (
          <button
            type="button"
            onClick={() => mutation.mutate()}
            disabled={!dirty || mutation.isPending}
            className="inline-flex items-center gap-1.5 rounded-xl bg-gradient-to-r from-primary to-secondary px-4 py-2.5 text-xs font-semibold text-background shadow-glow disabled:opacity-40 disabled:cursor-not-allowed active:scale-95 transition touch-manipulation min-w-[90px] justify-center"
          >
            {mutation.isPending ? (
              <Loader2 className="w-3.5 h-3.5 animate-spin" />
            ) : (
              <Check className="w-3.5 h-3.5" />
            )}
            {prediction ? "Actualizar" : "Predecir"}
          </button>
        )}
      </div>
    </div>
  );
}
