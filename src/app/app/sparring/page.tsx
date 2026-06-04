import { SparringBoard } from "@/components/sparring/SparringBoard";
import { MobilePageHeader } from "@/components/layout/MobilePageHeader";

export const metadata = { title: "Sparring — Shakh" };

export default function SparringPage() {
  return (
    <div className="space-y-6">
      <MobilePageHeader
        eyebrow="Contro il motore"
        title="Sparring"
        desc="Partite intere contro una personalità e una forza scelte da te."
      />
      <div className="hidden md:block">
        <h1 className="font-display text-2xl font-semibold tracking-tight">Sparring</h1>
        <p className="mt-2 max-w-2xl text-text-muted">
          Gioca partite intere contro il motore con una <strong>personalità</strong> e una forza
          scelte da te: aggressivo, posizionale o solido. Allena le tue aperture e affina il gioco
          contro stili diversi.
        </p>
      </div>
      <SparringBoard />
    </div>
  );
}
