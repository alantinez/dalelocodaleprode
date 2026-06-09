import { createFileRoute, Link } from "@tanstack/react-router";
import { useRef, useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { motion } from "motion/react";
import {
  Camera, LogOut, Trophy, Target, Flame, Loader2, Save,
  TrendingUp, BarChart3, Medal, CheckCircle2, Clock, Percent,
  History, Star, X, Check, ChevronDown, ChevronUp,
} from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { AchievementsGrid } from "@/components/achievements/AchievementsGrid";
import { ChampionPicker } from "@/components/fixture/ChampionPicker";
import foto8 from "@/assets/foto8.jpg";
import { Lightbox } from "@/components/ui/Lightbox";
import confetti from "canvas-confetti";

export const Route = createFileRoute("/_authenticated/perfil")({
  component: PerfilPage,
  head: () => ({ meta: [{ title: "Mi perfil · Dale Dale" }] }),
});

type PredHistory = {
  match_id: string;
  home_score: number;
  away_score: number;
  points: number | null;
  is_exact: boolean | null;
  matches: {
    kickoff: string;
    group: string | null;
    stage: string;
    status: string;
    home_score: number | null;
    away_score: number | null;
    home: { name: string; code: string; flag_url: string | null } | null;
    away: { name: string; code: string; flag_url: string | null } | null;
  } | null;
};

function StatCard({ icon: Icon, label, value, gradient, border, iconColor, valueColor, glow, delay = 0 }: {
  icon: any; label: string; value: string | number;
  gradient: string; border: string; iconColor: string; valueColor: string; glow: string; delay?: number;
}) {
  return (
    <motion.div initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} transition={{ delay }}
      className={`relative rounded-2xl p-4 sm:p-5 text-center border bg-gradient-to-br ${gradient} ${border} ${glow} overflow-hidden`}>
      <div className={`absolute -top-4 -right-4 w-16 h-16 rounded-full blur-2xl opacity-40 bg-gradient-to-br ${gradient}`} />
      <div className="relative">
        <div className={`w-8 h-8 rounded-xl bg-gradient-to-br ${gradient} border ${border} flex items-center justify-center mx-auto mb-2.5`}>
          <Icon className={`w-4 h-4 ${iconColor}`} />
        </div>
        <div className={`font-display font-black text-2xl sm:text-3xl ${valueColor} tabular-nums leading-none`}>{value}</div>
        <div className="text-[9px] uppercase tracking-widest text-muted-foreground mt-1.5 font-mono">{label}</div>
      </div>
    </motion.div>
  );
}

type HistFilter = "todos" | "exactos" | "correctos" | "fallados" | "pendientes";

