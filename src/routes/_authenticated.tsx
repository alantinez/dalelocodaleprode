import { createFileRoute, Outlet, useNavigate, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Loader2, AlertTriangle, Copy, Check, X, Clock } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/hooks/use-auth";
import { Navbar } from "@/components/landing/Navbar";
import { BottomNav } from "@/components/landing/BottomNav";
import { PRODE_CONFIG } from "@/lib/prode/config";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/_authenticated")({
  component: AuthenticatedLayout,
});

const CVU = "0000003100091909835217";
const ALIAS = "alan.eze.martinez";
const ALERT_THRESHOLD_MS = 2 * 60 * 60 * 1000;

function PaymentBanner() {
  const [dismissed, setDismissed] = useState(false);
  const [copiedCvu, setCopiedCvu] = useState(false);
  const [copiedAlias, setCopiedAlias] = useState(false);
  const now = new Date();
  const started = now >= PRODE_CONFIG.worldCupStart;
  if (dismissed) return null;

  const copy = async (text: string, setter: (v: boolean) => void) => {
    await navigator.clipboard.writeText(text);
    setter(true);
    setTimeout(() => setter(false), 1800);
  };

  return (
    <div className={`fixed top-0 inset-x-0 z-[60] ${
      started ? "bg-destructive/95 backdrop-blur-md" : "bg-background/80 border-b border-gold/40 backdrop-blur-md"
    }`}>
      <div className="mx-auto max-w-4xl px-4 py-3 flex flex-col sm:flex-row items-start sm:items-center gap-3">
        <AlertTriangle className={`w-5 h-5 flex-shrink-0 mt-0.5 sm:mt-0 ${started ? "text-white" : "text-gold"}`} />
        <div className="flex-1 min-w-0">
          <p className={`text-sm font-semibold ${started ? "text-white" : "text-gold"}`}>
            {started ? "⚠️ El Mundial arrancó — confirmá tu pago para poder predecir" : "💸 Confirmá tu pago antes del 11 Jun para poder jugar"}
          </p>
          <div className="flex flex-wrap items-center gap-2 mt-1.5">
            <button onClick={() => copy(ALIAS, setCopiedAlias)} className="inline-flex items-center gap-1 text-xs glass px-2 py-1 rounded-md font-mono">
              {copiedAlias ? <Check className="w-3 h-3 text-secondary" /> : <Copy className="w-3 h-3" />}{ALIAS}
            </button>
            <button onClick={() => copy(CVU, setCopiedCvu)} className="inline-flex items-center gap-1 text-xs glass px-2 py-1 rounded-md font-mono">
              {copiedCvu ? <Check className="w-3 h-3 text-secondary" /> : <Copy className="w-3 h-3" />}CVU
            </button>
            <Link to="/" hash="transferir" className="text-xs bg-primary/20 hover:bg-primary/30 text-primary px-3 py-1 rounded-md font-semibold transition">
              Ver datos completos →
            </Link>
          </div>
        </div>
        {!started && (
          <button onClick={() => setDismissed(true)} className="self-start sm:self-center text-muted-foreground hover:text-foreground transition flex-shrink-0">
            <X className="w-4 h-4" />
          </button>
        )}
      </div>
    </div>
  );
}

type UpcomingMatch = {
  id: string; kickoff: string; group: string | null;
  home: { name: string; code: string; flag_url: string | null } | null;
  away: { name: string; code: string; flag_url: string | null } | null;
  hasPrediction: boolean;
};

function useUpcomingMatch(userId: string | undefined) {
  return useQuery({
    queryKey: ["upcoming-match-alert", userId],
    enabled: !!userId,
    refetchInterval: 60_000,
    queryFn: async () => {
      const now = new Date();
      const threshold = new Date(now.getTime() + ALERT_THRESHOLD_MS);
      const { data: matches, error } = await supabase
        .from("matches")
        .select(`id, kickoff, group,
          home:teams!matches_home_team_id_fkey(name, code, flag_url),
          away:teams!matches_away_team_id_fkey(name, code, flag_url)`)
        .eq("status", "scheduled")
        .gte("kickoff", now.toISOString())
        .lte("kickoff", threshold.toISOString())
        .order("kickoff", { ascending: true })
        .limit(1);
      if (error || !matches || matches.length === 0) return null;
      const match = matches[0] as any;
      const { data: pred } = await supabase
        .from("predictions").select("match_id")
        .eq("match_id", match.id).eq("user_id", userId!).maybeSingle();
      return { ...match, hasPrediction: !!pred } as UpcomingMatch;
    },
  });
}

function pad(n: number) { return String(n).padStart(2, "0"); }

