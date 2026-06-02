/**
 * Derivazioni PURE dal `body` (Lesson) di una trappola. Niente stato, niente
 * React: usabili sia lato client (allenamento) sia lato server.
 *
 * Convenzione dell'albero di una trappola:
 *   radice  = posizione `trigger_fen` (poco prima dell'esca)
 *   children[0] della radice = l'ESCA (la mossa naturale ma sbagliata)
 *   mainline dopo l'esca      = lo SCATTO (punizione) + il SEGUITO
 *   children[1..] della radice = le mosse SICURE (chi non casca: "evita")
 */

import type { SerializedMoveTree } from "@/lib/chess/moveTree";

/** SAN dell'esca (mossa-trappola che l'avversario è tentato di giocare). */
export function lureSan(tree: SerializedMoveTree): string | null {
  const root = tree.nodes[tree.rootId];
  const firstId = root?.children[0];
  return firstId ? tree.nodes[firstId]?.san ?? null : null;
}

/** UCI della linea principale (esca + punizione + seguito), dalla radice. */
export function mainlineUci(tree: SerializedMoveTree): string[] {
  const out: string[] = [];
  let cur = tree.nodes[tree.rootId];
  while (cur && cur.children[0]) {
    const next = tree.nodes[cur.children[0]];
    if (!next?.uci) break;
    out.push(next.uci);
    cur = next;
  }
  return out;
}

/** SAN delle mosse sicure: le alternative all'esca dalla posizione-trigger. */
export function safeSans(tree: SerializedMoveTree): string[] {
  const root = tree.nodes[tree.rootId];
  if (!root) return [];
  return root.children
    .slice(1)
    .map((id) => tree.nodes[id]?.san)
    .filter((s): s is string => Boolean(s));
}

/** Tratto a muovere nella posizione-trigger (chi gioca l'esca = la vittima). */
export function triggerTurn(triggerFen: string): "w" | "b" {
  return triggerFen.split(" ")[1] === "b" ? "b" : "w";
}
