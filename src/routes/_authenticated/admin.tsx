import { useState, useMemo } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  Loader2, Save, ShieldCheck, ShieldAlert, Crown,
  Users, CheckCircle2, XCircle, Clock, Trophy, Search,
  Trash2, Plus, Swords, CalendarDays, Camera, History,
} from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { formatKickoff } from "@/lib/prode/scoring";

export const Route = createFileRoute("/_authenticated/admin")({
  component: AdminPage,
});

type AdminMatch = {
  id: string;
  kickoff: string;
  group: string | null;
  stage: string;
  venue: string | null;
  status: "scheduled" | "live" | "finished" | "postponed";
  home_score: number | null;
  away_score: number | null;
  home: { name: string; code: string; flag_url: string | null } | null;
  away: { name: string; code: string; flag_url: string | null } | null;
};

type Participant = {
  id: string;
  display_name: string;
  avatar_url: string | null;
  total_points: number;
  exact_hits: number;
  paid: boolean;
  paid_at: string | null;
  email: string;
  created_at: string;
};

const KNOCKOUT_STAGES = [
  { key: "r32",   label: "Octavos de Final" },
  { key: "r16",   label: "Dieciseisavos de Final" },
  { key: "qf",    label: "Cuartos de Final" },
  { key: "sf",    label: "Semifinales" },
  { key: "third", label: "3° y 4° Puesto" },
  { key: "final", label: "Gran Final" },
];

const STAGE_LABEL: Record<string, string> = Object.fromEntries(
  KNOCKOUT_STAGES.map((s) => [s.key, s.label])
);

