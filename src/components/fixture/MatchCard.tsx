import { useEffect, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Minus, Plus, MapPin, Check, Loader2, Trophy, Lock, ChevronDown, ChevronUp, Users, ExternalLink } from "lucide-react";
import { Link } from "@tanstack/react-router";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { MatchCountdown } from "./MatchCountdown";
import { formatKickoff } from "@/lib/prode/scoring";

export type Team = { id: string; name: string; code: string; flag_url: string | null; };
export type MatchWithTeams = {
  id: string; kickoff: string; stage: string; group: string | null;
  venue: string | null; status: string; home_score: number | null; away_score: number | null;
  home: Team | null; away: Team | null;
};
export type Prediction = {
  match_id: string; home_score: number; away_score: number; points: number; is_exact: boolean;
};

type RawPred = { user_id: string; home_score: number; away_score: number; points: number | null; is_exact: boolean | null; };
type ProfileMap = Map<string, { display_name: string; avatar_url: string | null }>;

function Flag({ team }: { team: Team | null }) {
  return (
    <div className="w-10 h-10 rounded-full overflow-hidden ring-2 ring-border/60 bg-card flex items-center justify-center flex-shrink-0">
      {team?.flag_url
        ? <img src={team.flag_url} alt={team?.name ?? ""} className="w-full h-full object-cover" />
        : <span className="font-mono text-xs">{team?.code ?? "?"}</span>}
    </div>
  );
}

function ScoreInput({ score, onInc, onDec, disabled }: { score: number; onInc: () => void; onDec: () => void; disabled: boolean; }) {
  return (
    <div className="flex items-center gap-1.5">
      <button type="button" onClick={onDec} disabled={disabled || score <= 0}
        className="w-9 h-9 sm:w-11 sm:h-11 rounded-xl glass hover:bg-card active:scale-95 disabled:opacity-30 disabled:cursor-not-allowed flex items-center justify-center transition touch-manipulation">
        <Minus className="w-3.5 h-3.5" />
      </button>
      <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-xl bg-gradient-to-br from-primary/20 to-secondary/20 border border-primary/30 flex items-center justify-center font-mono font-bold text-xl sm:text-2xl tabular-nums">
        {score}
      </div>
      <button type="button" onClick={onInc} disabled={disabled || score >= 20}
        className="w-9 h-9 sm:w-11 sm:h-11 rounded-xl glass hover:bg-card active:scale-95 disabled:opacity-30 disabled:cursor-not-allowed flex items-center justify-center transition touch-manipulation">
        <Plus className="w-3.5 h-3.5" />
      </button>
    </div>
  );
}

