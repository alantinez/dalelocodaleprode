import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { ArrowLeft, Loader2, Trophy, Camera, Star, Activity } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Navbar } from "@/components/landing/Navbar";

export const Route = createFileRoute("/_authenticated/feed")({
  head: () => ({ meta: [{ title: "Feed de actividad · Dale Dale" }] }),
  component: FeedPage,
});

type FeedEvent = {
  event_id: string;
  event_type: "result" | "exact" | "snapshot";
  event_at: string;
  payload: Record<string, any>;
};

function timeAgo(iso: string) {
  const diff = Date.now() - new Date(iso).getTime();
  const m = Math.floor(diff / 60_000);
  const h = Math.floor(diff / 3_600_000);
  const d = Math.floor(diff / 86_400_000);
  if (m < 1) return "ahora";
  if (m < 60) return `hace ${m}m`;
  if (h < 24) return `hace ${h}h`;
  if (d < 7) return `hace ${d}d`;
  return new Date(iso).toLocaleDateString("es-AR", { day: "2-digit", month: "2-digit" });
}

function Flag({ url, name }: { url: string | null; name: string }) {
  return url
    ? <img src={url} alt={name} className="w-5 h-5 rounded-full object-cover flex-shrink-0" />
    : <span className="w-5 h-5 rounded-full bg-card flex items-center justify-center text-[9px] font-mono flex-shrink-0">{name.slice(0,3)}</span>;
}

function Avatar({ name, url }: { name: string; url: string | null }) {
  const initials = name.split(" ").map((s) => s[0]).slice(0, 2).join("").toUpperCase();
  return (
    <div className="w-7 h-7 rounded-full bg-gradient-to-br from-primary to-secondary flex items-center justify-center overflow-hidden flex-shrink-0">
      {url
        ? <img src={url} alt="" className="w-full h-full object-cover" />
        : <span className="text-[9px] font-bold text-background">{initials}</span>}
    </div>
  );
}

