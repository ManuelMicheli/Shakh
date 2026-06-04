"use client";

import { useEffect, useState } from "react";
import { Spinner } from "@/components/ui/spinner";
import { fetchOpeningExplorer, moveGames } from "@/lib/theory/explorer";

export interface TrapFrequencyProps {
  /** Posizione poco prima dell'esca. */
  triggerFen: string;
  /** SAN della mossa-esca (la mossa naturale ma sbagliata). */
  lureSan: string | null;
}

/**
 * Frequenza REALE dell'esca: quanto spesso, nelle partite vere, l'avversario
 * gioca davvero la mossa che fa scattare la trappola. È il dato che un libro di
 * trappole non dà — distingue la trappola che scatta di continuo da quella da
 * manuale che ormai non casca più nessuno. Dati dall'Opening Explorer di Lichess.
 */
export function TrapFrequency({ triggerFen, lureSan }: TrapFrequencyProps) {
  const [state, setState] = useState<
    | { status: "loading" }
    | { status: "error"; message: string }
    | { status: "ok"; share: number | null; games: number; total: number }
  >({ status: "loading" });

  useEffect(() => {
    let cancelled = false;
    setState({ status: "loading" });
    fetchOpeningExplorer(triggerFen, "lichess").then((res) => {
      if (cancelled) return;
      if (!res.ok) {
        setState({ status: "error", message: res.error });
        return;
      }
      const total = res.data.moves.reduce((s, m) => s + moveGames(m), 0);
      const lure = lureSan ? res.data.moves.find((m) => m.san === lureSan) : undefined;
      const games = lure ? moveGames(lure) : 0;
      setState({
        status: "ok",
        share: total > 0 ? (games / total) * 100 : null,
        games,
        total,
      });
    });
    return () => {
      cancelled = true;
    };
  }, [triggerFen, lureSan]);

  if (state.status === "loading") {
    return (
      <p className="flex items-center gap-2 text-sm text-text-muted">
        <Spinner /> Querying the explorer…
      </p>
    );
  }

  if (state.status === "error") {
    return <p className="text-sm text-text-muted">{state.message}</p>;
  }

  if (state.total === 0) {
    return (
      <p className="text-sm text-text-muted">
        No games recorded in this position: a rare or theoretical trap.
      </p>
    );
  }

  if (state.share === null || state.games === 0) {
    return (
      <p className="text-sm leading-relaxed">
        In real games (out of {state.total.toLocaleString("en-US")}) the{" "}
        {lureSan ? <span className="font-mono">{lureSan}</span> : "key"} lure hardly ever
        appears: it&apos;s more of a textbook trap than a tournament one.
      </p>
    );
  }

  const pct = Math.round(state.share);
  const verdict =
    pct >= 25
      ? "it springs constantly: it's well worth knowing."
      : pct >= 8
        ? "it comes up regularly: keep an eye on it."
        : "it's now uncommon: more of a curiosity than an everyday weapon.";

  return (
    <div className="space-y-2 text-sm leading-relaxed">
      <p>
        In real games the opponent plays the lure{" "}
        {lureSan && <span className="font-mono">{lureSan}</span>} in{" "}
        <span className="font-mono text-text">{pct}%</span> of cases (
        {state.games.toLocaleString("en-US")} of {state.total.toLocaleString("en-US")}{" "}
        games).
      </p>
      <p className="text-text-muted">{verdict}</p>
    </div>
  );
}
