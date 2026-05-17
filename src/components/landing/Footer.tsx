import { Trophy } from "lucide-react";

export function Footer() {
  return (
    <footer className="relative border-t border-border/60 py-10">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 flex flex-col sm:flex-row items-center justify-between gap-4">
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-md bg-gradient-to-br from-primary to-secondary flex items-center justify-center">
            <Trophy className="w-4 h-4 text-background" strokeWidth={2.5} />
          </div>
          <span className="font-display font-bold text-sm">PRODE Mundial 2026</span>
        </div>
        <p className="text-xs font-mono uppercase tracking-widest text-muted-foreground">
          Hecho con ⚽ entre amigos
        </p>
      </div>
    </footer>
  );
}