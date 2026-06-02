"use client";

import { useCallback, useMemo, useState } from "react";
import { Chess, type Square, type PieceSymbol } from "chess.js";
import type { LegalDests } from "@/lib/chess/useChessGame";
import {
  type MoveTree,
  type MoveNode,
  type SerializedMoveTree,
  createTree,
  addMove,
  annotateNode,
  deleteVariation as deleteVariationOp,
  promoteVariation as promoteVariationOp,
  loadPgnWithVariations,
  toPgn as treeToPgn,
  deserializeTree,
  serializeTree,
  pathToNode,
  lastMainlineId,
  lastMoveOf,
  siblings as siblingsOf,
} from "@/lib/chess/moveTree";

/**
 * Hook che pilota un `MoveTree` (albero di varianti) e tiene il nodo corrente.
 * Affianca `useChessGame` (prompt 01) senza sostituirlo: quello resta per il
 * gioco LINEARE, questo serve la teoria (varianti, navigazione, authoring).
 *
 * La `ChessBoard` si pilota già con `fen` + `lastMove` + `shapes`: qui esponiamo
 * esattamente quei valori dal nodo corrente — nessuna modifica alla board.
 */
export interface UseMoveTree {
  tree: MoveTree;
  currentNodeId: string;
  currentNode: MoveNode;
  /** Percorso radice → nodo corrente. */
  path: MoveNode[];

  // Valori da passare alla board.
  fen: string;
  turn: "w" | "b";
  lastMove: [Square, Square] | null;
  legalDests: LegalDests;
  isCheck: boolean;
  /** Shapes del nodo corrente (frecce/cerchi). */
  shapes: import("@/lib/chess/moveTree").Shape[] | undefined;

  // Navigazione.
  goTo: (nodeId: string) => void;
  next: () => void; // segue la mainline (children[0])
  prev: () => void;
  first: () => void;
  last: () => void;
  /** Naviga tra le varianti dello stesso bivio (fratelli del nodo corrente). */
  nextVariation: () => void;
  prevVariation: () => void;
  atStart: boolean;
  atEnd: boolean;

  // Mutazione / authoring.
  /** Gioca una mossa SAN dal nodo corrente; si sposta sul nodo risultante. */
  play: (san: string) => string | null;
  /** Gioca una mossa from→to (per input dalla board). */
  playMove: (from: Square, to: Square, promotion?: PieceSymbol) => string | null;
  promote: (nodeId: string) => void;
  remove: (nodeId: string) => void;
  annotate: (
    nodeId: string,
    patch: Partial<Pick<MoveNode, "comment" | "nags" | "shapes" | "evalCp">>,
  ) => void;

  // Import / export.
  loadPgn: (pgn: string, startFen?: string) => boolean;
  setTree: (data: SerializedMoveTree, currentNodeId?: string) => void;
  serialize: () => SerializedMoveTree;
  toPgn: () => string;
  reset: (startFen?: string) => void;
}

function buildDests(fen: string): LegalDests {
  const dests: LegalDests = new Map();
  const chess = new Chess(fen);
  for (const m of chess.moves({ verbose: true })) {
    const list = dests.get(m.from);
    if (list) list.push(m.to);
    else dests.set(m.from, [m.to]);
  }
  return dests;
}

interface State {
  tree: MoveTree;
  currentNodeId: string;
}

