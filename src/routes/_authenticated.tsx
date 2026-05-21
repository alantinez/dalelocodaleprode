import { createFileRoute, Outlet, useNavigate, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Loader2, AlertTriangle, Copy, Check, X } from "lucide-react";
import { useAuth } from "@/hooks/use-auth";
import { Navbar } from "@/components/landing/Navbar";
import { PRODE_CONFIG } from "@/lib/prode/config";

export const Route = createFileRoute("/_authenticated")({
  component: AuthenticatedLayout,
});

const CVU = "0000003100091909835217";
const ALIAS = "alan.eze.martinez";
const WHATSAPP = "https://wa.me/549XXXXXXXXXX?text=Hola%20Alan%2C%20ya%20te%20transfe%20para%20el%20prode%20%F0%9F%8F%86";

function PaymentBanner() {
  const [dismissed, setDismissed] = useState(false);
  const [copiedCvu, setCopiedCvu] = useState(false);
  const [copiedAlias, setCopiedAlias] = useState(false);
  const now = new Date();
  const firstMatch = PRODE_CONFIG.worldCupStart;
  const started = now >= firstMatch;

  if (dismissed) return null;

  const copy = async (text: string, setter: (v: boolean) => void) => {
    await navigator.clipboard.writeText(text);
    setter(true);
    setTimeout(() => setter(false), 1800);
  };

  return (
    <div className={`fixed top-0 inset-x-0 z-50 ${started ? "bg-destructive/95" : "bg-gold/10 border-b border-gold/30 backdrop-blur-md"}`}>
      <div className="mx-auto max-w-4xl px-4 py-3 flex flex-col sm:flex-row items-start sm:items-center gap-3">
        <AlertTriangle className={`w-5 h-5 flex-shrink-0 ${started ? "text-white" : "text-gold"}`} />
        <div className="flex-1 min-w-0">
          <p className={`text-sm font-semibold ${started ? "text-white" : "text-gold"}`}>
            {started
              ? "⚠️ El Mundial arrancó — confirmá tu pago para poder predecir"
              : "💸 Confirmá tu pago antes del 11 de junio para poder jugar"}
          </p>
          <div className="flex flex-wrap items-center gap-2 mt-1.5">
            <button
              onClick={() => copy(ALIAS, setCopiedAlias)}
              className="inline-flex items-center gap-1 text-xs glass px-2 py-1 rounded-md font-mono"
            >
              {copiedAlias ? <Check className="w-3 h-3 text-secondary" /> : <Copy className="w-3 h-3" />}
              {ALIAS}
            </button>
            <button
              onClick={() => copy(CVU, setCopiedCvu)}
              className="inline-flex items-center gap-1 text-xs glass px-2 py-1 rounded-md font-mono"
            >
              {copiedCvu ? <Check className="w-3 h-3 text-secondary" /> : <Copy className="w-3 h-3" />}
              CVU
            </button>
            
              href={WHATSAPP}
              target="_blank"
              rel="noopener noreferrer"
              className="text-xs bg-green-600 hover:bg-green-500 text-white px-3 py-1 rounded-md font-semibold transition"
            >
              Ya pagué → Avisarle a Alan
            </a>
            <Link
              to="/"
              hash="transferir"
              className="text-xs underline text-muted-foreground hover:text-foreground"
            >
              Ver datos de pago
            </Link>
          </div>
        </div>
        {!started && (
          <button
            onClick={() => setDismissed(true)}
            className="self-start sm:self-center text-muted-foreground hover:text-foreground transition flex-shrink-0"
          >
            <X className="w-4 h-4" />
          </button>
        )}
      </div>
    </div>
  );
}

function AuthenticatedLayout() {
  const { session, loading, profile } = useAuth();
  const navigate = useNavigate();

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

  return (
    <div className="min-h-screen">
      {unpaid && <PaymentBanner />}
      <Navbar hasBanner={unpaid} />
      <main className={unpaid ? "pt-40 pb-20" : "pt-28 pb-20"}>
        <Outlet />
      </main>
    </div>
  );
}
