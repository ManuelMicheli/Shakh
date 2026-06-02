/**
 * Persistenza del repertorio = `MoveTree` (06a) ⇄ righe `repertoire_moves`.
 *
 * Un repertorio è un albero di varianti salvato: i nodi (tranne la radice) sono
 * righe `repertoire_moves` (`parent_move_id` = albero, `order_index` = ordine dei
 * fratelli → la mainline è `order_index` 0). Lo stato SRS sta altrove
 * (`repertoire_training`), perciò gli id delle mosse devono restare STABILI tra
 * salvataggi: la riconciliazione riusa le righe esistenti per (genitore, san).
 */

import { Chess } from "chess.js";
import {
  createTree,
  type MoveTree,
  type MoveNode,
} from "@/lib/chess/moveTree";

export const REPERTOIRE_STARTPOS =
  "rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1";

export type PieceColor = "white" | "black";

export interface RepertoireMoveRow {
  id: string;
  parent_move_id: string | null;
  ply: number;
  san: string;
  fen: string;
  annotation: string | null;
  eval: number | null;
  order_index: number;
}

const ROOT_ID = "root";

function turnFromFen(fen: string): "w" | "b" {
  return fen.split(" ")[1] === "b" ? "b" : "w";
}

function uciFromMove(parentFen: string, san: string): string | null {
  try {
    const m = new Chess(parentFen).move(san);
    return `${m.from}${m.to}${m.promotion ?? ""}`;
  } catch {
    return null;
  }
}

/** Ricostruisce il `MoveTree` dalle righe DB (ordinate per ply, poi order_index). */
export function rowsToTree(
  rows: RepertoireMoveRow[],
  startFen: string = REPERTOIRE_STARTPOS,
): MoveTree {
  const tree = createTree(startFen);
  // Rinominiamo la radice in ROOT_ID per coerenza con la persistenza.
  const root: MoveNode = { ...tree.nodes[tree.rootId], id: ROOT_ID, children: [] };
  const nodes: Record<string, MoveNode> = { [ROOT_ID]: root };

  const sorted = [...rows].sort((a, b) =>
    a.ply !== b.ply ? a.ply - b.ply : a.order_index - b.order_index,
  );

  for (const row of sorted) {
    const parentId = row.parent_move_id ?? ROOT_ID;
    const parent = nodes[parentId];
    if (!parent) continue; // riga orfana: ignora (robustezza)
    const node: MoveNode = {
      id: row.id,
      parentId,
      ply: row.ply,
      san: row.san,
      uci: uciFromMove(parent.fen, row.san),
      fen: row.fen,
      children: [],
      comment: row.annotation ?? undefined,
      evalCp: row.eval ?? undefined,
    };
    nodes[row.id] = node;
    parent.children.push(row.id);
  }

  // `seq` alto solo per sicurezza: i nuovi nodi usano `n${seq}` (mai uuid → no collisioni).
  return { nodes, rootId: ROOT_ID, seq: 1 };
}

export interface DesiredRow {
  id: string;
  repertoire_id: string;
  parent_move_id: string | null;
  ply: number;
  san: string;
  fen: string;
  annotation: string | null;
  eval: number | null;
  order_index: number;
}

export interface Reconciliation {
  /** Righe da upsert, in ordine genitore→figlio (FK soddisfatta nell'INSERT). */
  rows: DesiredRow[];
  /** Id di righe DB non più presenti nell'albero: da eliminare. */
  deleteIds: string[];
}

/**
 * Diffonde l'albero corrente sulle righe esistenti: riusa l'id quando
 * (genitore, san) combaciano, crea un nuovo uuid altrimenti, marca come da
 * eliminare le righe non più raggiungibili. Mantiene stabile l'SRS.
 */
export function reconcile(
  tree: MoveTree,
  repertoireId: string,
  existing: RepertoireMoveRow[],
  newId: () => string,
): Reconciliation {
  // Indice delle righe esistenti per (parentDbId|san).
  const existingByKey = new Map<string, string>();
  for (const r of existing) {
    existingByKey.set(`${r.parent_move_id ?? ROOT_ID}|${r.san}`, r.id);
  }

  const nodeToDb = new Map<string, string | null>([[tree.rootId, null]]);
  const rows: DesiredRow[] = [];
  const keptIds = new Set<string>();

  // BFS dalla radice: i genitori precedono i figli (FK e ordine corretti).
  const queue: string[] = [tree.rootId];
  while (queue.length) {
    const id = queue.shift()!;
    const node = tree.nodes[id];
    if (!node) continue;
    node.children.forEach((childId, index) => {
      const child = tree.nodes[childId];
      if (!child || !child.san) return;
      const parentDb = nodeToDb.get(id) ?? null;
      const key = `${parentDb ?? ROOT_ID}|${child.san}`;
      const dbId = existingByKey.get(key) ?? newId();
      nodeToDb.set(childId, dbId);
      keptIds.add(dbId);
      rows.push({
        id: dbId,
        repertoire_id: repertoireId,
        parent_move_id: parentDb,
        ply: child.ply,
        san: child.san,
        fen: child.fen,
        annotation: child.comment ?? null,
        eval: child.evalCp ?? null,
        order_index: index,
      });
      queue.push(childId);
    });
  }

  const deleteIds = existing.map((r) => r.id).filter((id) => !keptIds.has(id));
  return { rows, deleteIds };
}

/**
 * Nodi "allenabili": quelli in cui ha mosso il COLORE DELL'UTENTE (non le
 * risposte avversarie). Sono gli item SRS del trainer.
 */
export function trainableNodeIds(tree: MoveTree, color: PieceColor): string[] {
  const want = color === "white" ? "w" : "b";
  const out: string[] = [];
  for (const node of Object.values(tree.nodes)) {
    if (!node.san || node.parentId === null) continue;
    const parent = tree.nodes[node.parentId];
    if (parent && turnFromFen(parent.fen) === want) out.push(node.id);
  }
  return out;
}

/** Slug stabile dal nome del repertorio (per la chiave di `user_progress`). */
export function slugify(text: string): string {
  const COMBINING = /[̀-ͯ]/g;
  return text
    .toLowerCase()
    .normalize("NFD")
    .replace(COMBINING, "")
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "")
    .slice(0, 60) || "repertorio";
}
