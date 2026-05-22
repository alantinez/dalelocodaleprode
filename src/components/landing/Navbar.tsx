import { useState } from "react";
import { Link } from "@tanstack/react-router";
import { Trophy, LogIn, ShieldCheck, BarChart3, Menu, X, MessageCircle } from "lucide-react";
import { useAuth } from "@/hooks/use-auth";
 
export function Navbar({ hasBanner = false }: { hasBanner?: boolean }) {
  const { user, profile, isAdmin } = useAuth();
  const [open, setOpen] = useState(false);
 
  const initials = profile?.display_name
    ?.split(" ")
    .map((s) => s[0])
    .slice(0, 2)
    .join("")
    .toUpperCase() ?? "?";
 
  const close = () => setOpen(false);
 
  return (
    <>
      <header className={`fixed left-0 right-0 z-40 transition-all ${hasBanner ? "top-14 sm:top-12" : "top-0"}`}>
        <div className="mx-auto max-w-7xl px-4 sm:px-6 pt-4">
          <nav className="glass-strong rounded-2xl px-4 sm:px-6 py-3 flex items-center justify-between">
            {/* Logo */}
            <Link to="/" className="flex items-center gap-2 group" onClick={close}>
              <div className="relative">
                <div className="absolute inset-0 rounded-lg bg-primary/40 blur-md group-hover:bg-primary/60 transition" />
                <div className="relative w-9 h-9 rounded-lg bg-gradient-to-br from-primary to-secondary flex items-center justify-center">
                  <Trophy className="w-5 h-5 text-background" strokeWidth={2.5} />
                </div>
              </div>
              <div className="flex flex-col leading-none">
                <span className="font-display font-bold text-sm tracking-tight">DALE DALE</span>
                <span className="font-mono text-[10px] text-muted-foreground tracking-widest">
                  MUNDIAL 2026
                </span>
              </div>
            </Link>
 
            {/* Desktop nav */}
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
                  <Link to="/chat" className="hover:text-primary transition inline-flex items-center gap-1" activeProps={{ className: "text-primary" }}>
                    <MessageCircle className="w-3.5 h-3.5" /> Chat
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
<Link to="/reglamento" className="hover:text-primary transition">Reglamento</Link>
<a href="/#como-funciona" className="hover:text-primary transition">Cómo funciona</a>
                  <Link to="/ranking" className="hover:text-primary transition">Ranking</Link>
                  <Link to="/stats" className="hover:text-primary transition">Stats</Link>
                  <Link to="/chat" className="hover:text-primary transition inline-flex items-center gap-1">
                    <MessageCircle className="w-3.5 h-3.5" /> Chat
                  </Link>
                </>
              )}
            </div>
 
            {/* Right side */}
            <div className="flex items-center gap-2">
              {user && profile ? (
                <Link
                  to="/perfil"
                  className="flex items-center gap-2.5 glass rounded-xl pl-2 pr-3.5 py-1.5 hover:bg-card transition"
                  onClick={close}
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
                  className="hidden md:inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-primary to-secondary px-4 sm:px-5 py-2 text-sm font-semibold text-background shadow-glow hover:scale-[1.02] transition"
                  onClick={close}
                >
                  <LogIn className="w-4 h-4" />
                  <span>Ingresar</span>
                </Link>
              )}
 
              {/* Hamburger — solo mobile */}
              <button
                onClick={() => setOpen((v) => !v)}
                className="md:hidden w-9 h-9 flex items-center justify-center glass rounded-xl hover:bg-card transition"
                aria-label="Menú"
              >
                {open ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
              </button>
            </div>
          </nav>
 
          {/* Mobile menu */}
          {open && (
            <div className="md:hidden glass-strong rounded-2xl mt-2 px-4 py-4 flex flex-col gap-1 animate-in fade-in slide-in-from-top-2 duration-200">
              {user ? (
                <>
                  <MobileLink to="/fixture" label="⚽ Fixture" onClick={close} />
                  <MobileLink to="/ranking" label="🏆 Ranking" onClick={close} />
                  <MobileLink to="/stats" label="📊 Stats" onClick={close} />
                  <MobileLink to="/chat" label="💬 Chat" onClick={close} />
                  <MobileLink to="/perfil" label="👤 Mi perfil" onClick={close} />
                  {isAdmin && (
                    <MobileLink to="/admin" label="🛡️ Admin" onClick={close} />
                  )}
                  <div className="h-px bg-border/60 my-1" />
                  <MobileSignOut />
                </>
              ) : (
                <>
                  <a href="/#premios" onClick={close} className="flex items-center gap-3 px-3 py-3 rounded-xl hover:bg-card transition text-sm font-medium">
                    🎁 Premios
                  </a>
                  <a href="/#como-funciona" onClick={close} className="flex items-center gap-3 px-3 py-3 rounded-xl hover:bg-card transition text-sm font-medium">
                    ℹ️ Cómo funciona
                  </a>
                  <MobileLink to="/ranking" label="🏆 Ranking" onClick={close} />
                  <MobileLink to="/stats" label="📊 Stats" onClick={close} />
                  <MobileLink to="/chat" label="💬 Chat" onClick={close} />
                  <div className="h-px bg-border/60 my-1" />
                  <Link
                    to="/auth"
                    onClick={close}
                    className="flex items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-primary to-secondary px-4 py-3 text-sm font-semibold text-background shadow-glow transition mt-1"
                  >
                    <LogIn className="w-4 h-4" /> Ingresar
                  </Link>
                </>
              )}
            </div>
          )}
        </div>
      </header>
 
      {/* Backdrop */}
      {open && (
        <div className="fixed inset-0 z-30 md:hidden" onClick={close} />
      )}
    </>
  );
}
 
function MobileLink({ to, label, onClick }: { to: string; label: string; onClick: () => void }) {
  return (
    <Link
      to={to}
      onClick={onClick}
      className="flex items-center gap-3 px-3 py-3 rounded-xl hover:bg-card transition text-sm font-medium"
      activeProps={{ className: "bg-primary/10 text-primary" }}
    >
      {label}
    </Link>
  );
}
 
function MobileSignOut() {
  const { signOut } = useAuth();
  return (
    <button
      onClick={() => signOut()}
      className="flex items-center gap-3 px-3 py-3 rounded-xl hover:bg-destructive/10 hover:text-destructive transition text-sm font-medium text-muted-foreground w-full text-left"
    >
      🚪 Cerrar sesión
    </button>
  );
}
 
