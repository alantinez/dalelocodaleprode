import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { ArrowLeft, Trophy, Loader2, Users } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Navbar } from "@/components/landing/Navbar";

export const Route = createFileRoute("/_authenticated/campeones")({
  head: () => ({ meta: [{ title: "Campeones elegidos · Dale Dale" }] }),
  component: CampeonesPage,
});

type ChampionPick = {
  user_id: string;
  is_correct: boolean;
  points: number;
  profiles: { display_name: string; avatar_url: string | null } | null;
  teams: { id: string; name: string; code: string; flag_url: string | null; group: string } | null;
};

type TeamGroup = {
  team: ChampionPick["teams"];
  picks: ChampionPick[];
  isCorrect: boolean;
};

function Avatar({ profile }: { profile: ChampionPick["profiles"] }) {
  const initials = profile?.display_name?.split(" ").map((s) => s[0]).slice(0, 2).join("").toUpperCase() ?? "?";
  return (
    <div className="w-9 h-9 rounded-full bg-gradient-to-br from-primary to-secondary flex items-center justify-center overflow-hidden ring-2 ring-background flex-shrink-0" title={profile?.display_name ?? ""}>
      {profile?.avatar_url
        ? <img src={profile.avatar_url} alt="" className="w-full h-full object-cover" />
        : <span className="text-[10px] font-bold text-background">{initials}</span>}
    </div>
  );
}

