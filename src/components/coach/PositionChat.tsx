"use client";

import { useRef, useState } from "react";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Spinner } from "@/components/ui/spinner";
import { engine } from "@/lib/engine/engine";
import { toWhiteRelative, formatEval } from "@/lib/engine/score";
import { uciPvToSan, uciMoveToSan, tryPlaySan } from "@/lib/chess/uciPv";
import { italianToEnglishSan, extractMoveTokens } from "@/lib/chess/sanItalian";
import type { ChatTurn, EngineLineFact, PositionFacts } from "@/lib/ai/types";

/** Profondità motore: contenuta, basta a fornire i numeri al modello. */
const LINES_DEPTH = 16;
const MOVE_DEPTH = 14;

function whiteEvalText(score: number, type: "cp" | "mate", turn: "w" | "b"): string {
  return formatEval(toWhiteRelative(score, type, turn), type).replace("-", "−");
}

/**
 * Funzione B — chat sulla posizione corrente. Prima il MOTORE (lato client)
 * calcola valutazioni e linee; poi quei numeri vanno al modello che SPIEGA.
 */
export function PositionChat({ fen, turn }: { fen: string; turn: "w" | "b" }) {
  const t = useTranslations("study");
  const [messages, setMessages] = useState<ChatTurn[]>([]);
  const [input, setInput] = useState("");
  const [busy, setBusy] = useState(false);
  const [phase, setPhase] = useState<string | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);

  /** Interroga il motore sulla posizione (e su un'eventuale mossa citata). */
  const buildFacts = async (question: string): Promise<PositionFacts> => {
    await engine.init();
    setPhase(t("chat.phase.querying"));
    const evaluation = await engine.analyze(fen, { depth: LINES_DEPTH, multiPV: 3 }).result;

    const lines: EngineLineFact[] = evaluation.lines
      .slice(0, 3)
      .map((l) => ({
        evalText: whiteEvalText(l.score, l.scoreType, turn),
        pvSan: uciPvToSan(fen, l.pv),
      }));

    const facts: PositionFacts = { fen, turn, lines };

    // Mossa concreta citata nella domanda ("perché non Cd4?").
    const bestSan = uciMoveToSan(fen, evaluation.bestMove);
    for (const raw of extractMoveTokens(question).slice(0, 4)) {
      const played = tryPlaySan(fen, italianToEnglishSan(raw));
      if (!played) continue;
      setPhase(t("chat.phase.evaluating", { san: played.san }));
      const afterTurn = (played.fen.split(" ")[1] as "w" | "b") ?? "w";
      const afterEval = await engine.analyze(played.fen, { depth: MOVE_DEPTH }).result;
      const top = afterEval.lines[0];
      if (top) {
        facts.askedMove = {
          san: played.san,
          evalText: whiteEvalText(top.score, top.scoreType, afterTurn),
          isBest: bestSan === played.san,
        };
      }
      break; // una sola mossa citata basta
    }
    return facts;
  };

  const send = async () => {
    const question = input.trim();
    if (!question || busy) return;
    setInput("");
    const history = messages.slice(-6);
    setMessages((prev) => [...prev, { role: "user", content: question }]);
    setBusy(true);

    try {
      const facts = await buildFacts(question);
      setPhase(t("chat.phase.responding"));

      const res = await fetch("/api/coach/ask", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          fen: facts.fen,
          turn: facts.turn,
          question,
          lines: facts.lines,
          askedMove: facts.askedMove,
          history,
        }),
      });
      if (!res.ok || !res.body) {
        const msg = await res.text().catch(() => t("error.coachShort"));
        setMessages((prev) => [...prev, { role: "assistant", content: t("chat.sorry", { msg }) }]);
        return;
      }

      // Aggiungi un messaggio assistente vuoto e riempilo in streaming.
      setMessages((prev) => [...prev, { role: "assistant", content: "" }]);
      const reader = res.body.getReader();
      const dec = new TextDecoder();
      let acc = "";
      for (;;) {
        const { done, value } = await reader.read();
        if (done) break;
        acc += dec.decode(value, { stream: true });
        setMessages((prev) => {
          const next = [...prev];
          next[next.length - 1] = { role: "assistant", content: acc };
          return next;
        });
        scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight });
      }
    } catch {
      setMessages((prev) => [
        ...prev,
        { role: "assistant", content: t("chat.couldntAnswer") },
      ]);
    } finally {
      setBusy(false);
      setPhase(null);
    }
  };

  return (
    <div className="space-y-3">
      <div ref={scrollRef} className="max-h-64 space-y-3 overflow-y-auto">
        {messages.length === 0 ? (
          <p className="text-sm text-text-muted">
            {t("chat.empty")}
          </p>
        ) : (
          messages.map((m, i) => (
            <div
              key={i}
              className={
                m.role === "user"
                  ? "ml-6 rounded-md bg-surface-2 p-2 text-sm"
                  : "mr-6 text-sm leading-relaxed"
              }
            >
              {m.content || (busy && i === messages.length - 1 ? "…" : "")}
            </div>
          ))
        )}
        {busy && phase && (
          <p className="flex items-center gap-2 text-xs text-text-muted">
            <Spinner /> {phase}
          </p>
        )}
      </div>

      <form
        onSubmit={(e) => {
          e.preventDefault();
          void send();
        }}
        className="flex gap-2"
      >
        <Input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder={t("chat.placeholder")}
          disabled={busy}
          aria-label={t("chat.ariaLabel")}
        />
        <Button type="submit" size="sm" disabled={busy || !input.trim()}>
          {t("chat.send")}
        </Button>
      </form>
    </div>
  );
}
