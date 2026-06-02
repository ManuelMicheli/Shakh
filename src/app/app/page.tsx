import { createClient } from "@/lib/supabase/server";
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

export default async function DashboardPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { data: profile } = await supabase
    .from("profiles")
    .select("display_name, username")
    .eq("id", user!.id)
    .maybeSingle();

  const name =
    profile?.display_name ?? profile?.username ?? "giocatore";

  const cards = [
    { title: "Le mie partite", desc: "Importa e analizza le tue partite." },
    { title: "Tattiche", desc: "Allenamento a ripetizione spaziata." },
    { title: "Teoria", desc: "Aperture, mediogioco, finali." },
    { title: "Percorso", desc: "Il tuo cammino guidato." },
  ];

  return (
    <div className="mx-auto max-w-5xl space-y-8">
      <div>
        <h1 className="font-display text-3xl font-semibold tracking-tight">
          Benvenuto, {name}
        </h1>
        <p className="mt-2 text-text-muted">
          Questo è il tuo spazio di studio. I moduli arriveranno presto.
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        {cards.map((c) => (
          <Card key={c.title} className="relative">
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle>{c.title}</CardTitle>
                <Badge variant="muted">presto</Badge>
              </div>
              <CardDescription>{c.desc}</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="h-20 rounded-md border border-dashed border-border" />
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