function MatchAlertBanner({ match, onDismiss }: { match: UpcomingMatch; onDismiss: () => void }) {
  const [ms, setMs] = useState(() => Math.max(0, new Date(match.kickoff).getTime() - Date.now()));
  useEffect(() => {
    const id = setInterval(() => {
      const remaining = Math.max(0, new Date(match.kickoff).getTime() - Date.now());
      setMs(remaining);
      if (remaining === 0) clearInterval(id);
    }, 1000);
    return () => clearInterval(id);
  }, [match.kickoff]);
  if (ms === 0) return null;
  const h = Math.floor(ms / 3_600_000);
  const m = Math.floor((ms % 3_600_000) / 60_000);
  const s = Math.floor((ms % 60_000) / 1_000);
  const timeStr = h > 0 ? `${h}h ${pad(m)}m` : `${pad(m)}m ${pad(s)}s`;
  const urgent = ms < 30 * 60 * 1000;
  return (
    <div className={`fixed top-0 inset-x-0 z-[60] backdrop-blur-md border-b transition-colors ${urgent ? "bg-destructive/10 border-destructive/30" : "bg-primary/5 border-primary/20"}`}>
      <div className="mx-auto max-w-4xl px-4 py-2.5 flex items-center gap-3">
        <div className={`flex items-center gap-1.5 text-xs font-mono font-bold flex-shrink-0 ${urgent ? "text-destructive" : "text-primary"}`}>
          {urgent && <span className="relative flex h-2 w-2"><span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-current opacity-75" /><span className="relative inline-flex rounded-full h-2 w-2 bg-current" /></span>}
          {!urgent && <Clock className="w-3.5 h-3.5" />}
          {timeStr}
        </div>
        <div className="flex items-center gap-2 flex-1 min-w-0">
          <div className="flex items-center gap-1.5 text-sm font-medium">
            {match.home?.flag_url && <img src={match.home.flag_url} alt="" className="w-5 h-5 rounded-full object-cover flex-shrink-0" />}
            <span className="hidden sm:inline truncate">{match.home?.name}</span>
            <span className="sm:hidden font-mono text-xs">{match.home?.code}</span>
          </div>
          <span className="text-muted-foreground text-xs font-mono flex-shrink-0">vs</span>
          <div className="flex items-center gap-1.5 text-sm font-medium">
            {match.away?.flag_url && <img src={match.away.flag_url} alt="" className="w-5 h-5 rounded-full object-cover flex-shrink-0" />}
            <span className="hidden sm:inline truncate">{match.away?.name}</span>
            <span className="sm:hidden font-mono text-xs">{match.away?.code}</span>
          </div>
          {match.group && <span className="hidden sm:inline text-[10px] font-mono px-1.5 py-0.5 rounded bg-primary/15 text-primary flex-shrink-0">Grupo {match.group}</span>}
        </div>
        <div className="flex items-center gap-2 flex-shrink-0">
          {!match.hasPrediction && (
            <Link to="/fixture" className={`text-xs font-semibold px-3 py-1.5 rounded-lg transition ${urgent ? "bg-destructive text-white hover:bg-destructive/90" : "bg-primary text-background hover:bg-primary/90"}`}>
              {urgent ? "¡Último momento!" : "Pronosticá →"}
            </Link>
          )}
          {match.hasPrediction && <span className="text-xs text-secondary font-mono flex-shrink-0">✓ Ya predijiste</span>}
          <button onClick={onDismiss} className="text-muted-foreground hover:text-foreground transition"><X className="w-4 h-4" /></button>
        </div>
      </div>
    </div>
  );
}

function AuthenticatedLayout() {
  const { session, loading, profile, user } = useAuth();
  const navigate = useNavigate();
  const [matchDismissed, setMatchDismissed] = useState<string | null>(null);

  const upcomingQ = useUpcomingMatch(user?.id);
  const upcomingMatch = upcomingQ.data;
  const showMatchBanner = !!upcomingMatch && upcomingMatch.id !== matchDismissed;

  useEffect(() => {
    if (!loading && !session) navigate({ to: "/auth" });
  }, [loading, session, navigate]);

  if (loading || !session) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  const unpaid = profile !== null && profile?.paid === false;
  const bannerCount = (unpaid ? 1 : 0) + (showMatchBanner ? 1 : 0);
  // pb-24 en mobile para dejar espacio al BottomNav, pb-20 en desktop
  const ptClass = bannerCount === 2 ? "pt-56 pb-24 md:pb-20" : bannerCount === 1 ? "pt-44 pb-24 md:pb-20" : "pt-28 pb-24 md:pb-20";
  const navOffset = bannerCount > 0;

  return (
    <div className="min-h-screen">
      {unpaid && <PaymentBanner />}
      {showMatchBanner && upcomingMatch && (
        <div className={unpaid ? "mt-12 sm:mt-11" : ""}>
          <MatchAlertBanner match={upcomingMatch} onDismiss={() => setMatchDismissed(upcomingMatch.id)} />
        </div>
      )}
      <Navbar hasBanner={navOffset} />
      <main className={ptClass}>
        <Outlet />
      </main>
      <BottomNav />
    </div>
  );
}
