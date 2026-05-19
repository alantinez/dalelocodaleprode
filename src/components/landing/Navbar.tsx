import { Link } from "@tanstack/react-router";
import { Trophy, LogIn, ShieldCheck, BarChart3 } from "lucide-react";
import { useAuth } from "@/hooks/use-auth";

export function Navbar() {
  const { user, profile, isAdmin } = useAuth();

  const initials = profile?.display_name
    ?.split(" ")
    .map((s) => s[0])
    .slice(0, 2)
    .join("")
    .toUpperCase() ?? "?";

  return (
    <header className="fixed top-0 left-0 right-0 z-50">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 pt-4">
        <nav className="glass-strong rounded-2xl px-4 sm:px-6 py-3 flex items-center justify-between">
          <Link to="/" className="flex items-center gap-2 group">
            <div className="relative">
              <div className="absolute inset-0 rounded-lg bg-primary/40 blur-md group-hover:bg-primary/60 transition" />
              <div className="relative w-9 h-9 rounded-lg bg-gradient-to-br from-primary to-secondary flex items-center justify-center">
                <Trophy className="w-5 h-5 text-background" strokeWidth={2.5} />
              </div>
            </div>
            <div className="flex flex-col leading-none">
              <span className="font-display font-bold text-sm tracking-tight">PRODE</span>
              <span className="font-mono text-[10px] text-muted-foreground tracking-widest">
                MUNDIAL 2026
              </span>
            </div>
          </Link>

          <div className="hidden md:flex items-center gap-6 text-sm font-medium">
            {user ? (
              <>
                <Link to="/fixture" className="hover:text-primary transition" activeProps={{ className: "text-primary" }}>
                  Fixture
                </Link>
                <Link to="/ranking" className="hover:text-primary transition" activeProps={{ className: "text-primary" }}>
                  Ranking
                </Link>
                <Link to="/stats" className="hover:text-primary transition inline-flex items-center gap-1" activeProps={{ className: "text-primary" }}>
                  <BarChart3 className="w-3.5 h-3.5" /> Stats
                </Link>
                <Link to="/perfil" className="hover:text-primary transition" activeProps={{ className: "text-primary" }}>
                  Mi perfil
                </Link>
                {isAdmin && (
                  <Link to="/admin" className="inline-flex items-center gap-1 hover:text-primary transition" activeProps={{ className: "text-primary" }}>
                    <ShieldCheck className="w-3.5 h-3.5" /> Admin
                  </Link>
                )}
              </>
            ) : (
              <>
                <a href="/#premios" className="hover:text-primary transition">Premios</a>
                <a href="/#como-funciona" className="hover:text-primary transition">Cómo funciona</a>
                <Link to="/ranking" className="hover:text-primary transition">Ranking</Link>
                <Link to="/stats" className="hover:text-primary transition">Stats</Link>
              </>
            )}
          </div>

          {user && profile ? (
            <Link
              to="/perfil"
              className="flex items-center gap-2.5 glass rounded-xl pl-2 pr-3.5 py-1.5 hover:bg-card transition"
            >
              <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-primary to-secondary flex items-center justify-center overflow-hidden">
                {profile.avatar_url ? (
                  <img src={profile.avatar_url} alt="" className="w-full h-full object-cover" />
                ) : (
                  <span className="text-[10px] font-bold text-background">{initials}</span>
                )}
              </div>
              <span className="text-sm font-medium hidden sm:block max-w-[120px] truncate">
                {profile.display_name}
              </span>
            </Link>
          ) : (
            <Link
              to="/auth"
              className="inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-primary to-secondary px-4 sm:px-5 py-2 text-sm font-semibold text-background shadow-glow hover:scale-[1.02] transition"
            >
              <LogIn className="w-4 h-4" />
              <span className="hidden sm:inline">Ingresar</span>
            </Link>
          )}
        </nav>
      </div>
    </header>
  );
}
