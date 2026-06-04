import { PrepLab } from "@/components/prep/PrepLab";
import { MobilePageHeader } from "@/components/layout/MobilePageHeader";

export const metadata = { title: "Opponent preparation — Shakh" };

export default function PreparazionePage() {
  return (
    <div className="space-y-8">
      <MobilePageHeader
        eyebrow="Study your opponent"
        title="Preparation"
        desc="What they play by color, how well, and where they do worst."
      />
      <div className="hidden md:block">
        <h1 className="font-display text-3xl font-semibold tracking-tight">
          Opponent preparation
        </h1>
        <p className="mt-2 max-w-2xl text-text-muted">
          Enter your opponent&apos;s username: we analyze their public games
          and show you what they play by color, how well, and where they do worst —
          the openings to target.
        </p>
      </div>
      <PrepLab />
    </div>
  );
}
