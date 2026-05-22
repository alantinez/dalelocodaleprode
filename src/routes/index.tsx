import { createFileRoute } from "@tanstack/react-router";
import { Navbar } from "@/components/landing/Navbar";
import { Hero } from "@/components/landing/Hero";
import { PrizePool } from "@/components/landing/PrizePool";
import { Features } from "@/components/landing/Features";
import { RankingPreview } from "@/components/landing/RankingPreview";
import { CtaBand } from "@/components/landing/CtaBand";
import { TransferimeRaton } from "@/components/landing/TransferimeRaton";
import { Footer } from "@/components/landing/Footer";

export const Route = createFileRoute("/")({
  component: Index,
});

function Index() {
  return (
    <div className="min-h-screen">
      <Navbar />
      <main>
<Hero />
<PrizePool />
<Features />
<RankingPreview />
<TransferimeRaton />
<CtaBand />
      </main>
      <Footer />
    </div>
  );
}