function AdminPage() {
  const { isAdmin, user, loading } = useAuth();
  const [tab, setTab] = useState<"participantes" | "resultados" | "knockout" | "campeon" | "historial">("participantes");

  const claimMut = useMutation({
    mutationFn: async () => {
      const { data, error } = await supabase.rpc("claim_admin_if_empty");
      if (error) throw error;
      return data as boolean;
    },
    onSuccess: (claimed) => {
      if (claimed) { toast.success("¡Sos admin! Recargá la página."); setTimeout(() => window.location.reload(), 800); }
      else toast.error("Ya existe un admin.");
    },
    onError: (e: Error) => toast.error(e.message),
  });

  if (loading) return <div className="min-h-screen flex items-center justify-center"><Loader2 className="w-6 h-6 animate-spin text-primary" /></div>;

  if (!isAdmin) {
    return (
      <div className="min-h-screen flex items-center justify-center px-4">
        <div className="glass-strong rounded-2xl p-8 max-w-md w-full text-center">
          <ShieldAlert className="w-12 h-12 text-gold mx-auto mb-4" />
          <h2 className="font-display text-2xl font-bold mb-2">Acceso restringido</h2>
          <p className="text-sm text-muted-foreground mb-6">Esta sección es solo para administradores.</p>
          <Button onClick={() => claimMut.mutate()} disabled={claimMut.isPending || !user}
            className="w-full bg-gradient-to-r from-primary to-secondary text-background font-semibold">
            {claimMut.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <><Crown className="w-4 h-4 mr-2" />Reclamar admin</>}
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background pt-8 pb-20">
      <main className="mx-auto max-w-4xl px-4 sm:px-6">
        <div className="flex items-center gap-3 mb-2">
          <ShieldCheck className="w-5 h-5 text-primary" />
          <span className="font-mono text-xs uppercase tracking-widest text-primary">Panel admin</span>
        </div>
        <h1 className="font-display text-4xl sm:text-5xl font-bold tracking-tight mb-6">
          Dale Dale <span className="text-gradient-hero">Admin</span>
        </h1>

        <div className="flex gap-2 mb-8 flex-wrap">
          {([
            { key: "participantes", label: "Participantes", icon: <Users className="w-4 h-4" /> },
            { key: "resultados",    label: "Resultados",    icon: <Save className="w-4 h-4" /> },
            { key: "knockout",      label: "⚽ Knockout",   icon: null },
            { key: "campeon",       label: "🏆 Campeón",    icon: null },
            { key: "historial",     label: "📋 Historial",  icon: null },
          ] as const).map((t) => (
            <button key={t.key} onClick={() => setTab(t.key)}
              className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium transition ${
                tab === t.key ? "bg-primary text-background" : "glass text-muted-foreground hover:text-foreground"
              }`}>
              {t.icon}{t.label}
            </button>
          ))}
        </div>

        {tab === "participantes" && <AdminParticipants />}
        {tab === "resultados"    && <AdminMatches />}
        {tab === "knockout"      && <AdminKnockout />}
        {tab === "campeon"       && <AdminChampion />}
        {tab === "historial"     && <AdminHistorial />}
      </main>
    </div>
  );
}

function SnapshotButton() {
  const qc = useQueryClient();
  const [label, setLabel] = useState("");

  const snapshotsQ = useQuery({
    queryKey: ["admin-snapshots"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("ranking_history")
        .select("snapshot_at, label")
        .order("snapshot_at", { ascending: false });
      if (error) throw error;
      // Deduplicar por snapshot_at
      const seen = new Set<string>();
      return (data ?? []).filter((r: any) => {
        if (seen.has(r.snapshot_at)) return false;
        seen.add(r.snapshot_at);
        return true;
      });
    },
    refetchInterval: 30_000,
  });

  const saveMut = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.rpc("admin_snapshot_ranking", { p_label: label.trim() || null });
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("📸 Snapshot guardado");
      setLabel("");
      qc.invalidateQueries({ queryKey: ["ranking-history-latest"] });
      qc.invalidateQueries({ queryKey: ["admin-snapshots"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const deleteMut = useMutation({
    mutationFn: async (snapshotAt: string) => {
      const { error } = await supabase.rpc("admin_delete_snapshot", { p_snapshot_at: snapshotAt });
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Snapshot eliminado");
      qc.invalidateQueries({ queryKey: ["ranking-history-latest"] });
      qc.invalidateQueries({ queryKey: ["admin-snapshots"] });
      qc.invalidateQueries({ queryKey: ["ranking-history-all"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const clearMut = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.rpc("admin_clear_snapshots");
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Todos los snapshots eliminados");
      qc.invalidateQueries();
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const snapshots = snapshotsQ.data ?? [];

  const fmt = (iso: string) => {
    const d = new Date(iso);
    return d.toLocaleDateString("es-AR", { day: "2-digit", month: "2-digit" })
      + " " + d.toLocaleTimeString("es-AR", { hour: "2-digit", minute: "2-digit" });
  };

  return (
    <div className="glass rounded-2xl p-4 mb-6 border border-primary/20 space-y-4">
      {/* Guardar nuevo snapshot */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3">
        <Camera className="w-5 h-5 text-primary flex-shrink-0" />
        <div className="flex-1 min-w-0">
          <p className="text-xs font-mono uppercase tracking-widest text-primary mb-0.5">Snapshot del ranking</p>
          <p className="text-xs text-muted-foreground">Guardá el estado actual para mostrar las flechas ↑↓.</p>
        </div>
        <input value={label} onChange={(e) => setLabel(e.target.value)} placeholder="Etiqueta (ej: Fecha 3)"
          className="glass rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/40 w-full sm:w-44" />
        <Button onClick={() => saveMut.mutate()} disabled={saveMut.isPending} size="sm"
          className="bg-primary text-background font-semibold whitespace-nowrap">
          {saveMut.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : "Guardar snapshot"}
        </Button>
      </div>

      {/* Lista de snapshots existentes */}
      {snapshots.length > 0 && (
        <div className="border-t border-border/40 pt-3">
          <div className="flex items-center justify-between mb-2">
            <p className="text-xs font-mono uppercase tracking-widest text-muted-foreground">
              Snapshots guardados ({snapshots.length})
            </p>
            <button
              onClick={() => { if (confirm("¿Borrar TODOS los snapshots? Las flechas y el gráfico F1 desaparecerán.")) clearMut.mutate(); }}
              disabled={clearMut.isPending}
              className="text-xs text-destructive hover:text-destructive/80 font-mono transition"
            >
              {clearMut.isPending ? <Loader2 className="w-3 h-3 animate-spin inline" /> : "Borrar todos"}
            </button>
          </div>
          <div className="space-y-1">
            {snapshots.map((s: any) => (
              <div key={s.snapshot_at} className="flex items-center justify-between glass rounded-lg px-3 py-2">
                <div>
                  <span className="text-sm font-medium">{s.label ?? "Sin etiqueta"}</span>
                  <span className="text-xs text-muted-foreground ml-2 font-mono">{fmt(s.snapshot_at)}</span>
                </div>
                <button
                  onClick={() => { if (confirm(`¿Eliminar snapshot "${s.label}"?`)) deleteMut.mutate(s.snapshot_at); }}
                  disabled={deleteMut.isPending}
                  className="w-7 h-7 flex items-center justify-center rounded-lg hover:bg-destructive/20 hover:text-destructive transition"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function AdminMatchRow({ match, onSave, saving }: { match: AdminMatch; onSave: (home: number, away: number) => void; saving: boolean }) {
  const [home, setHome] = useState<string>(match.home_score?.toString() ?? "");
  const [away, setAway] = useState<string>(match.away_score?.toString() ?? "");
  const isFinished = match.status === "finished";
  return (
    <div className={`glass-strong rounded-2xl p-4 sm:p-5 ${isFinished ? "ring-1 ring-primary/40" : ""}`}>
      <div className="flex items-center justify-between mb-3 text-[10px] sm:text-xs font-mono uppercase tracking-widest text-muted-foreground">
        <span>{formatKickoff(new Date(match.kickoff))}</span>
        <div className="flex items-center gap-2">
          {match.group && <span className="text-primary">Grupo {match.group}</span>}
          {match.stage !== "group" && <span className="text-secondary">{STAGE_LABEL[match.stage] ?? match.stage}</span>}
          {isFinished && <span className="px-2 py-0.5 rounded bg-primary/15 text-primary">FINAL</span>}
        </div>
      </div>
      <div className="grid grid-cols-[1fr_auto_1fr] gap-3 items-center">
        <div className="flex items-center gap-2 justify-end min-w-0">
          <span className="font-semibold truncate text-sm sm:text-base text-right">{match.home?.name}</span>
          {match.home?.flag_url && <img src={match.home.flag_url} alt="" className="w-6 h-6 rounded shrink-0" />}
        </div>
        <div className="flex items-center gap-1.5">
          <Input type="number" inputMode="numeric" min={0} max={20} value={home} onChange={(e) => setHome(e.target.value)} className="w-14 h-12 text-center font-display text-2xl font-bold" />
          <span className="text-muted-foreground">·</span>
          <Input type="number" inputMode="numeric" min={0} max={20} value={away} onChange={(e) => setAway(e.target.value)} className="w-14 h-12 text-center font-display text-2xl font-bold" />
        </div>
        <div className="flex items-center gap-2 min-w-0">
          {match.away?.flag_url && <img src={match.away.flag_url} alt="" className="w-6 h-6 rounded shrink-0" />}
          <span className="font-semibold truncate text-sm sm:text-base">{match.away?.name}</span>
        </div>
      </div>
      <div className="mt-3 flex justify-end">
        <Button size="sm" onClick={() => {
          const h = parseInt(home, 10), a = parseInt(away, 10);
          if (isNaN(h) || isNaN(a) || h < 0 || a < 0) { toast.error("Ingresá goles válidos"); return; }
          onSave(h, a);
        }} disabled={saving} className="bg-gradient-to-r from-primary to-secondary text-background font-semibold">
          {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <><Save className="w-3.5 h-3.5 mr-1.5" />{isFinished ? "Actualizar" : "Guardar final"}</>}
        </Button>
      </div>
    </div>
  );
}

function AdminKnockout() {
  const qc = useQueryClient();
  const [stage, setStage] = useState("r32");
  const [homeId, setHomeId] = useState("");
  const [awayId, setAwayId] = useState("");
  const [kickoffStr, setKickoff] = useState("");
  const [venue, setVenue] = useState("");
  const [teamSearch, setTeamSearch] = useState("");
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const teamsQ = useQuery({
    queryKey: ["teams-all"],
    queryFn: async () => {
      const { data, error } = await supabase.from("teams").select("id, name, code, flag_url, group").order("name");
      if (error) throw error;
      return data as { id: string; name: string; code: string; flag_url: string | null; group: string }[];
    },
  });

  const knockoutQ = useQuery({
    queryKey: ["admin-knockout-matches"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("matches")
        .select(`id, kickoff, stage, group, venue, status, home_score, away_score,
           home:teams!matches_home_team_id_fkey(name,code,flag_url),
           away:teams!matches_away_team_id_fkey(name,code,flag_url)`)
        .neq("stage", "group").order("kickoff", { ascending: true });
      if (error) throw error;
      return data as unknown as AdminMatch[];
    },
  });

  const createMut = useMutation({
    mutationFn: async () => {
      if (!homeId || !awayId || !kickoffStr) throw new Error("Completá todos los campos obligatorios");
      if (homeId === awayId) throw new Error("El local y visitante deben ser distintos");
      const { error } = await supabase.rpc("admin_create_match", {
        p_stage: stage, p_home_team_id: homeId, p_away_team_id: awayId,
        p_kickoff: new Date(kickoffStr).toISOString(), p_venue: venue || null,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Partido creado ✅");
      setHomeId(""); setAwayId(""); setKickoff(""); setVenue("");
      qc.invalidateQueries({ queryKey: ["admin-knockout-matches"] });
      qc.invalidateQueries({ queryKey: ["matches"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const deleteMut = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.rpc("admin_delete_match", { p_match_id: id });
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Partido eliminado");
      setDeletingId(null);
      qc.invalidateQueries({ queryKey: ["admin-knockout-matches"] });
      qc.invalidateQueries({ queryKey: ["matches"] });
    },
    onError: (e: Error) => { toast.error(e.message); setDeletingId(null); },
  });

  const filteredTeams = useMemo(() =>
    (teamsQ.data ?? []).filter((t) =>
      teamSearch === "" || t.name.toLowerCase().includes(teamSearch.toLowerCase()) || t.code.toLowerCase().includes(teamSearch.toLowerCase())
    ), [teamsQ.data, teamSearch]);

  const teamById = useMemo(() => {
    const m = new Map<string, string>();
    (teamsQ.data ?? []).forEach((t) => m.set(t.id, t.name));
    return m;
  }, [teamsQ.data]);

  const byStage = useMemo(() => {
    const map = new Map<string, AdminMatch[]>();
    for (const m of knockoutQ.data ?? []) {
      if (!map.has(m.stage)) map.set(m.stage, []);
      map.get(m.stage)!.push(m);
    }
    return map;
  }, [knockoutQ.data]);

  return (
    <div className="space-y-8">
      {deletingId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-background/80 backdrop-blur-sm px-4">
          <div className="glass-strong rounded-2xl p-6 max-w-sm w-full text-center">
            <Trash2 className="w-10 h-10 text-destructive mx-auto mb-3" />
            <h3 className="font-display font-bold text-xl mb-2">¿Eliminar partido?</h3>
            <p className="text-sm text-muted-foreground mb-6">Se eliminan también los pronósticos. No se puede deshacer.</p>
            <div className="flex gap-3">
              <button onClick={() => setDeletingId(null)} className="flex-1 glass rounded-xl py-2.5 text-sm font-medium hover:bg-card transition">Cancelar</button>
              <button onClick={() => deleteMut.mutate(deletingId)} disabled={deleteMut.isPending}
                className="flex-1 bg-destructive text-white rounded-xl py-2.5 text-sm font-semibold hover:bg-destructive/90 transition disabled:opacity-50">
                {deleteMut.isPending ? <Loader2 className="w-4 h-4 animate-spin mx-auto" /> : "Eliminar"}
              </button>
            </div>
          </div>
        </div>
      )}
      <div className="glass-strong rounded-2xl p-5 border border-primary/20">
        <div className="flex items-center gap-2 mb-4"><Plus className="w-4 h-4 text-primary" /><h3 className="font-display font-bold text-lg">Agregar partido knockout</h3></div>
        <div className="grid sm:grid-cols-2 gap-4">
          <div className="sm:col-span-2">
            <label className="text-xs font-mono uppercase tracking-widest text-muted-foreground mb-2 block">Fase</label>
            <div className="flex flex-wrap gap-2">
              {KNOCKOUT_STAGES.map((s) => (
                <button key={s.key} type="button" onClick={() => setStage(s.key)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition ${stage === s.key ? "bg-primary text-background" : "glass text-muted-foreground hover:text-foreground"}`}>
                  {s.label}
                </button>
              ))}
            </div>
          </div>
          <div className="sm:col-span-2">
            <label className="text-xs font-mono uppercase tracking-widest text-muted-foreground mb-2 block">Buscar equipo</label>
            <input value={teamSearch} onChange={(e) => setTeamSearch(e.target.value)} placeholder="Escribí para filtrar..."
              className="w-full glass rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary/40" />
          </div>
          <div>
            <label className="text-xs font-mono uppercase tracking-widest text-muted-foreground mb-2 block">Local {homeId && <span className="text-primary ml-1">✓ {teamById.get(homeId)}</span>}</label>
            <div className="glass rounded-xl max-h-36 overflow-y-auto divide-y divide-border/30">
              {filteredTeams.map((t) => (
                <button key={t.id} type="button" onClick={() => setHomeId(t.id)}
                  className={`w-full flex items-center gap-2 px-3 py-2 text-sm text-left hover:bg-card transition ${homeId === t.id ? "bg-primary/20 text-primary" : ""}`}>
                  {t.flag_url && <img src={t.flag_url} alt="" className="w-5 h-5 rounded object-cover flex-shrink-0" />}
                  <span className="truncate">{t.name}</span>
                  <span className="ml-auto font-mono text-[10px] text-muted-foreground">{t.group}</span>
                </button>
              ))}
            </div>
          </div>
          <div>
            <label className="text-xs font-mono uppercase tracking-widest text-muted-foreground mb-2 block">Visitante {awayId && <span className="text-secondary ml-1">✓ {teamById.get(awayId)}</span>}</label>
            <div className="glass rounded-xl max-h-36 overflow-y-auto divide-y divide-border/30">
              {filteredTeams.map((t) => (
                <button key={t.id} type="button" onClick={() => setAwayId(t.id)}
                  className={`w-full flex items-center gap-2 px-3 py-2 text-sm text-left hover:bg-card transition ${awayId === t.id ? "bg-secondary/20 text-secondary" : ""}`}>
                  {t.flag_url && <img src={t.flag_url} alt="" className="w-5 h-5 rounded object-cover flex-shrink-0" />}
                  <span className="truncate">{t.name}</span>
                  <span className="ml-auto font-mono text-[10px] text-muted-foreground">{t.group}</span>
                </button>
              ))}
            </div>
          </div>
          <div>
            <label className="text-xs font-mono uppercase tracking-widest text-muted-foreground mb-2 block">Fecha y hora</label>
            <input type="datetime-local" value={kickoffStr} onChange={(e) => setKickoff(e.target.value)}
              className="w-full glass rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary/40" />
          </div>
          <div>
            <label className="text-xs font-mono uppercase tracking-widest text-muted-foreground mb-2 block">Estadio (opcional)</label>
            <input type="text" value={venue} onChange={(e) => setVenue(e.target.value)} placeholder="Ej: MetLife Stadium"
              className="w-full glass rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary/40" />
          </div>
        </div>
        <div className="mt-5 flex justify-end">
          <Button onClick={() => createMut.mutate()} disabled={createMut.isPending || !homeId || !awayId || !kickoffStr}
            className="bg-gradient-to-r from-primary to-secondary text-background font-semibold gap-2">
            {createMut.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <><Swords className="w-4 h-4" />Crear partido</>}
          </Button>
        </div>
      </div>
      <div>
        <h3 className="font-display font-bold text-lg mb-4 flex items-center gap-2"><CalendarDays className="w-4 h-4 text-primary" />Partidos cargados</h3>
        {knockoutQ.isLoading ? (
          <div className="flex justify-center py-10"><Loader2 className="w-5 h-5 animate-spin text-primary" /></div>
        ) : byStage.size === 0 ? (
          <div className="glass-strong rounded-2xl p-10 text-center text-muted-foreground text-sm">Todavía no hay partidos knockout cargados.</div>
        ) : (
          <div className="space-y-6">
            {KNOCKOUT_STAGES.filter((s) => byStage.has(s.key)).map((s) => (
              <div key={s.key}>
                <div className="text-xs font-mono uppercase tracking-widest text-primary mb-2">{s.label}</div>
                <div className="space-y-2">
                  {byStage.get(s.key)!.map((m) => (
                    <div key={m.id} className="glass-strong rounded-xl p-3 flex items-center gap-3">
                      <div className="flex-1 flex items-center gap-2 text-sm font-semibold min-w-0">
                        {m.home?.flag_url && <img src={m.home.flag_url} alt="" className="w-5 h-5 rounded object-cover flex-shrink-0" />}
                        <span className="truncate">{m.home?.name}</span>
                        <span className="text-muted-foreground mx-1 font-normal flex-shrink-0">vs</span>
                        {m.away?.flag_url && <img src={m.away.flag_url} alt="" className="w-5 h-5 rounded object-cover flex-shrink-0" />}
                        <span className="truncate">{m.away?.name}</span>
                      </div>
                      <span className="text-xs font-mono text-muted-foreground hidden sm:block flex-shrink-0">{formatKickoff(new Date(m.kickoff))}</span>
                      {m.status === "finished" && <span className="text-xs font-mono font-bold text-secondary flex-shrink-0">{m.home_score}-{m.away_score}</span>}
                      <button onClick={() => setDeletingId(m.id)} className="w-8 h-8 flex items-center justify-center rounded-lg glass hover:bg-destructive/20 hover:text-destructive transition flex-shrink-0">
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function AdminChampion() {
  const qc = useQueryClient();
  const [search, setSearch] = useState("");
  const teamsQ = useQuery({
    queryKey: ["teams-all"],
    queryFn: async () => {
      const { data, error } = await supabase.from("teams").select("id, name, code, flag_url, group").order("name");
      if (error) throw error;
      return data;
    },
  });
  const setChampMut = useMutation({
    mutationFn: async (teamId: string) => {
      const { error } = await supabase.rpc("admin_set_champion", { winning_team_id: teamId });
      if (error) throw error;
    },
    onSuccess: () => { toast.success("¡Campeón declarado! 10 pts otorgados ✅"); qc.invalidateQueries(); },
    onError: (e: Error) => toast.error(e.message),
  });
  const teams = ((teamsQ.data ?? []) as any[]).filter((t) =>
    search === "" || t.name.toLowerCase().includes(search.toLowerCase()) || t.code.toLowerCase().includes(search.toLowerCase())
  );
  return (
    <div className="glass-strong rounded-2xl p-5 border border-gold/30">
      <h3 className="font-display font-bold text-xl text-gold mb-1">🏆 Declarar campeón del Mundial</h3>
      <p className="text-sm text-muted-foreground mb-5">Usá esto cuando termine el torneo. Al confirmar, se otorgan <b>10 puntos</b> a todos los que lo eligieron.<br /><span className="text-destructive font-semibold">⚠️ Esta acción no se puede deshacer.</span></p>
      <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Buscar equipo..."
        className="w-full glass rounded-xl px-4 py-2.5 text-sm mb-4 focus:outline-none focus:ring-2 focus:ring-gold/40" />
      {teamsQ.isLoading ? (
        <div className="flex justify-center py-10"><Loader2 className="w-5 h-5 animate-spin text-primary" /></div>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 max-h-72 overflow-y-auto pr-1">
          {teams.map((t: any) => (
            <button key={t.id}
              onClick={() => { if (confirm(`¿Declarar a ${t.name} como CAMPEÓN?\n\nOtorgará 10 pts. No se puede deshacer.`)) setChampMut.mutate(t.id); }}
              disabled={setChampMut.isPending}
              className="flex items-center gap-2.5 glass rounded-xl px-3 py-2.5 hover:bg-card hover:ring-1 hover:ring-gold/50 transition active:scale-95 text-left">
              {t.flag_url && <img src={t.flag_url} alt="" className="w-7 h-7 rounded-md object-cover flex-shrink-0" />}
              <div className="min-w-0">
                <div className="text-sm font-medium truncate">{t.name}</div>
                <div className="text-[10px] font-mono text-muted-foreground">Grupo {t.group}</div>
              </div>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

function AdminHistorial() {
  const q = useQuery({
    queryKey: ["audit-log"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("result_audit_log")
        .select(`id, changed_at, home_score_before, away_score_before, home_score_after, away_score_after,
          matches(group, home:teams!matches_home_team_id_fkey(name,code,flag_url), away:teams!matches_away_team_id_fkey(name,code,flag_url)),
          profiles:changed_by(display_name)`)
        .order("changed_at", { ascending: false }).limit(200);
      if (error) throw error;
      return data ?? [];
    },
    refetchInterval: 30_000,
  });
  const fmt = (iso: string) => {
    const d = new Date(iso);
    return d.toLocaleDateString("es-AR", { day: "2-digit", month: "2-digit" })
      + " " + d.toLocaleTimeString("es-AR", { hour: "2-digit", minute: "2-digit" });
  };
  return (
    <div>
      <p className="text-muted-foreground mb-2">Cada resultado cargado o modificado queda registrado permanentemente.</p>
      <p className="text-xs text-muted-foreground mb-6">
        También visible para todos los participantes en{" "}
        <a href="/historial" className="text-primary underline">/historial</a>.
      </p>
      {q.isLoading ? (
        <div className="flex justify-center py-10"><Loader2 className="w-5 h-5 animate-spin text-primary" /></div>
      ) : !q.data || q.data.length === 0 ? (
        <div className="glass-strong rounded-2xl p-10 text-center">
          <History className="w-10 h-10 text-muted-foreground mx-auto mb-3 opacity-40" />
          <p className="text-muted-foreground text-sm">Sin cambios todavía. Aparecerán acá cada vez que cargues un resultado.</p>
        </div>
      ) : (
        <div className="glass-strong rounded-2xl overflow-hidden">
          <div className="px-5 py-3 border-b border-border/50 flex items-center gap-2 text-sm font-medium">
            <History className="w-4 h-4 text-primary" />
            {q.data.length} {q.data.length === 1 ? "cambio" : "cambios"} registrados
          </div>
          <div className="divide-y divide-border/20">
            {(q.data as any[]).map((row: any) => {
              const m = row.matches;
              const isEdit = row.home_score_before !== null;
              return (
                <div key={row.id} className="px-5 py-3.5 flex items-center justify-between gap-3 hover:bg-card/40 transition">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 text-sm font-medium mb-1 flex-wrap">
                      {m?.group && <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-primary/15 text-primary">Grupo {m.group}</span>}
                      {m?.home?.flag_url && <img src={m.home.flag_url} alt="" className="w-4 h-4 rounded-full object-cover" />}
                      <span className="truncate">{m?.home?.name}</span>
                      <span className="text-muted-foreground text-xs">vs</span>
                      {m?.away?.flag_url && <img src={m.away.flag_url} alt="" className="w-4 h-4 rounded-full object-cover" />}
                      <span className="truncate">{m?.away?.name}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      {isEdit && <span className="font-mono text-sm text-muted-foreground line-through">{row.home_score_before}–{row.away_score_before}</span>}
                      {isEdit && <span className="text-muted-foreground text-xs">→</span>}
                      <span className={`font-mono font-bold ${isEdit ? "text-orange-400" : "text-secondary"}`}>{row.home_score_after}–{row.away_score_after}</span>
                      <span className={`text-[10px] font-mono px-1.5 py-0.5 rounded ${isEdit ? "bg-orange-400/15 text-orange-400" : "bg-secondary/15 text-secondary"}`}>
                        {isEdit ? "Modificado" : "Cargado"}
                      </span>
                    </div>
                  </div>
                  <div className="text-right flex-shrink-0 text-[10px] text-muted-foreground">
                    <div>{fmt(row.changed_at)}</div>
                    <div className="text-primary">{row.profiles?.display_name ?? "Admin"}</div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}

function AdminParticipants() {
  const qc = useQueryClient();
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState<"todos" | "pagados" | "pendientes">("todos");
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const q = useQuery({
    queryKey: ["admin-participants"],
    queryFn: async () => {
      const { data, error } = await supabase.rpc("admin_get_participants");
      if (error) throw error;
      return data as Participant[];
    },
    refetchInterval: 30_000,
  });

  const setPaidMut = useMutation({
    mutationFn: async ({ userId, paid }: { userId: string; paid: boolean }) => {
      const { error } = await supabase.rpc("admin_set_paid", { target_user_id: userId, is_paid: paid });
      if (error) throw error;
    },
    onSuccess: (_, vars) => {
      toast.success(vars.paid ? "✅ Pago confirmado" : "❌ Pago removido");
      qc.invalidateQueries({ queryKey: ["admin-participants"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const deleteMut = useMutation({
    mutationFn: async (userId: string) => {
      const { error } = await supabase.rpc("admin_delete_participant", { target_user_id: userId });
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Participante eliminado");
      setDeletingId(null);
      qc.invalidateQueries({ queryKey: ["admin-participants"] });
    },
    onError: (e: Error) => { toast.error(e.message); setDeletingId(null); },
  });

  const participants = q.data ?? [];
  const filtered = useMemo(() => participants.filter((p) => {
    const matchesSearch = search === "" || p.display_name.toLowerCase().includes(search.toLowerCase()) || p.email.toLowerCase().includes(search.toLowerCase());
    const matchesFilter = filter === "todos" || (filter === "pagados" && p.paid) || (filter === "pendientes" && !p.paid);
    return matchesSearch && matchesFilter;
  }), [participants, search, filter]);

  const totalPagados = participants.filter((p) => p.paid).length;
  const totalPendientes = participants.filter((p) => !p.paid).length;

  return (
    <div>
      {deletingId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-background/80 backdrop-blur-sm px-4">
          <div className="glass-strong rounded-2xl p-6 max-w-sm w-full text-center">
            <Trash2 className="w-10 h-10 text-destructive mx-auto mb-3" />
            <h3 className="font-display font-bold text-xl mb-2">¿Eliminar participante?</h3>
            <p className="text-sm text-muted-foreground mb-6">Se elimina su cuenta, pronósticos y datos. No se puede deshacer.</p>
            <div className="flex gap-3">
              <button onClick={() => setDeletingId(null)} className="flex-1 glass rounded-xl py-2.5 text-sm font-medium hover:bg-card transition">Cancelar</button>
              <button onClick={() => deleteMut.mutate(deletingId)} disabled={deleteMut.isPending}
                className="flex-1 bg-destructive text-white rounded-xl py-2.5 text-sm font-semibold hover:bg-destructive/90 transition disabled:opacity-50">
                {deleteMut.isPending ? <Loader2 className="w-4 h-4 animate-spin mx-auto" /> : "Eliminar"}
              </button>
            </div>
          </div>
        </div>
      )}
      <div className="grid grid-cols-3 gap-3 mb-6">
        <div className="glass rounded-2xl p-4 text-center">
          <div className="font-display font-bold text-3xl">{participants.length}</div>
          <div className="text-xs text-muted-foreground mt-1 uppercase tracking-widest font-mono">Registrados</div>
        </div>
        <div className="glass rounded-2xl p-4 text-center">
          <div className="font-display font-bold text-3xl text-secondary">{totalPagados}</div>
          <div className="text-xs text-muted-foreground mt-1 uppercase tracking-widest font-mono">Pagaron ✅</div>
        </div>
        <div className="glass rounded-2xl p-4 text-center">
          <div className="font-display font-bold text-3xl text-gold">{totalPendientes}</div>
          <div className="text-xs text-muted-foreground mt-1 uppercase tracking-widest font-mono">Pendientes ⏳</div>
        </div>
      </div>
      <div className="flex flex-col sm:flex-row gap-3 mb-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Buscar por nombre o email..."
            className="w-full glass rounded-xl pl-9 pr-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary/40" />
        </div>
        <div className="flex gap-2">
          {(["todos", "pagados", "pendientes"] as const).map((f) => (
            <button key={f} onClick={() => setFilter(f)}
              className={`px-3 py-2 rounded-xl text-xs font-medium capitalize transition ${filter === f ? "bg-primary text-background" : "glass text-muted-foreground hover:text-foreground"}`}>
              {f}
            </button>
          ))}
        </div>
      </div>
      {q.isLoading ? (
        <div className="flex items-center justify-center py-20"><Loader2 className="w-6 h-6 animate-spin text-primary" /></div>
      ) : filtered.length === 0 ? (
        <div className="glass-strong rounded-2xl p-12 text-center text-muted-foreground">
          {participants.length === 0 ? "Todavía no hay participantes." : "No hay resultados para ese filtro."}
        </div>
      ) : (
        <div className="space-y-2">
          {filtered.map((p) => (
            <div key={p.id} className={`glass-strong rounded-2xl p-4 flex items-center gap-3 ${p.paid ? "ring-1 ring-secondary/30" : ""}`}>
              <div className="w-10 h-10 rounded-full bg-gradient-to-br from-primary/30 to-secondary/30 flex items-center justify-center overflow-hidden flex-shrink-0">
                {p.avatar_url ? <img src={p.avatar_url} alt="" className="w-full h-full object-cover" /> : <span className="font-bold text-sm">{p.display_name[0]?.toUpperCase()}</span>}
              </div>
              <div className="flex-1 min-w-0">
                <div className="font-semibold text-sm truncate">{p.display_name}</div>
                <div className="text-xs text-muted-foreground truncate">{p.email}</div>
                {p.paid && p.paid_at && (
                  <div className="text-[10px] text-secondary mt-0.5 flex items-center gap-1">
                    <Clock className="w-3 h-3" />{new Date(p.paid_at).toLocaleDateString("es-AR")}
                  </div>
                )}
              </div>
              <div className="text-right hidden sm:block flex-shrink-0">
                <div className="font-mono font-bold text-sm">{p.total_points} pts</div>
                <div className="text-[10px] text-muted-foreground">{p.exact_hits} exactos</div>
              </div>
              <button onClick={() => setPaidMut.mutate({ userId: p.id, paid: !p.paid })} disabled={setPaidMut.isPending}
                className={`flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold transition active:scale-95 flex-shrink-0 ${
                  p.paid ? "bg-secondary/20 text-secondary hover:bg-destructive/20 hover:text-destructive" : "bg-primary/20 text-primary hover:bg-secondary/20 hover:text-secondary"
                }`}>
                {p.paid ? <><CheckCircle2 className="w-4 h-4" /><span className="hidden sm:inline">Pagó</span></> : <><XCircle className="w-4 h-4" /><span className="hidden sm:inline">Pendiente</span></>}
              </button>
              <button onClick={() => setDeletingId(p.id)} className="w-9 h-9 flex items-center justify-center rounded-xl glass hover:bg-destructive/20 hover:text-destructive transition flex-shrink-0">
                <Trash2 className="w-4 h-4" />
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