function CampeonesPage() {
  const q = useQuery({
    queryKey: ["champion-picks-all"],
    queryFn: async () => {
  const { data, error } = await supabase.rpc("get_champion_picks");
  if (error) throw error;
  return (data ?? []).map((row: any) => ({
    user_id: row.user_id,
    is_correct: row.is_correct,
    points: row.points,
    profiles: { display_name: row.display_name, avatar_url: row.avatar_url },
    teams: { id: row.team_id, name: row.team_name, code: row.team_code, flag_url: row.team_flag_url, group: row.team_group },
  })) as unknown as ChampionPick[];
},

  const picks = q.data ?? [];

  // Agrupar por equipo
  const grouped = picks.reduce<Map<string, TeamGroup>>((map, pick) => {
    const teamId = pick.teams?.id ?? "unknown";
    if (!map.has(teamId)) {
      map.set(teamId, { team: pick.teams, picks: [], isCorrect: pick.is_correct });
    }
    map.get(teamId)!.picks.push(pick);
    if (pick.is_correct) map.get(teamId)!.isCorrect = true;
    return map;
  }, new Map());

  const teamGroups = [...grouped.values()].sort((a, b) => b.picks.length - a.picks.length);

  // Estadísticas
  const total = picks.length;
  const topTeam = teamGroups[0];
  const correctTeam = teamGroups.find((g) => g.isCorrect);
  const uniqueTeams = teamGroups.length;

  // Participantes sin pronóstico
  const withPick = new Set(picks.map((p) => p.user_id));

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <main className="mx-auto max-w-4xl px-4 sm:px-6 pt-28 pb-20">

        <Link to="/ranking" className="inline-flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition mb-6">
          <ArrowLeft className="w-3.5 h-3.5" /> Volver al ranking
        </Link>

        <div className="flex items-center gap-3 mb-2">
          <Trophy className="w-5 h-5 text-gold" />
          <span className="font-mono text-xs uppercase tracking-widest text-gold">Gran pronóstico</span>
        </div>
        <h1 className="font-display text-4xl sm:text-5xl font-bold tracking-tight mb-2">
          ¿Quién va a <span className="text-gradient-hero">ganar</span>?
        </h1>
        <p className="text-muted-foreground mb-8">Los campeones elegidos por cada participante. Vale 10 puntos si acertás.</p>

        {q.isLoading ? (
          <div className="flex justify-center py-20"><Loader2 className="w-6 h-6 animate-spin text-primary" /></div>
        ) : total === 0 ? (
          <div className="glass-strong rounded-3xl p-14 text-center">
            <Trophy className="w-12 h-12 text-muted-foreground mx-auto mb-4 opacity-30" />
            <h3 className="font-display font-bold text-xl mb-2">Nadie eligió todavía</h3>
            <p className="text-sm text-muted-foreground">Los pronósticos aparecerán acá cuando los participantes elijan su campeón.</p>
          </div>
        ) : (
          <>
            {/* Stats */}
            <div className="grid grid-cols-3 gap-3 mb-8">
              <div className="glass rounded-2xl p-4 text-center">
                <div className="font-display font-bold text-2xl sm:text-3xl text-primary">{total}</div>
                <div className="text-[10px] font-mono uppercase tracking-widest text-muted-foreground mt-1">Eligieron</div>
              </div>
              <div className="glass rounded-2xl p-4 text-center">
                <div className="font-display font-bold text-2xl sm:text-3xl text-secondary">{uniqueTeams}</div>
                <div className="text-[10px] font-mono uppercase tracking-widest text-muted-foreground mt-1">Equipos distintos</div>
              </div>
              {topTeam && (
                <div className="glass rounded-2xl p-4 text-center flex flex-col items-center gap-1">
                  {topTeam.team?.flag_url && (
                    <img src={topTeam.team.flag_url} alt="" className="w-6 h-6 rounded-full object-cover" />
                  )}
                  <div className="font-display font-bold text-sm truncate w-full text-center">{topTeam.team?.name}</div>
                  <div className="text-[10px] font-mono text-muted-foreground">{topTeam.picks.length} votos</div>
                </div>
              )}
            </div>

            {/* Campeón real (si ya se declaró) */}
            {correctTeam && (
              <div className="glass-strong rounded-3xl p-6 mb-8 border border-gold/40 relative overflow-hidden">
                <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-gold to-transparent" />
                <div className="absolute -top-10 left-1/2 -translate-x-1/2 w-40 h-40 rounded-full bg-gold/10 blur-3xl pointer-events-none" />
                <div className="relative flex items-center gap-4">
                  {correctTeam.team?.flag_url && (
                    <img src={correctTeam.team.flag_url} alt="" className="w-16 h-16 rounded-full object-cover ring-4 ring-gold/50" />
                  )}
                  <div>
                    <div className="text-xs font-mono uppercase tracking-widest text-gold mb-1">🏆 Campeón del Mundial</div>
                    <div className="font-display font-bold text-2xl">{correctTeam.team?.name}</div>
                    <div className="text-sm text-muted-foreground mt-0.5">{correctTeam.picks.length} {correctTeam.picks.length === 1 ? "persona acertó" : "personas acertaron"} · +10 pts</div>
                  </div>
                </div>
              </div>
            )}

            {/* Grupos por equipo */}
            <div className="space-y-4">
              {teamGroups.map((group) => {
                const pct = total > 0 ? Math.round((group.picks.length / total) * 100) : 0;
                return (
                  <div
                    key={group.team?.id}
                    className={`glass-strong rounded-2xl p-4 sm:p-5 relative overflow-hidden transition ${
                      group.isCorrect ? "border border-gold/40 bg-gold/5" : ""
                    }`}
                  >
                    {group.isCorrect && (
                      <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-gold/60 to-transparent" />
                    )}

                    <div className="flex items-center gap-4">
                      {/* Flag */}
                      <div className="relative flex-shrink-0">
                        {group.team?.flag_url ? (
                          <img src={group.team.flag_url} alt={group.team.name} className="w-14 h-14 sm:w-16 sm:h-16 rounded-full object-cover ring-2 ring-border/60" />
                        ) : (
                          <div className="w-14 h-14 rounded-full bg-card flex items-center justify-center font-mono text-sm">{group.team?.code}</div>
                        )}
                        {group.isCorrect && (
                          <div className="absolute -top-1 -right-1 w-5 h-5 rounded-full bg-gold flex items-center justify-center">
                            <Trophy className="w-3 h-3 text-background" />
                          </div>
                        )}
                      </div>

                      {/* Team info */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap mb-2">
                          <span className={`font-display font-bold text-lg ${group.isCorrect ? "text-gold" : ""}`}>
                            {group.team?.name}
                          </span>
                          {group.team?.group && (
                            <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-primary/15 text-primary">
                              Grupo {group.team.group}
                            </span>
                          )}
                          {group.isCorrect && (
                            <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-gold/20 text-gold font-bold">
                              CAMPEÓN ✓
                            </span>
                          )}
                        </div>

                        {/* Avatares */}
                        <div className="flex items-center gap-1 flex-wrap">
                          <div className="flex -space-x-2 mr-2">
                            {group.picks.slice(0, 8).map((pick, i) => (
                              <Avatar key={i} profile={pick.profiles} />
                            ))}
                            {group.picks.length > 8 && (
                              <div className="w-9 h-9 rounded-full bg-card border-2 border-background flex items-center justify-center text-[10px] font-bold text-muted-foreground">
                                +{group.picks.length - 8}
                              </div>
                            )}
                          </div>
                          <span className="text-xs text-muted-foreground">
                            {group.picks.map((p) => p.profiles?.display_name?.split(" ")[0]).join(", ")}
                          </span>
                        </div>
                      </div>

                      {/* Porcentaje */}
                      <div className="text-right flex-shrink-0">
                        <div className={`font-display font-bold text-2xl ${group.isCorrect ? "text-gold" : "text-primary"}`}>
                          {pct}%
                        </div>
                        <div className="text-xs text-muted-foreground">
                          {group.picks.length} {group.picks.length === 1 ? "voto" : "votos"}
                        </div>
                      </div>
                    </div>

                    {/* Barra de progreso */}
                    <div className="mt-3 h-1.5 rounded-full bg-border/30 overflow-hidden">
                      <div
                        className={`h-full rounded-full transition-all duration-700 ${group.isCorrect ? "bg-gold" : "bg-primary"}`}
                        style={{ width: `${pct}%` }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Sin pronóstico */}
            {withPick.size < total && (
              <div className="mt-6 glass rounded-2xl p-4 flex items-center gap-3">
                <Users className="w-4 h-4 text-muted-foreground flex-shrink-0" />
                <span className="text-sm text-muted-foreground">
                  Hay participantes que todavía no eligieron su campeón. Se bloquea el 11 de junio.
                </span>
              </div>
            )}
          </>
        )}
      </main>
    </div>
  );
}
