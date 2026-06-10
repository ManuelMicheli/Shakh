import { createClient } from "@/lib/supabase/server";
import { streamExplainMove } from "@/lib/ai/coach";
import { isCoachConfigured } from "@/lib/ai/client";
import { limitCoach, clientIp, tooMany } from "@/lib/security/ratelimit";
import { evalText, phaseFromFen, moverFromPly } from "@/lib/ai/format";
import { describeMoveEffects } from "@/lib/chess/moveEffects";
import type { MoveFacts } from "@/lib/ai/types";
import type { Classification } from "@/lib/games/types";

/** Posizione iniziale standard, usata come "prima" del 1° semimosso. */
const START_FEN = "rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1";

export const runtime = "nodejs";

interface Body {
  gameId?: string;
  ply?: number;
}

/**
 * Funzione A — spiegazione di una mossa, in streaming.
 * Verifica la proprietà via RLS, ancora la spiegazione ai dati del motore già
 * salvati e persiste il risultato in `game_analysis.ai_comment` (no rigenerazione).
 */
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
  const { gameId, ply } = body;
  if (!gameId || typeof ply !== "number") {
    return new Response("gameId and ply are required.", { status: 400 });
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return new Response("Not authenticated.", { status: 401 });

  // Carica la mossa e la precedente (per la FEN "prima"). RLS filtra alle proprie partite.
  const { data: rows, error } = await supabase
    .from("game_analysis")
    .select("ply, san, fen, eval_before, eval_after, best_move_san, classification, ai_comment")
    .eq("game_id", gameId)
    .in("ply", ply > 1 ? [ply - 1, ply] : [ply]);

  if (error) return new Response(error.message, { status: 500 });
  const row = rows?.find((r) => r.ply === ply);
  if (!row) return new Response("Move not found.", { status: 404 });

  const encoder = new TextEncoder();

  // Già commentata: restituisci il testo salvato senza richiamare l'API.
  if (typeof row.ai_comment === "string" && row.ai_comment.trim()) {
    const cached = row.ai_comment;
    return new Response(
      new ReadableStream<Uint8Array>({
        start(controller) {
          controller.enqueue(encoder.encode(cached));
          controller.close();
        },
      }),
      { headers: streamHeaders() },
    );
  }

  // Da qui si genera davvero (non in cache): applica il rate limit (§6).
  const rl = await limitCoach(user.id, clientIp(req));
  if (!rl.ok) return tooMany(rl.retryAfter);

  const prevFen = ply > 1 ? rows?.find((r) => r.ply === ply - 1)?.fen ?? START_FEN : START_FEN;

  const { data: profile } = await supabase
    .from("profiles")
    .select("elo_estimate")
    .eq("id", user.id)
    .maybeSingle<{ elo_estimate: number | null }>();

  // Effetti deterministici sulla scacchiera (chess.js): mai inventati dal modello.
  const playedEffects = describeMoveEffects(prevFen, row.san);
  const bestEffects =
    row.best_move_san && row.best_move_san !== row.san
      ? describeMoveEffects(prevFen, row.best_move_san)
      : null;

  const facts: MoveFacts = {
    fenBefore: prevFen,
    playedSan: row.san,
    classification: (row.classification as Classification | null) ?? null,
    bestMoveSan: row.best_move_san ?? null,
    evalBeforeText: evalText(row.eval_before),
    evalAfterText: evalText(row.eval_after),
    phase: phaseFromFen(prevFen),
    mover: moverFromPly(ply),
    playedEffects,
    bestEffects,
  };

  const stream = new ReadableStream<Uint8Array>({
    async start(controller) {
      try {
        const full = await streamExplainMove(facts, profile?.elo_estimate ?? null, (t) =>
          controller.enqueue(encoder.encode(t)),
        );
        // Persisti il commento generato (caching): non rigenerare in futuro.
        if (full) {
          await supabase
            .from("game_analysis")
            .update({ ai_comment: full })
            .eq("game_id", gameId)
            .eq("ply", ply);
        }
        controller.close();
      } catch (e) {
        const msg = e instanceof Error ? e.message : "Coach error.";
        controller.enqueue(encoder.encode(`\n[Error: ${msg}]`));
        controller.close();
      }
    },
  });

  return new Response(stream, { headers: streamHeaders() });
}

function streamHeaders(): HeadersInit {
  return {
    "Content-Type": "text/plain; charset=utf-8",
    "Cache-Control": "no-store",
    "X-Accel-Buffering": "no",
  };
}
