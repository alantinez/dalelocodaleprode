import { useState, useMemo } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Loader2, Save, ShieldCheck, ShieldAlert, Crown } from "lucide-react";
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
  venue: string | null;
  status: "scheduled" | "live" | "finished" | "postponed";
  home_score: number | null;
  away_score: number | null;
  home: { name: string; code: string; flag_url: string | null } | null;
  away: { name: string; code: string; flag_url: string | null } | null;
};

function AdminPage() {
  const { isAdmin, user, loading } = useAuth();
  const qc = useQueryClient();

  const claimMut = useMutation({
    mutationFn: async () => {
      const { data, error } = await supabase.rpc("claim_admin_if_empty");
      if (error) throw error;
      return data as boolean;
    },
    onSuccess: (claimed) => {
      if (claimed) {
        toast.success("¡Sos admin! Recargá la página.");
        setTimeout(() => window.location.reload(), 800);
      } else {
        toast.error("Ya existe un admin. Pedile que te asigne el rol.");
      }
    },
    onError: (e: Error) => toast.error(e.message),
  });

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="w-6 h-6 animate-spin text-primary" />
      </div>
    );
  }

  if (!isAdmin) {
    return (
      <div className="min-h-screen flex items-center justify-center px-4">
        <div className="glass-strong rounded-2xl p-8 max-w-md w-full text-center">
          <ShieldAlert className="w-12 h-12 text-gold mx-auto mb-4" />
          <h2 className="font-display text-2xl font-bold mb-2">Acceso restringido</h2>
          <p className="text-sm text-muted-foreground mb-6">
            Esta sección es solo para administradores. Si sos el organizador del prode, podés reclamar el rol de admin (solo si todavía no hay ninguno).
          </p>
          <Button
            onClick={() => claimMut.mutate()}
            disabled={claimMut.isPending || !user}
            className="w-full bg-gradient-to-r from-primary to-secondary text-background font-semibold"
          >
            {claimMut.isPending ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <>
                <Crown className="w-4 h-4 mr-2" /> Reclamar admin
              </>
            )}
          </Button>
        </div>
      </div>
    );
  }

  return <AdminMatches />;
}