function PredHistorySection({ userId }: { userId: string }) {
  const [filter, setFilter] = useState<HistFilter>("todos");
  const [expanded, setExpanded] = useState(true);

  const q = useQuery({
    queryKey: ["user-pred-history", userId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("predictions")
        .select(`match_id, home_score, away_score, points, is_exact,
          matches(kickoff, group, stage, status, home_score, away_score,
            home:teams!matches_home_team_id_fkey(name, code, flag_url),
            away:teams!matches_away_team_id_fkey(name, code, flag_url))`)
        .eq("user_id", userId);
      if (error) throw error;
      return (data ?? []) as unknown as PredHistory[];
    },
    refetchInterval: 60_000,
  });

  const allPreds = (q.data ?? [])
    .filter((p) => p.matches)
    .sort((a, b) => new Date(b.matches!.kickoff).getTime() - new Date(a.matches!.kickoff).getTime());

  const filtered = allPreds.filter((p) => {
    const finished = p.matches?.status === "finished";
    if (filter === "exactos") return p.is_exact;
    if (filter === "correctos") return finished && !p.is_exact && (p.points ?? 0) > 0;
    if (filter === "fallados") return finished && (p.points ?? 0) === 0;
    if (filter === "pendientes") return !finished;
    return true;
  });

  const tabs: { key: HistFilter; label: string; count?: number }[] = [
    { key: "todos", label: "Todos", count: allPreds.length },
    { key: "exactos", label: "⭐ Exactos", count: allPreds.filter((p) => p.is_exact).length },
    { key: "correctos", label: "✓ Correctos", count: allPreds.filter((p) => p.matches?.status === "finished" && !p.is_exact && (p.points ?? 0) > 0).length },
    { key: "fallados", label: "✗ Sin pts", count: allPreds.filter((p) => p.matches?.status === "finished" && (p.points ?? 0) === 0).length },
    { key: "pendientes", label: "⏳ Pendientes", count: allPreds.filter((p) => p.matches?.status !== "finished").length },
  ];

  return (
    <div className="glass-strong rounded-3xl p-6 sm:p-8 mt-6">
      {/* Header */}
      <button onClick={() => setExpanded((v) => !v)} className="w-full flex items-center justify-between mb-1">
        <h2 className="font-display font-semibold text-lg flex items-center gap-2">
          <History className="w-4 h-4 text-primary" /> Mis pronósticos
        </h2>
        {expanded ? <ChevronUp className="w-4 h-4 text-muted-foreground" /> : <ChevronDown className="w-4 h-4 text-muted-foreground" />}
      </button>

      {!expanded && (
        <p className="text-xs text-muted-foreground">{allPreds.length} pronósticos · clickeá para ver</p>
      )}

      {expanded && (
        <>
          {/* Filtros */}
          <div className="flex gap-2 flex-wrap mb-4 mt-4">
            {tabs.map((t) => (
              <button key={t.key} onClick={() => setFilter(t.key)}
                className={`px-3 py-1.5 rounded-xl text-xs font-medium transition ${
                  filter === t.key ? "bg-primary text-background" : "glass text-muted-foreground hover:text-foreground"
                }`}>
                {t.label} {t.count !== undefined && <span className="ml-1 opacity-60">{t.count}</span>}
              </button>
            ))}
          </div>

          {q.isLoading ? (
            <div className="flex justify-center py-8"><Loader2 className="w-5 h-5 animate-spin text-primary" /></div>
          ) : filtered.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-8">No hay pronósticos en esta categoría.</p>
          ) : (
            <div className="space-y-2 max-h-[600px] overflow-y-auto pr-1">
              {filtered.map((p) => {
                const m = p.matches!;
                const finished = m.status === "finished";
                const kickoff = new Date(m.kickoff);
                const isExact = p.is_exact;
                const hasPoints = (p.points ?? 0) > 0;
                const pts = p.points;

                const rowBg = isExact ? "border-gold/30 bg-gold/5" :
                  finished && hasPoints ? "border-secondary/20 bg-secondary/5" :
                  finished && !hasPoints ? "border-destructive/20" :
                  "border-border/30";

                const ptsBadge = isExact
                  ? <span className="text-[10px] font-mono font-bold text-gold px-2 py-0.5 rounded-full bg-gold/15">⭐ +{pts}</span>
                  : finished && hasPoints
                  ? <span className="text-[10px] font-mono font-bold text-secondary px-2 py-0.5 rounded-full bg-secondary/15">✓ +{pts}</span>
                  : finished
                  ? <span className="text-[10px] font-mono font-bold text-destructive px-2 py-0.5 rounded-full bg-destructive/10">✗ 0</span>
                  : <span className="text-[10px] font-mono text-muted-foreground px-2 py-0.5 rounded-full glass">⏳</span>;

                return (
                  <div key={p.match_id} className={`flex items-center gap-3 p-3 rounded-xl border transition hover:bg-card/40 ${rowBg}`}>
                    {/* Equipos */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-1.5 mb-1 flex-wrap">
                        {m.group && <span className="text-[9px] font-mono px-1.5 py-0.5 rounded bg-primary/15 text-primary">G{m.group}</span>}
                        <span className="text-[10px] text-muted-foreground font-mono">
                          {kickoff.toLocaleDateString("es-AR", { day: "2-digit", month: "2-digit" })}
                        </span>
                      </div>
                      <div className="flex items-center gap-1.5 text-xs font-medium">
                        {m.home?.flag_url && <img src={m.home.flag_url} alt="" className="w-4 h-4 rounded-full object-cover" />}
                        <span className="truncate max-w-[70px] sm:max-w-none">{m.home?.name}</span>
                        <span className="text-muted-foreground flex-shrink-0">vs</span>
                        {m.away?.flag_url && <img src={m.away.flag_url} alt="" className="w-4 h-4 rounded-full object-cover" />}
                        <span className="truncate max-w-[70px] sm:max-w-none">{m.away?.name}</span>
                      </div>
                    </div>

                    {/* Tu pronóstico */}
                    <div className="text-center flex-shrink-0">
                      <div className="text-[9px] text-muted-foreground mb-0.5 font-mono">TU PRON.</div>
                      <div className={`font-mono font-bold text-sm ${isExact ? "text-gold" : hasPoints && finished ? "text-secondary" : "text-foreground"}`}>
                        {p.home_score}–{p.away_score}
                      </div>
                    </div>

                    {/* Resultado real */}
                    {finished && (
                      <div className="text-center flex-shrink-0">
                        <div className="text-[9px] text-muted-foreground mb-0.5 font-mono">RESULTADO</div>
                        <div className="font-mono font-bold text-sm text-foreground">{m.home_score}–{m.away_score}</div>
                      </div>
                    )}

                    {/* Puntos */}
                    <div className="flex-shrink-0">{ptsBadge}</div>
                  </div>
                );
              })}
            </div>
          )}
        </>
      )}
    </div>
  );
}

