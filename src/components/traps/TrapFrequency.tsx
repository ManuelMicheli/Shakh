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
        <Spinner /> Interrogo l&apos;explorer…
      </p>
    );
  }

  if (state.status === "error") {
    return <p className="text-sm text-text-muted">{state.message}</p>;
  }

  if (state.total === 0) {
    return (
      <p className="text-sm text-text-muted">
        Nessuna partita registrata in questa posizione: trappola rara o teorica.
      </p>
    );
  }

  if (state.share === null || state.games === 0) {
    return (
      <p className="text-sm leading-relaxed">
        Nelle partite reali (su {state.total.toLocaleString("it-IT")}) l&apos;esca{" "}
        {lureSan ? <span className="font-mono">{lureSan}</span> : "chiave"} non compare
        quasi mai: è una trappola più da manuale che da torneo.
      </p>
    );
  }

  const pct = Math.round(state.share);
  const verdict =
    pct >= 25
      ? "scatta di continuo: vale davvero la pena conoscerla."
      : pct >= 8
        ? "capita con regolarità: tienila d'occhio."
        : "è ormai poco frequente: più una chicca che un'arma quotidiana.";

  return (
    <div className="space-y-2 text-sm leading-relaxed">
      <p>
        Nelle partite reali l&apos;avversario gioca l&apos;esca{" "}
        {lureSan && <span className="font-mono">{lureSan}</span>} nel{" "}
        <span className="font-mono text-text">{pct}%</span> dei casi (
        {state.games.toLocaleString("it-IT")} su {state.total.toLocaleString("it-IT")}{" "}
        partite).
      </p>
      <p className="text-text-muted">{verdict}</p>
    </div>
  );
}
