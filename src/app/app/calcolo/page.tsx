import { createClient, getUser } from "@/lib/supabase/server";
import { CalculationTrainer } from "@/components/calc/CalculationTrainer";
import { getCalcPuzzle } from "./actions";
import { loadDomainRatings } from "@/lib/rating/store";

export const metadata = { title: "Calcolo — Shakh" };

export default async function CalcoloPage() {
  const supabase = await createClient();
  const user = await getUser();

  const [puzzle, domains] = await Promise.all([
    getCalcPuzzle({ targetDepth: 2, excludeIds: [] }),
    loadDomainRatings(supabase, user!.id),
  ]);

  const calc = domains.find((d) => d.domain === "calculation");
  const rating = calc && calc.samples > 0 ? Math.round(calc.state.rating) : null;

  return <CalculationTrainer initialPuzzle={puzzle} initialRating={rating} />;
}