function ResultEvent({ p, at }: { p: Record<string, any>; at: string }) {
  const isEdit = p.is_edit;
  return (
    <div className="flex gap-4">
      <div className="flex flex-col items-center">
        <div className={`w-9 h-9 rounded-full flex items-center justify-center flex-shrink-0 ${isEdit ? "bg-orange-400/15 text-orange-400" : "bg-secondary/15 text-secondary"}`}>
          <Activity className="w-4 h-4" />
        </div>
        <div className="w-px flex-1 bg-border/30 mt-2" />
      </div>
      <div className="flex-1 pb-6 min-w-0">
        <div className="flex items-center gap-2 mb-1 flex-wrap">
          <span className={`text-xs font-mono px-2 py-0.5 rounded font-bold ${isEdit ? "bg-orange-400/15 text-orange-400" : "bg-secondary/15 text-secondary"}`}>
            {isEdit ? "Resultado corregido" : "Resultado final"}
          </span>
          {p.grp && <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-primary/15 text-primary">Grupo {p.grp}</span>}
          <span className="text-xs text-muted-foreground ml-auto">{timeAgo(at)}</span>
        </div>
        <div className="flex items-center gap-2 mt-1.5">
          <Flag url={p.home_flag} name={p.home_name} />
          <span className="text-sm font-medium truncate">{p.home_name}</span>
          <span className={`font-mono font-bold text-base px-2 flex-shrink-0 ${isEdit ? "text-orange-400" : "text-secondary"}`}>
            {p.home_score} – {p.away_score}
          </span>
          <span className="text-sm font-medium truncate">{p.away_name}</span>
          <Flag url={p.away_flag} name={p.away_name} />
        </div>
      </div>
    </div>
  );
}

function ExactEvent({ p, at }: { p: Record<string, any>; at: string }) {
  return (
    <div className="flex gap-4">
      <div className="flex flex-col items-center">
        <div className="w-9 h-9 rounded-full bg-gold/15 text-gold flex items-center justify-center flex-shrink-0">
          <Star className="w-4 h-4 fill-current" />
        </div>
        <div className="w-px flex-1 bg-border/30 mt-2" />
      </div>
      <div className="flex-1 pb-6 min-w-0">
        <div className="flex items-center gap-2 mb-1 flex-wrap">
          <span className="text-xs font-mono px-2 py-0.5 rounded font-bold bg-gold/15 text-gold">
            ⭐ Exacto
          </span>
          <span className="text-xs text-muted-foreground ml-auto">{timeAgo(at)}</span>
        </div>
        <div className="flex items-center gap-2 mt-1.5 flex-wrap">
          <Avatar name={p.display_name} url={p.avatar_url} />
          <span className="text-sm font-semibold">{p.display_name}</span>
          <span className="text-xs text-muted-foreground">acertó el exacto de</span>
          <div className="flex items-center gap-1.5">
            <Flag url={p.home_flag} name={p.home_name} />
            <span className="text-xs font-medium">{p.home_name}</span>
            <span className="font-mono text-xs font-bold text-gold">{p.home_score}-{p.away_score}</span>
            <span className="text-xs font-medium">{p.away_name}</span>
            <Flag url={p.away_flag} name={p.away_name} />
          </div>
          <span className="text-xs font-mono font-bold text-gold">+{p.points}pts</span>
        </div>
      </div>
    </div>
  );
}

function SnapshotEvent({ p, at }: { p: Record<string, any>; at: string }) {
  return (
    <div className="flex gap-4">
      <div className="flex flex-col items-center">
        <div className="w-9 h-9 rounded-full bg-primary/15 text-primary flex items-center justify-center flex-shrink-0">
          <Camera className="w-4 h-4" />
        </div>
        <div className="w-px flex-1 bg-border/30 mt-2" />
      </div>
      <div className="flex-1 pb-6 min-w-0">
        <div className="flex items-center gap-2 mb-1">
          <span className="text-xs font-mono px-2 py-0.5 rounded font-bold bg-primary/15 text-primary">
            📸 Snapshot
          </span>
          <span className="text-xs text-muted-foreground ml-auto">{timeAgo(at)}</span>
        </div>
        <p className="text-sm mt-1">
          Se guardó el ranking: <span className="font-semibold text-primary">{p.label}</span>
          <span className="text-muted-foreground text-xs ml-2">· {p.cnt} jugadores</span>
        </p>
      </div>
    </div>
  );
}

function FeedPage() {
  const q = useQuery({
    queryKey: ["activity-feed"],
    queryFn: async () => {
      const { data, error } = await supabase.rpc("get_activity_feed");
      if (error) throw error;
      return (data ?? []) as FeedEvent[];
    },
    refetchInterval: 30_000,
  });

  const events = q.data ?? [];

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <main className="mx-auto max-w-2xl px-4 sm:px-6 pt-28 pb-20">
        <Link to="/" className="inline-flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition mb-6">
          <ArrowLeft className="w-3.5 h-3.5" /> Volver
        </Link>

        <div className="flex items-center gap-3 mb-2">
          <Activity className="w-5 h-5 text-primary" />
          <span className="font-mono text-xs uppercase tracking-widest text-primary">En tiempo real</span>
        </div>
        <h1 className="font-display text-4xl sm:text-5xl font-bold tracking-tight mb-2">
          Feed de <span className="text-gradient-hero">actividad</span>
        </h1>
        <p className="text-muted-foreground mb-10">Todo lo que pasa en el prode, en orden cronológico.</p>

        {q.isLoading ? (
          <div className="flex justify-center py-20"><Loader2 className="w-6 h-6 animate-spin text-primary" /></div>
        ) : events.length === 0 ? (
          <div className="glass-strong rounded-2xl p-14 text-center">
            <Trophy className="w-10 h-10 text-muted-foreground mx-auto mb-4 opacity-30" />
            <h3 className="font-display font-bold text-xl mb-2">Sin actividad todavía</h3>
            <p className="text-sm text-muted-foreground">
              El feed se llena cuando el admin cargue resultados y los participantes aciertes pronósticos.
            </p>
          </div>
        ) : (
          <div>
            {events.map((ev) => (
              <div key={ev.event_id}>
                {ev.event_type === "result"   && <ResultEvent   p={ev.payload} at={ev.event_at} />}
                {ev.event_type === "exact"    && <ExactEvent    p={ev.payload} at={ev.event_at} />}
                {ev.event_type === "snapshot" && <SnapshotEvent p={ev.payload} at={ev.event_at} />}
              </div>
            ))}
            <div className="flex gap-4">
              <div className="w-9 flex justify-center">
                <div className="w-3 h-3 rounded-full bg-border/60 mt-1" />
              </div>
              <p className="text-xs text-muted-foreground pb-4">Inicio del prode</p>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
