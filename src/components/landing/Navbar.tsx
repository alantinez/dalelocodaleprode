import { Link } from "@tanstack/react-router";
import { Trophy } from "lucide-react";

export function Navbar() {
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
              <span className="font-mono text-[10px] text-muted-foreground tracking-widest">MUNDIAL 2026</span>
            </div>
          </Link>
          <div className="hidden md:flex items-center gap-6 text-sm font-medium">
            <a href="#premios" className="hover:text-primary transition">Premios</a>
            <a href="#como-funciona" className="hover:text-primary transition">Cómo funciona</a>
            <a href="#ranking" className="hover:text-primary transition">Ranking</a>
          </div>
          <button className="relative inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-primary to-secondary px-4 sm:px-5 py-2 text-sm font-semibold text-background hover:shadow-glow transition shadow-glow">
            Unirme al Prode
          </button>
        </nav>
      </div>
    </header>
  );
}