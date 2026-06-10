import { Chess } from "chess.js";
import { createClient } from "@/lib/supabase/server";
import { streamExplainMove } from "@/lib/ai/coach";
import { isCoachConfigured } from "@/lib/ai/client";
import { limitCoach, clientIp, tooMany } from "@/lib/security/ratelimit";
import { isPlausibleFen } from "@/lib/security/validate";
import { phaseFromFen } from "@/lib/ai/format";
import { describeMoveEffects } from "@/lib/chess/moveEffects";
import type { MoveFacts } from "@/lib/ai/types";
import type { Classification } from "@/lib/games/types";

export const runtime = "nodejs";

/**
 * Feedback del coach su una mossa giocata in ALLENAMENTO (sparring vs motore).
 * A differenza di /api/coach/explain non c'è una partita salvata: il client
 * manda la posizione, la mossa e i dati del motore calcolati lato client; il
 * server ricalcola gli effetti sulla scacchiera (deterministici, chess.js) e
 * fa spiegare il tutto al modello in streaming. Nessuna persistenza.
 */

const CLASSIFICATIONS: ReadonlySet<string> = new Set([
  "brilliant",
  "great",
  "best",
  "excellent",
  "good",
  "inaccuracy",
  "mistake",
  "miss",
  "blunder",
  "book",
]);

/** SAN plausibile: corto e con i soli caratteri della notazione. */
function cleanSan(v: unknown): string | null {
  if (typeof v !== "string") return null;
  const s = v.trim();
  if (!s || s.length > 10) return null;
  if (!/^[a-hxKQRBNO0-9=+#-]+$/.test(s)) return null;
  return s;
}

/** Testo-valutazione plausibile ("+1.4", "−0.7", "M5"), già formattato dal client. */
function cleanEvalText(v: unknown): string | null {
  if (typeof v !== "string") return null;
  const s = v.trim();
  if (!s || s.length > 8) return null;
  if (!/^[+\-−#M]?[0-9.,M]+$/.test(s)) return null;
  return s;
}

interface Body {
  fenBefore?: string;
  playedSan?: string;
  bestMoveSan?: string | null;
  evalBeforeText?: string | null;
  evalAfterText?: string | null;
  classification?: string | null;
}

export async function POST(req: Request) {
  if (!isCoachConfigured()) {
    return new Response("AI coach not configured.", { status: 503 });
  }

  let body: Body;
  try {
    body = (await req.json()) as Body;
  } catch {
    return new Response("Invalid body.", { status: 400 });
  }

  const fenBefore = body.fenBefore;
  const playedSan = cleanSan(body.playedSan);
  if (!isPlausibleFen(fenBefore) || !playedSan) {
    return new Response("fenBefore and playedSan are required.", { status: 400 });
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return new Response("Not authenticated.", { status: 401 });

  const rl = await limitCoach(user.id, clientIp(req));
  if (!rl.ok) return tooMany(rl.retryAfter);

  // Gli effetti sono anche la verifica di legalità: mossa illegale → 400.
  const playedEffects = describeMoveEffects(fenBefore, playedSan);
  if (playedEffects === null && !isLegalSan(fenBefore, playedSan)) {
    return new Response("Illegal move for the given position.", { status: 400 });
  }
  const bestMoveSan = cleanSan(body.bestMoveSan);
  const bestEffects =
    bestMoveSan && bestMoveSan !== playedSan ? describeMoveEffects(fenBefore, bestMoveSan) : null;

  const classification =
    typeof body.classification === "string" && CLASSIFICATIONS.has(body.classification)
      ? (body.classification as Classification)
      : null;

  const { data: profile } = await supabase
    .from("profiles")
    .select("elo_estimate")
    .eq("id", user.id)
    .maybeSingle<{ elo_estimate: number | null }>();

  const facts: MoveFacts = {
    fenBefore,
    playedSan,
    classification,
    bestMoveSan: bestMoveSan ?? null,
    evalBeforeText: cleanEvalText(body.evalBeforeText),
    evalAfterText: cleanEvalText(body.evalAfterText),
    phase: phaseFromFen(fenBefore),
    mover: fenBefore.split(/\s+/)[1] === "b" ? "black" : "white",
    playedEffects,
    bestEffects,
  };

  const encoder = new TextEncoder();
  const stream = new ReadableStream<Uint8Array>({
    async start(controller) {
      try {
        await streamExplainMove(facts, profile?.elo_estimate ?? null, (t) =>
          controller.enqueue(encoder.encode(t)),
        );
        controller.close();
      } catch (e) {
        const msg = e instanceof Error ? e.message : "Coach error.";
        controller.enqueue(encoder.encode(`\n[Error: ${msg}]`));
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

/** Legalità pura della SAN (per distinguere "illegale" da "nessun effetto notevole"). */
function isLegalSan(fen: string, san: string): boolean {
  try {
    const c = new Chess(fen);
    return Boolean(c.move(san));
  } catch {
    return false;
  }
}
