import { SparringBoard } from "@/components/sparring/SparringBoard";

export const metadata = { title: "Sparring — Shakh" };

export default function SparringPage() {
  return (
    <div className="space-y-6">
      <SparringBoard />
    </div>
  );
}
