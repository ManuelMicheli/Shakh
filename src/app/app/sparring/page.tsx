import { SparringBoard } from "@/components/sparring/SparringBoard";

export const metadata = { title: "Sparring — Shakh" };

export default function SparringPage() {
  return (
    <div className="mx-auto max-w-4xl space-y-6">
      <div>
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