function AdminMatches() {
  const qc = useQueryClient();
  const [filter, setFilter] = useState<"todos" | "pendientes" | "finalizados">("pendientes");

  const matchesQ = useQuery({
    queryKey: ["admin-matches"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("matches")
        .select(
          `id, kickoff, group, venue, status, home_score, away_score,
           home:teams!matches_home_team_id_fkey(name,code,flag_url),
           away:teams!matches_away_team_id_fkey(name,code,flag_url)`,
        )
        .order("kickoff", { ascending: true });
      if (error) throw error;
      return data as unknown as AdminMatch[];
    },
  });

  const saveMut = useMutation({
    mutationFn: async (vars: { id: string; home: number; away: number }) => {
      const { error } = await supabase
        .from("matches")
        .update({
          home_score: vars.home,
          away_score: vars.away,
          status: "finished",
        })
        .eq("id", vars.id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Resultado guardado · puntos recalculados");
      qc.invalidateQueries({ queryKey: ["admin-matches"] });
      qc.invalidateQueries({ queryKey: ["ranking"] });
      qc.invalidateQueries({ queryKey: ["matches"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const filtered = useMemo(() => {
    const list = matchesQ.data ?? [];
    return list.filter((m) => {
      if (filter === "pendientes") return m.status !== "finished";
      if (filter === "finalizados") return m.status === "finished";
      return true;
    });
  }, [matchesQ.data, filter]);

  return (
    <div className="min-h-screen bg-background pt-28 pb-20">
      <main className="mx-auto max-w-4xl px-4 sm:px-6">
        <div className="flex items-center gap-3 mb-2">
          <ShieldCheck className="w-5 h-5 text-primary" />
          <span className="font-mono text-xs uppercase tracking-widest text-primary">Panel admin</span>
        </div>
        <h1 className="font-display text-4xl sm:text-5xl font-bold tracking-tight mb-3">
          Cargar <span className="text-gradient-hero">resultados</span>
        </h1>
        <p className="text-muted-foreground mb-8">
          Al guardar un partido como finalizado, se recalculan automáticamente los puntos de todos los participantes.
        </p>

        <div className="flex gap-2 mb-6">
          {(["pendientes", "finalizados", "todos"] as const).map((f) => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium uppercase tracking-wider transition ${
                filter === f
                  ? "bg-primary text-background"
                  : "glass text-muted-foreground hover:text-foreground"
              }`}
            >
              {f}
            </button>
          ))}
        </div>

        {matchesQ.isLoading ? (
          <div className="flex items-center justify-center py-20">
            <Loader2 className="w-6 h-6 animate-spin text-primary" />
          </div>
        ) : (
          <div className="space-y-3">
            {filtered.map((m) => (
              <AdminMatchRow key={m.id} match={m} onSave={(h, a) => saveMut.mutate({ id: m.id, home: h, away: a })} saving={saveMut.isPending} />
            ))}
          </div>
        )}
      </main>
    </div>
  );
}

function AdminMatchRow({
  match,
  onSave,
  saving,
}: {
  match: AdminMatch;
  onSave: (home: number, away: number) => void;
  saving: boolean;
}) {
  const [home, setHome] = useState<string>(match.home_score?.toString() ?? "");
  const [away, setAway] = useState<string>(match.away_score?.toString() ?? "");
  const isFinished = match.status === "finished";

  return (
    <div className={`glass-strong rounded-2xl p-4 sm:p-5 ${isFinished ? "ring-1 ring-primary/40" : ""}`}>
      <div className="flex items-center justify-between mb-3 text-[10px] sm:text-xs font-mono uppercase tracking-widest text-muted-foreground">
        <span>{formatKickoff(new Date(match.kickoff))}</span>
        <div className="flex items-center gap-2">
          {match.group && <span className="text-primary">Grupo {match.group}</span>}
          {isFinished && <span className="px-2 py-0.5 rounded bg-primary/15 text-primary">FINAL</span>}
        </div>
      </div>
      <div className="grid grid-cols-[1fr_auto_1fr] gap-3 items-center">
        <div className="flex items-center gap-2 justify-end min-w-0">
          <span className="font-semibold truncate text-sm sm:text-base text-right">{match.home?.name}</span>
          {match.home?.flag_url && <img src={match.home.flag_url} alt="" className="w-6 h-6 rounded shrink-0" />}
        </div>
        <div className="flex items-center gap-1.5">
          <Input
            type="number"
            inputMode="numeric"
            min={0}
            max={20}
            value={home}
            onChange={(e) => setHome(e.target.value)}
            className="w-14 h-12 text-center font-display text-2xl font-bold"
          />
          <span className="text-muted-foreground">·</span>
          <Input
            type="number"
            inputMode="numeric"
            min={0}
            max={20}
            value={away}
            onChange={(e) => setAway(e.target.value)}
            className="w-14 h-12 text-center font-display text-2xl font-bold"
          />
        </div>
        <div className="flex items-center gap-2 min-w-0">
          {match.away?.flag_url && <img src={match.away.flag_url} alt="" className="w-6 h-6 rounded shrink-0" />}
          <span className="font-semibold truncate text-sm sm:text-base">{match.away?.name}</span>
        </div>
      </div>
      <div className="mt-3 flex justify-end">
        <Button
          size="sm"
          onClick={() => {
            const h = parseInt(home, 10);
            const a = parseInt(away, 10);
            if (isNaN(h) || isNaN(a) || h < 0 || a < 0) {
              toast.error("Ingresá goles válidos");
              return;
            }
            onSave(h, a);
          }}
          disabled={saving}
          className="bg-gradient-to-r from-primary to-secondary text-background font-semibold"
        >
          {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <><Save className="w-3.5 h-3.5 mr-1.5" /> {isFinished ? "Actualizar" : "Guardar final"}</>}
        </Button>
      </div>
    </div>
  );
}