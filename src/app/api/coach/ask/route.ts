import { createClient } from "@/lib/supabase/server";
import { streamAnswer } from "@/lib/ai/coach";
import { isCoachConfigured } from "@/lib/ai/client";
import { limitCoach, clientIp, tooMany } from "@/lib/security/ratelimit";
import { isPlausibleFen, clampQuestion } from "@/lib/security/validate";
import type {
  PositionFacts,
  ChatTurn,
  EngineLineFact,
} from "@/lib/ai/types";

export const runtime = "nodejs";

interface Body {
  fen?: string;
  turn?: "w" | "b";
  question?: string;
  lines?: EngineLineFact[];
  askedMove?: PositionFacts["askedMove"];
  history?: ChatTurn[];
}

/**
 * Funzione B — Q&A sulla posizione, in streaming.
 * I numeri (valutazioni e linee del motore) arrivano dal client, che ha già
 * interrogato il motore: qui il modello SPIEGA quei dati, non li ricalcola.
 */
export async function POST(req: Request) {
  if (!isCoachConfigured()) {
    return new Response("Coach AI non configurato.", { status: 503 });
  }

  let body: Body;
  try {
    body = (await req.json()) as Body;
  } catch {
    return new Response("Body non valido.", { status: 400 });
  }

  const { fen, turn } = body;
  const question = clampQuestion(body.question);
  if (!isPlausibleFen(fen) || (turn !== "w" && turn !== "b") || !question) {
    return new Response("fen, turn e question richiesti.", { status: 400 });
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return new Response("Non autenticato.", { status: 401 });

  // Rate limit per-IP e per-utente: le chiamate ad Anthropic sono costose (§6).
  const rl = await limitCoach(user.id, clientIp(req));
  if (!rl.ok) return tooMany(rl.retryAfter);

  const { data: profile } = await supabase
    .from("profiles")
    .select("elo_estimate")
    .eq("id", user.id)
    .maybeSingle<{ elo_estimate: number | null }>();

  const facts: PositionFacts = {
    fen,
    turn,
    lines: Array.isArray(body.lines) ? body.lines.slice(0, 3) : [],
    askedMove: body.askedMove,
  };

  // Memoria breve: ultime 6 battute, contenuto di ogni turno limitato per non
  // gonfiare il prompt (e quindi il costo) con payload arbitrari dal client.
  const history: ChatTurn[] = Array.isArray(body.history)
    ? body.history
        .filter((t) => (t.role === "user" || t.role === "assistant") && typeof t.content === "string")
        .slice(-6)
        .map((t) => ({ role: t.role, content: t.content.slice(0, 2000) }))
    : [];

  const encoder = new TextEncoder();
  const stream = new ReadableStream<Uint8Array>({
    async start(controller) {
      try {
        await streamAnswer(facts, history, question, profile?.elo_estimate ?? null, (t) =>
          controller.enqueue(encoder.encode(t)),
        );
        controller.close();
      } catch (e) {
        const msg = e instanceof Error ? e.message : "Errore del coach.";
        controller.enqueue(encoder.encode(`\n[Errore: ${msg}]`));
        controller.close();
      }
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/plain; charset=utf-8",
      "Cache-Control": "no-store",
      "X-Accel-Buffering": "no",
    },
  });
}
