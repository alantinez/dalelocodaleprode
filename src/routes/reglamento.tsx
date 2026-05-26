import { createFileRoute } from "@tanstack/react-router";
import { Navbar } from "@/components/landing/Navbar";
import { Reglamento } from "@/components/landing/Reglamento";

export const Route = createFileRoute("/reglamento")({
  component: ReglamentoPage,
  head: () => ({
    meta: [
      { title: "Reglamento · Dale Dale" },
      { name: "description", content: "Sistema de puntos y reglamento oficial del Prode Mundial 2026." },
    ],
  }),
});

function ReglamentoPage() {
  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <main className="pt-24">
        <Reglamento />
      </main>
    </div>
  );
}