export function useMoveTree(
  initial?: SerializedMoveTree | string,
  startFen?: string,
): UseMoveTree {
  const [state, setState] = useState<State>(() => {
    let tree: MoveTree;
    if (typeof initial === "string") {
      tree = loadPgnWithVariations(initial, startFen);
    } else if (initial) {
      tree = deserializeTree(initial);
    } else {
      tree = createTree(startFen);
    }
    return { tree, currentNodeId: tree.rootId };
  });

  const { tree, currentNodeId } = state;
  const currentNode = tree.nodes[currentNodeId] ?? tree.nodes[tree.rootId];

  const fen = currentNode.fen;
  const turn = useMemo<"w" | "b">(() => (fen.split(" ")[1] === "b" ? "b" : "w"), [fen]);
  const legalDests = useMemo(() => buildDests(fen), [fen]);
  const isCheck = useMemo(() => new Chess(fen).isCheck(), [fen]);
  const lastMove = useMemo(() => lastMoveOf(currentNode), [currentNode]);
  const path = useMemo(() => pathToNode(tree, currentNodeId), [tree, currentNodeId]);

  const goTo = useCallback((nodeId: string) => {
    setState((prev) =>
      prev.tree.nodes[nodeId] ? { ...prev, currentNodeId: nodeId } : prev,
    );
  }, []);

  const next = useCallback(() => {
    setState((prev) => {
      const node = prev.tree.nodes[prev.currentNodeId];
      const child = node?.children[0];
      return child ? { ...prev, currentNodeId: child } : prev;
    });
  }, []);

  const prev = useCallback(() => {
    setState((p) => {
      const node = p.tree.nodes[p.currentNodeId];
      return node?.parentId ? { ...p, currentNodeId: node.parentId } : p;
    });
  }, []);

  const first = useCallback(() => {
    setState((p) => ({ ...p, currentNodeId: p.tree.rootId }));
  }, []);

  const last = useCallback(() => {
    setState((p) => ({
      ...p,
      currentNodeId: lastMainlineId(p.tree, p.currentNodeId),
    }));
  }, []);

  const stepVariation = useCallback((dir: 1 | -1) => {
    setState((p) => {
      const sibs = siblingsOf(p.tree, p.currentNodeId);
      if (sibs.length < 2) return p;
      const idx = sibs.indexOf(p.currentNodeId);
      const nextIdx = (idx + dir + sibs.length) % sibs.length;
      return { ...p, currentNodeId: sibs[nextIdx] };
    });
  }, []);

  const nextVariation = useCallback(() => stepVariation(1), [stepVariation]);
  const prevVariation = useCallback(() => stepVariation(-1), [stepVariation]);

  const play = useCallback((san: string): string | null => {
    let newId: string | null = null;
    setState((p) => {
      const res = addMove(p.tree, p.currentNodeId, san);
      if (!res.nodeId) return p;
      newId = res.nodeId;
      return { tree: res.tree, currentNodeId: res.nodeId };
    });
    return newId;
  }, []);

  const playMove = useCallback(
    (from: Square, to: Square, promotion?: PieceSymbol): string | null => {
      let newId: string | null = null;
      setState((p) => {
        const node = p.tree.nodes[p.currentNodeId];
        if (!node) return p;
        let san: string;
        try {
          san = new Chess(node.fen).move({ from, to, promotion }).san;
        } catch {
          return p;
        }
        const res = addMove(p.tree, p.currentNodeId, san);
        if (!res.nodeId) return p;
        newId = res.nodeId;
        return { tree: res.tree, currentNodeId: res.nodeId };
      });
      return newId;
    },
    [],
  );

  const promote = useCallback((nodeId: string) => {
    setState((p) => ({ ...p, tree: promoteVariationOp(p.tree, nodeId) }));
  }, []);

  const remove = useCallback((nodeId: string) => {
    setState((p) => {
      const target = p.tree.nodes[nodeId];
      const tree = deleteVariationOp(p.tree, nodeId);
      // Se il nodo corrente è stato eliminato, risali al genitore superstite.
      const current = tree.nodes[p.currentNodeId]
        ? p.currentNodeId
        : target?.parentId && tree.nodes[target.parentId]
          ? target.parentId
          : tree.rootId;
      return { tree, currentNodeId: current };
    });
  }, []);

  const annotate = useCallback<UseMoveTree["annotate"]>((nodeId, patch) => {
    setState((p) => ({ ...p, tree: annotateNode(p.tree, nodeId, patch) }));
  }, []);

  const loadPgn = useCallback((pgn: string, startFen?: string): boolean => {
    try {
      const tree = loadPgnWithVariations(pgn, startFen);
      setState({ tree, currentNodeId: tree.rootId });
      return true;
    } catch {
      return false;
    }
  }, []);

  const setTree = useCallback((data: SerializedMoveTree, nodeId?: string) => {
    const tree = deserializeTree(data);
    setState({ tree, currentNodeId: nodeId && tree.nodes[nodeId] ? nodeId : tree.rootId });
  }, []);

  const serialize = useCallback(() => serializeTree(tree), [tree]);
  const toPgn = useCallback(() => treeToPgn(tree), [tree]);

  const reset = useCallback((startFen?: string) => {
    const tree = createTree(startFen);
    setState({ tree, currentNodeId: tree.rootId });
  }, []);

  return {
    tree,
    currentNodeId,
    currentNode,
    path,
    fen,
    turn,
    lastMove,
    legalDests,
    isCheck,
    shapes: currentNode.shapes,
    goTo,
    next,
    prev,
    first,
    last,
    nextVariation,
    prevVariation,
    atStart: currentNode.parentId === null,
    atEnd: currentNode.children.length === 0,
    play,
    playMove,
    promote,
    remove,
    annotate,
    loadPgn,
    setTree,
    serialize,
    toPgn,
    reset,
  };
}
