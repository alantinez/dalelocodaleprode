import { Link } from "@tanstack/react-router";
import { Trophy } from "lucide-react";
 
export function Footer() {
  return (
    <footer className="relative border-t border-border/60 py-10">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 flex flex-col sm:flex-row items-center justify-between gap-6">
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-md bg-gradient-to-br from-primary to-secondary flex items-center justify-center">
            <Trophy className="w-4 h-4 text-background" strokeWidth={2.5} />
          </div>
          <span className="font-display font-bold text-sm">Dale Dale · Mundial 2026</span>
        </div>
        <div className="flex items-center gap-6 text-xs font-mono text-muted-foreground">
          <Link to="/fixture" className="hover:text-foreground transition">Fixture</Link>
          <Link to="/ranking" className="hover:text-foreground transition">Ranking</Link>
          <Link to="/chat" className="hover:text-foreground transition">Chat</Link>
          <Link to="/stats" className="hover:text-foreground transition">Stats</Link>
        </div>
        <p className="text-xs font-mono uppercase tracking-widest text-muted-foreground">
          Hecho con ⚽ entre amigos
        </p>
      </div>
    </footer>
  );
}
 
