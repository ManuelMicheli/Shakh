import { PrepLab } from "@/components/prep/PrepLab";
import { MobilePageHeader } from "@/components/layout/MobilePageHeader";

export const metadata = { title: "Preparazione avversario — Shakh" };

export default function PreparazionePage() {
  return (
    <div className="space-y-8">
      <MobilePageHeader
        eyebrow="Studia l'avversario"
        title="Preparazione"
        desc="Cosa gioca per colore, con che rendimento, e dove rende peggio."
        glyph="♝"
      />
      <div className="hidden md:block">
        <h1 className="font-display text-3xl font-semibold tracking-tight">
          Preparazione avversario
        </h1>
        <p className="mt-2 max-w-2xl text-text-muted">
          Inserisci lo username del tuo avversario: analizziamo le sue partite pubbliche
          e ti mostriamo cosa gioca per colore, con che rendimento, e dove rende peggio —
          le aperture da puntare.
        </p>
      </div>
      <PrepLab />
    </div>
  );
}