function PerfilPage() {
  const { user, profile, refreshProfile, signOut } = useAuth();
  const [name, setName] = useState(profile?.display_name ?? "");
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  const rankingQ = useQuery({
    queryKey: ["user-ranking-position", user?.id],
    enabled: !!user?.id,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("profiles").select("id, total_points, exact_hits")
        .order("total_points", { ascending: false }).order("exact_hits", { ascending: false });
      if (error) throw error;
      const pos = (data ?? []).findIndex((p: any) => p.id === user!.id) + 1;
      return { position: pos, total: data?.length ?? 0 };
    },
    refetchInterval: 30_000,
  });

  const predsQ = useQuery({
    queryKey: ["user-preds-stats", user?.id],
    enabled: !!user?.id,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("predictions").select("home_score, away_score, points, is_exact").eq("user_id", user!.id);
      if (error) throw error;
      const preds = data ?? [];
      const total = preds.length;
      const withResult = preds.filter((p: any) => p.points !== null);
      const correct = withResult.filter((p: any) => p.points > 0).length;
      const exact = withResult.filter((p: any) => p.is_exact).length;
      const homeWins = preds.filter((p: any) => p.home_score > p.away_score).length;
      const draws = preds.filter((p: any) => p.home_score === p.away_score).length;
      const awayWins = preds.filter((p: any) => p.away_score > p.home_score).length;
      const avgGoals = total > 0 ? (preds.reduce((acc: number, p: any) => acc + p.home_score + p.away_score, 0) / total).toFixed(1) : "—";
      const pct = withResult.length > 0 ? Math.round((correct / withResult.length) * 100) : 0;
      return { total, withResult: withResult.length, correct, exact, homeWins, draws, awayWins, avgGoals, pct };
    },
    refetchInterval: 60_000,
  });

  if (!user || !profile) return null;

  // Confetti al detectar exactos nuevos ⭐
  useEffect(() => {
    if (!profile?.exact_hits || profile.exact_hits === 0 || !user?.id) return;
    const key = `confetti_${user.id}`;
    const lastShown = parseInt(localStorage.getItem(key) ?? "0");
    if (profile.exact_hits > lastShown) {
      setTimeout(() => {
        confetti({ particleCount: 120, spread: 80, origin: { y: 0.55 }, colors: ["#FFD700","#00D2BE","#a855f7","#ec4899","#22c55e"] });
        setTimeout(() => confetti({ particleCount: 60, spread: 120, origin: { y: 0.4 }, angle: 60, colors: ["#FFD700","#00D2BE"] }), 300);
        setTimeout(() => confetti({ particleCount: 60, spread: 120, origin: { y: 0.4 }, angle: 120, colors: ["#a855f7","#ec4899"] }), 400);
      }, 600);
      localStorage.setItem(key, String(profile.exact_hits));
    }
  }, [profile?.exact_hits, user?.id]);


  const initials = profile.display_name.split(" ").map((s) => s[0]).slice(0, 2).join("").toUpperCase();
  const stats = predsQ.data;
  const rankPos = rankingQ.data?.position ?? 0;
  const rankTotal = rankingQ.data?.total ?? 0;

  const handleAvatar = async (file: File) => {
    setUploading(true);
    try {
      const ext = file.name.split(".").pop() ?? "jpg";
      const path = `${user.id}/avatar-${Date.now()}.${ext}`;
      const { error: upErr } = await supabase.storage.from("avatars").upload(path, file, { upsert: true });
      if (upErr) throw upErr;
      const { data: { publicUrl } } = supabase.storage.from("avatars").getPublicUrl(path);
      const { error: profErr } = await supabase.from("profiles").update({ avatar_url: publicUrl }).eq("id", user.id);
      if (profErr) throw profErr;
      await refreshProfile();
      toast.success("Avatar actualizado");
    } catch (err) {
      toast.error("No se pudo subir el avatar", { description: err instanceof Error ? err.message : undefined });
    } finally { setUploading(false); }
  };

  const handleSave = async () => {
    if (!name.trim()) return;
    setSaving(true);
    const { error } = await supabase.from("profiles").update({ display_name: name.trim() }).eq("id", user.id);
    if (error) toast.error("No se pudo guardar");
    else { await refreshProfile(); toast.success("Perfil actualizado"); }
    setSaving(false);
  };

  return (
    <div className="mx-auto max-w-4xl px-4 sm:px-6">

      {/* Card principal */}
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}
        className="glass-strong rounded-3xl p-6 sm:p-10 relative overflow-hidden">
        <div className="absolute -top-24 -right-24 w-64 h-64 rounded-full bg-primary/20 blur-3xl pointer-events-none" />
        <div className="absolute -bottom-16 -left-16 w-48 h-48 rounded-full bg-secondary/10 blur-3xl pointer-events-none" />

        <div className="relative flex flex-col sm:flex-row items-start sm:items-center gap-6">
          <div className="relative group flex-shrink-0">
            <div className="w-24 h-24 sm:w-28 sm:h-28 rounded-2xl bg-gradient-to-br from-primary to-secondary flex items-center justify-center overflow-hidden shadow-glow ring-2 ring-primary/30">
              {profile.avatar_url
                ? <img src={profile.avatar_url} alt={profile.display_name} className="w-full h-full object-cover" />
                : <span className="font-display font-bold text-3xl text-background">{initials}</span>}
            </div>
            <button onClick={() => fileRef.current?.click()} disabled={uploading}
              className="absolute inset-0 rounded-2xl bg-background/70 backdrop-blur opacity-0 group-hover:opacity-100 transition flex items-center justify-center">
              {uploading ? <Loader2 className="w-6 h-6 animate-spin" /> : <Camera className="w-6 h-6" />}
            </button>
            <input ref={fileRef} type="file" accept="image/*" className="hidden"
              onChange={(e) => e.target.files?.[0] && handleAvatar(e.target.files[0])} />
          </div>

          <div className="flex-1 w-full min-w-0">
            <p className="text-xs font-mono uppercase tracking-widest text-muted-foreground">Tu perfil</p>
            <h1 className="font-display font-bold text-3xl sm:text-4xl mt-1 truncate">{profile.display_name}</h1>
            <p className="text-sm text-muted-foreground mt-1 truncate">{user.email}</p>
            {rankPos > 0 && (
              <div className="flex items-center gap-1.5 mt-2">
                <Medal className={`w-4 h-4 ${rankPos === 1 ? "text-gold" : rankPos === 2 ? "text-silver" : rankPos === 3 ? "text-bronze" : "text-muted-foreground"}`} />
                <span className="text-sm font-mono font-bold">#{rankPos}<span className="text-muted-foreground font-normal"> de {rankTotal}</span></span>
                <Link to="/ranking" className="text-xs text-primary hover:underline ml-1">ver ranking →</Link>
              </div>
            )}
          </div>

          <button onClick={async () => { await signOut(); toast.success("Sesión cerrada"); }}
            className="inline-flex items-center gap-2 glass rounded-xl px-4 py-2 text-sm font-medium hover:bg-destructive/20 hover:text-destructive transition flex-shrink-0">
            <LogOut className="w-4 h-4" /> Salir
          </button>
        </div>

        <div className="grid grid-cols-3 gap-3 sm:gap-4 mt-8">
          <StatCard icon={Trophy} label="Puntos totales" value={profile.total_points} gradient="from-yellow-400/20 to-orange-400/10" border="border-yellow-400/30" iconColor="text-yellow-400" valueColor="text-yellow-400" glow="shadow-[0_0_20px_rgba(250,204,21,0.15)]" delay={0.05} />
          <StatCard icon={Target} label="Exactos" value={profile.exact_hits} gradient="from-primary/20 to-cyan-400/10" border="border-primary/30" iconColor="text-primary" valueColor="text-primary" glow="shadow-[0_0_20px_rgba(99,102,241,0.15)]" delay={0.1} />
          <StatCard icon={Flame} label="Racha" value={profile.current_streak} gradient="from-secondary/20 to-emerald-400/10" border="border-secondary/30" iconColor="text-secondary" valueColor="text-secondary" glow="shadow-[0_0_20px_rgba(16,185,129,0.15)]" delay={0.15} />
        </div>

        {stats && (
          <div className="grid grid-cols-3 gap-3 sm:gap-4 mt-3">
            <StatCard icon={BarChart3} label="Pronósticos" value={stats.total} gradient="from-violet-400/20 to-purple-400/10" border="border-violet-400/30" iconColor="text-violet-400" valueColor="text-violet-400" glow="shadow-[0_0_20px_rgba(167,139,250,0.1)]" delay={0.2} />
            <StatCard icon={Percent} label="% Aciertos" value={stats.withResult > 0 ? `${stats.pct}%` : "—"} gradient="from-rose-400/20 to-pink-400/10" border="border-rose-400/30" iconColor="text-rose-400" valueColor="text-rose-400" glow="shadow-[0_0_20px_rgba(251,113,133,0.1)]" delay={0.25} />
            <StatCard icon={TrendingUp} label="⚽ Goles/pdo." value={stats.total > 0 ? stats.avgGoals : "—"} gradient="from-amber-400/20 to-yellow-400/10" border="border-amber-400/30" iconColor="text-amber-400" valueColor="text-amber-400" glow="shadow-[0_0_20px_rgba(251,191,36,0.1)]" delay={0.3} />
          </div>
        )}
      </motion.div>

      {/* Estilo de juego */}
      {stats && stats.total > 0 && (
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15 }}
          className="glass-strong rounded-3xl p-6 sm:p-8 mt-6">
          <h2 className="font-display font-semibold text-lg mb-5 flex items-center gap-2">
            <BarChart3 className="w-4 h-4 text-primary" /> Tu estilo de juego
          </h2>
          <div className="grid sm:grid-cols-3 gap-4 mb-5">
            {[
              { label: "Local gana", count: stats.homeWins, color: "bg-primary", pct: Math.round(stats.homeWins / stats.total * 100) },
              { label: "Empate", count: stats.draws, color: "bg-gold", pct: Math.round(stats.draws / stats.total * 100) },
              { label: "Visitante gana", count: stats.awayWins, color: "bg-secondary", pct: Math.round(stats.awayWins / stats.total * 100) },
            ].map((item) => (
              <div key={item.label}>
                <div className="flex items-center justify-between mb-1.5 text-xs font-mono">
                  <span className="text-muted-foreground">{item.label}</span>
                  <span className="font-bold text-foreground">{item.pct}%</span>
                </div>
                <div className="h-2 rounded-full bg-border/30 overflow-hidden">
                  <div className={`h-full rounded-full ${item.color} transition-all duration-700`} style={{ width: `${item.pct}%` }} />
                </div>
                <div className="text-[10px] text-muted-foreground mt-1">{item.count} pronósticos</div>
              </div>
            ))}
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div className="glass rounded-xl p-3 text-center"><div className="font-display font-bold text-xl text-secondary">{stats.correct}</div><div className="text-[10px] font-mono uppercase tracking-widest text-muted-foreground mt-0.5">Con puntos</div></div>
            <div className="glass rounded-xl p-3 text-center"><div className="font-display font-bold text-xl text-gold">{stats.exact}</div><div className="text-[10px] font-mono uppercase tracking-widest text-muted-foreground mt-0.5">Exactos ⭐</div></div>
            <div className="glass rounded-xl p-3 text-center"><div className="font-display font-bold text-xl text-muted-foreground">{stats.withResult}</div><div className="text-[10px] font-mono uppercase tracking-widest text-muted-foreground mt-0.5">Con resultado</div></div>
            <div className="glass rounded-xl p-3 text-center"><div className="font-display font-bold text-xl text-primary">{stats.total - stats.withResult}</div><div className="text-[10px] font-mono uppercase tracking-widest text-muted-foreground mt-0.5">Pendientes</div></div>
          </div>
        </motion.div>
      )}

      {/* Campeón */}
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.05 }} className="mt-6">
        <ChampionPicker />
      </motion.div>

      {/* Historial de pronósticos */}
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15 }}>
        <PredHistorySection userId={user.id} />
      </motion.div>

      {/* Datos + foto */}
      <div className="flex gap-4 items-start mt-6">
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}
          className="flex-1 glass-strong rounded-3xl p-6 sm:p-8">
          <h2 className="font-display font-semibold text-lg mb-4">Datos del perfil</h2>
          <div className="space-y-3">
            <div>
              <label className="text-xs font-mono uppercase tracking-widest text-muted-foreground">Nombre a mostrar</label>
              <input value={name} onChange={(e) => setName(e.target.value)}
                className="mt-1.5 w-full px-4 py-3 rounded-xl bg-input border border-border focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/30 transition" />
            </div>
            <button onClick={handleSave} disabled={saving || name.trim() === profile.display_name}
              className="inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-primary to-secondary py-2.5 px-5 font-semibold text-background shadow-glow hover:scale-[1.01] transition disabled:opacity-50 disabled:cursor-not-allowed">
              {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
              Guardar cambios
            </button>
          </div>
        </motion.div>

        <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.15 }}
          className="hidden sm:block w-36 flex-shrink-0 self-center">
          <Lightbox src={foto8} className="rounded-2xl overflow-hidden border-2 border-primary/30 shadow-glow rotate-2 hover:rotate-0 transition-transform duration-300" imgClassName="w-full h-auto" />
        </motion.div>
      </div>

      {/* Logros */}
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}
        className="glass-strong rounded-3xl p-6 sm:p-8 mt-6 mb-6">
        <AchievementsGrid userId={user.id} />
      </motion.div>
    </div>
  );
}
