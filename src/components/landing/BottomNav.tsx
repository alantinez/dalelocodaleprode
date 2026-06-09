import { Link } from "@tanstack/react-router";
import { Swords, Trophy, Calendar, User, LayoutGrid } from "lucide-react";
import { useAuth } from "@/hooks/use-auth";

const NAV_ITEMS = [
  { to: "/fixture",   icon: Swords,      label: "Fixture"  },
  { to: "/standings", icon: LayoutGrid,  label: "Grupos"   },
  { to: "/ranking",   icon: Trophy,      label: "Ranking"  },
  { to: "/resumen",   icon: Calendar,    label: "Fechas"   },
  { to: "/perfil",    icon: User,        label: "Perfil"   },
] as const;

export function BottomNav() {
  const { user } = useAuth();
  if (!user) return null;

  return (
    <nav className="fixed bottom-0 inset-x-0 z-50 md:hidden">
      {/* Blur backdrop */}
      <div className="absolute inset-0 bg-background/80 backdrop-blur-md border-t border-border/50" />
      {/* Safe area padding for notch phones */}
      <div className="relative flex items-center justify-around px-2 pt-2 pb-[env(safe-area-inset-bottom,8px)]">
        {NAV_ITEMS.map(({ to, icon: Icon, label }) => (
          <Link
            key={to}
            to={to}
            className="flex flex-col items-center gap-0.5 px-3 py-1.5 rounded-xl transition-all text-muted-foreground hover:text-foreground active:scale-95"
            activeProps={{ className: "text-primary" }}
          >
            {({ isActive }: { isActive: boolean }) => (
              <>
                <div className={`w-8 h-8 flex items-center justify-center rounded-xl transition-all ${
                  isActive ? "bg-primary/15" : ""
                }`}>
                  <Icon className={`w-5 h-5 transition-all ${isActive ? "text-primary" : ""}`} strokeWidth={isActive ? 2.5 : 1.8} />
                </div>
                <span className={`text-[9px] font-mono tracking-wide transition-all ${isActive ? "text-primary font-bold" : ""}`}>
                  {label}
                </span>
              </>
            )}
          </Link>
        ))}
      </div>
    </nav>
  );
}
