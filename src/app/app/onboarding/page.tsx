import Link from "next/link";
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
  CardFooter,
} from "@/components/ui/card";

/**
 * Placeholder onboarding/diagnostico. Lo riempie il prompt 07.
 */
export default function OnboardingPage() {
  return (
    <div className="mx-auto flex min-h-[60vh] max-w-lg items-center">
      <Card className="w-full">
        <CardHeader>
          <CardTitle>Benvenuto in Shakh</CardTitle>
          <CardDescription>
            Qui costruiremo il tuo profilo con un breve diagnostico per stimare
            il tuo livello. Per ora è solo un segnaposto.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-text-muted">
            Il diagnostico arriverà con un prossimo aggiornamento.
          </p>
        </CardContent>
        <CardFooter>
          <Link
            href="/app"
            className="inline-flex h-10 items-center rounded-md bg-text px-4 text-sm font-medium text-bg hover:opacity-90"
          >
            Vai alla dashboard
          </Link>
        </CardFooter>
      </Card>
    </div>
  );
}