function AllPredictions({ matchId, finished }: { matchId: string; finished: boolean }) {
  const [open, setOpen] = useState(false);

  const { data, isLoading } = useQuery({
    queryKey: ["all-predictions", matchId],
    enabled: open,
    queryFn: async () => {
      const { data: preds, error } = await supabase
        .from("predictions")
        .select("user_id, home_score, away_score, points, is_exact")
        .eq("match_id", matchId)
        .order("points", { ascending: false, nullsFirst: false });
      if (error) throw error;
      if (!preds || preds.length === 0) return [];

      const userIds = preds.map((p: RawPred) => p.user_id);
      const { data: profiles } = await supabase
        .from("profiles")
        .select("id, display_name, avatar_url")
        .in("id", userIds);

      const profileMap: ProfileMap = new Map(
        (profiles ?? []).map((p: any) => [p.id, { display_name: p.display_name, avatar_url: p.avatar_url }])
      );

      return (preds as RawPred[]).map((p) => ({ ...p, profile: profileMap.get(p.user_id) ?? null }));
    },
  });

  return (
    <div className="mt-3 border-t border-border/40 pt-3">
      <div className="flex items-center justify-between">
        <button type="button" onClick={() => setOpen((v) => !v)}
          className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition">
          <Users className="w-3.5 h-3.5" /> Ver pronósticos
          {open ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
        </button>
        <Link to="/partido/$matchId" params={{ matchId }}
          className="inline-flex items-center gap-1 text-xs text-primary hover:text-primary/80 transition font-medium">
          Ver todo <ExternalLink className="w-3 h-3" />
        </Link>
      </div>

      {open && (
        <div className="mt-2 space-y-1.5">
          {isLoading ? (
            <div className="flex justify-center py-3"><Loader2 className="w-4 h-4 animate-spin text-muted-foreground" /></div>
          ) : !data || data.length === 0 ? (
            <p className="text-xs text-muted-foreground text-center py-2">Nadie predijo este partido.</p>
          ) : (
            data.slice(0, 5).map((p, i) => {
              const initials = p.profile?.display_name?.split(" ").map((s: string) => s[0]).slice(0, 2).join("").toUpperCase() ?? "?";
              const pts = p.points;
              const ptsColor = pts === null ? "text-muted-foreground" : p.is_exact ? "text-gold" : pts > 0 ? "text-secondary" : "text-destructive";
              return (
                <div key={i} className="flex items-center gap-2 px-2 py-1.5 rounded-lg glass">
                  <div className="w-6 h-6 rounded-full bg-gradient-to-br from-primary to-secondary flex items-center justify-center overflow-hidden flex-shrink-0">
                    {p.profile?.avatar_url
                      ? <img src={p.profile.avatar_url} alt="" className="w-full h-full object-cover" />
                      : <span className="text-[8px] font-bold text-background">{initials}</span>}
                  </div>
                  <span className="text-xs font-medium truncate flex-1">{p.profile?.display_name ?? "—"}</span>
                  <span className="font-mono text-xs text-foreground font-bold">{p.home_score}-{p.away_score}</span>
                  {finished && pts !== null && (
                    <span className={`font-mono text-xs font-bold ${ptsColor} w-12 text-right`}>
                      {p.is_exact ? "⭐" : ""} +{pts}pts
                    </span>
                  )}
                </div>
              );
            })
          )}
          {(data?.length ?? 0) > 5 && (
            <Link to="/partido/$matchId" params={{ matchId }}
              className="block text-center text-xs text-primary hover:text-primary/80 transition py-1">
              Ver los {data!.length} pronósticos →
            </Link>
          )}
        </div>
      )}
    </div>
  );
}

export function MatchCard({ match, prediction }: { match: MatchWithTeams; prediction: Prediction | null }) {
  const { user, profile, isAdmin } = useAuth();
  const canPredict = isAdmin || (profile?.paid ?? false);
  const queryClient = useQueryClient();
  const kickoff = new Date(match.kickoff);
  const [locked, setLocked] = useState(() => Date.now() >= kickoff.getTime());
  const [home, setHome] = useState(prediction?.home_score ?? 0);
  const [away, setAway] = useState(prediction?.away_score ?? 0);
  const finished = match.status === "finished" && match.home_score !== null;
  const inProgress = locked && !finished;

  useEffect(() => {
    setHome(prediction?.home_score ?? 0);
    setAway(prediction?.away_score ?? 0);
  }, [prediction?.home_score, prediction?.away_score]);

  useEffect(() => {
    if (locked) return;
    const id = setInterval(() => {
      if (Date.now() >= kickoff.getTime()) { setLocked(true); clearInterval(id); }
    }, 1000);
    return () => clearInterval(id);
  }, [locked, kickoff]);

  const dirty = !prediction || prediction.home_score !== home || prediction.away_score !== away;

  const mutation = useMutation({
    mutationFn: async () => {
      if (!user) throw new Error("No autenticado");
      const { error } = await supabase.from("predictions")
        .upsert({ user_id: user.id, match_id: match.id, home_score: home, away_score: away }, { onConflict: "user_id,match_id" });
      if (error) throw error;
    },
    onSuccess: () => { toast.success("Pronóstico guardado"); queryClient.invalidateQueries({ queryKey: ["predictions"] }); },
    onError: (e: Error) => toast.error(e.message),
  });

  const liveSearchUrl = `https://www.google.com/search?q=${encodeURIComponent(
    (match.home?.name ?? '') + ' vs ' + (match.away?.name ?? '') + ' live score'
  )}`;

  return (
    <div className={`glass rounded-2xl p-4 sm:p-5 relative overflow-hidden ${inProgress ? "ring-1 ring-destructive/30" : ""}`}>
      <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-primary/40 to-transparent" />

      {/* Header */}
      <div className="flex items-center justify-between mb-4 text-xs text-muted-foreground">
        <div className="flex items-center gap-2 min-w-0">
          {match.group && (
            <span className="px-2 py-0.5 rounded-md bg-primary/15 text-primary font-mono font-bold flex-shrink-0">Grupo {match.group}</span>
          )}
          <span className="font-mono truncate">{formatKickoff(kickoff)}</span>
        </div>
        {finished
          ? <div className="inline-flex items-center gap-1.5 text-xs font-mono text-secondary flex-shrink-0"><Trophy className="w-3 h-3" /> Final</div>
          : inProgress
          ? <div className="inline-flex items-center gap-1.5 text-xs font-mono text-destructive flex-shrink-0 animate-pulse">
              <span className="w-1.5 h-1.5 rounded-full bg-destructive inline-block" />EN VIVO
            </div>
          : <div className="flex-shrink-0"><MatchCountdown kickoff={kickoff} /></div>}
      </div>

      {/* Teams */}
      <div className="flex items-center gap-2 mb-4">
        <div className="flex items-center gap-2 flex-1 min-w-0">
          <Flag team={match.home} />
          <div className="min-w-0">
            <div className="font-display font-semibold text-sm leading-tight truncate">{match.home?.name ?? "—"}</div>
            <div className="font-mono text-[10px] text-muted-foreground tracking-widest">{match.home?.code}</div>
          </div>
        </div>
        {finished
          ? <div className="font-mono text-lg font-bold text-secondary flex-shrink-0 px-2">{match.home_score}–{match.away_score}</div>
          : <span className="text-muted-foreground/50 text-xs font-mono flex-shrink-0">vs</span>}
        <div className="flex items-center gap-2 flex-1 min-w-0 justify-end">
          <div className="min-w-0 text-right">
            <div className="font-display font-semibold text-sm leading-tight truncate">{match.away?.name ?? "—"}</div>
            <div className="font-mono text-[10px] text-muted-foreground tracking-widest">{match.away?.code}</div>
          </div>
          <Flag team={match.away} />
        </div>
      </div>

      {/* Score inputs */}
      {!locked && canPredict && (
        <div className="flex items-center justify-center gap-3 mb-4">
          <ScoreInput score={home} onInc={() => setHome((s) => Math.min(20, s + 1))} onDec={() => setHome((s) => Math.max(0, s - 1))} disabled={false} />
          <span className="font-bold text-muted-foreground/60 text-sm">-</span>
          <ScoreInput score={away} onInc={() => setAway((s) => Math.min(20, s + 1))} onDec={() => setAway((s) => Math.max(0, s - 1))} disabled={false} />
        </div>
      )}
      {!locked && !canPredict && (
        <div className="flex items-center justify-center gap-1.5 text-xs text-gold font-mono px-3 py-2 glass rounded-xl mb-4 w-fit mx-auto">
          <Lock className="w-3.5 h-3.5" /> Confirmá tu pago
        </div>
      )}

      {/* En progreso: pron + link en vivo */}
      {inProgress && (
        <div className="flex flex-col items-center gap-2 mb-4">
          <div className="text-xs text-muted-foreground font-mono px-3 py-1.5 glass rounded-lg">
            {prediction ? `Tu pron: ${prediction.home_score} - ${prediction.away_score}` : "Sin pronóstico"}
          </div>
          <a
            href={liveSearchUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1.5 text-[11px] font-mono font-bold text-destructive hover:text-destructive/80 transition"
          >
            <span className="w-2 h-2 rounded-full bg-destructive inline-block animate-ping absolute" />
            <span className="w-2 h-2 rounded-full bg-destructive inline-block relative" />
            🔴 Ver marcador en vivo →
          </a>
        </div>
      )}

      {match.venue && (
        <div className="flex items-center gap-1.5 text-[11px] text-muted-foreground mb-3">
          <MapPin className="w-3 h-3 flex-shrink-0" /><span className="truncate">{match.venue}</span>
        </div>
      )}

      <div className="flex items-center justify-between gap-3">
        <div className="text-xs text-muted-foreground min-w-0">
          {prediction ? (
            finished ? (
              <span>
                Tu pron: <span className="font-mono text-foreground">{prediction.home_score}-{prediction.away_score}</span>
                {" · "}
                <span className={`font-bold ${prediction.is_exact ? "text-gold" : prediction.points > 0 ? "text-secondary" : "text-destructive"}`}>
                  +{prediction.points} pts
                </span>
              </span>
            ) : (
              <span className="inline-flex items-center gap-1 text-secondary"><Check className="w-3 h-3" /> Guardado</span>
            )
          ) : (
            <span>{locked ? "" : canPredict ? "Cargá tu pronóstico" : ""}</span>
          )}
        </div>
        {!locked && canPredict && (
          <button type="button" onClick={() => mutation.mutate()} disabled={!dirty || mutation.isPending}
            className="inline-flex items-center gap-1.5 rounded-xl bg-gradient-to-r from-primary to-secondary px-4 py-2.5 text-xs font-semibold text-background shadow-glow disabled:opacity-40 disabled:cursor-not-allowed active:scale-95 transition touch-manipulation min-w-[90px] justify-center flex-shrink-0">
            {mutation.isPending ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Check className="w-3.5 h-3.5" />}
            {prediction ? "Actualizar" : "Predecir"}
          </button>
        )}
      </div>

      {locked && <AllPredictions matchId={match.id} finished={finished} />}
    </div>
  );
}
