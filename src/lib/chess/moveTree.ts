/**
 * Albero delle varianti — `MoveTree`.
 *
 * Nel prompt 01 la storia delle mosse è LINEARE (`useChessGame`): perfetta per
 * giocare e rivedere una partita. La teoria ha invece bisogno di VARIANTI: da una
 * posizione partono più mosse candidate, ognuna col suo seguito. Serve un albero.
 *
 * Questo modulo è PURO (nessun import `@/…`, nessun React) così da poter girare
 * sia nel browser (hook `useMoveTree`) sia in Node (script di seed): l'unica
 * autorità sulla legalità resta `chess.js`; per importare PGN con varianti,
 * commenti e NAG si usa un parser dedicato (`@mliebelt/pgn-parser`), perché
 * `chess.js` da solo non interpreta le RAV (parentesi) del PGN.
 *
 * Gli id dei nodi sono DETERMINISTICI (`n0`, `n1`, …) tramite un contatore nello
 * stato dell'albero: ricostruire lo stesso PGN produce gli stessi id, requisito
 * per serializzare le lezioni (gli `steps` puntano ai nodi per id).
 */

import { Chess, type Square, type PieceSymbol } from "chess.js";
import { parse } from "@mliebelt/pgn-parser";

/**
 * Forma SERIALIZZABILE di una freccia/cerchio per la board (sottoinsieme
 * dell'API `drawable` di chessground: orig, dest opzionale, pennello). La board
 * la converte in `DrawShape` al volo.
 */
export interface Shape {
  orig: string;
  dest?: string;
  brush: string; // 'green' | 'red' | 'blue' | 'yellow' | …
}

export interface MoveNode {
  id: string;
  parentId: string | null;
  ply: number; // semimosse dalla radice (0 = radice)
  san: string | null; // null solo per la radice (posizione iniziale)
  uci: string | null;
  fen: string; // posizione DOPO la mossa
  children: string[]; // id dei figli; children[0] = linea principale
  comment?: string;
  nags?: number[];
  shapes?: Shape[];
  evalCp?: number;
}

export interface MoveTree {
  nodes: Record<string, MoveNode>;
  rootId: string;
  /** Contatore per id deterministici (`n${seq}`). */
  seq: number;
}

/** Forma serializzata (è già JSON puro: identità sui campi). */
export type SerializedMoveTree = MoveTree;

const STARTPOS = "rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1";

/** Simboli NAG comuni → numero, e viceversa (per import/export). */
const NAG_TO_SYMBOL: Record<number, string> = {
  1: "!",
  2: "?",
  3: "!!",
  4: "??",
  5: "!?",
  6: "?!",
};
const SYMBOL_TO_NAG: Record<string, number> = {
  "!": 1,
  "?": 2,
  "!!": 3,
  "??": 4,
  "!?": 5,
  "?!": 6,
};

/** "$1" | "!" → 1. Restituisce null per token non riconosciuti. */
function parseNag(token: string): number | null {
  const t = token.trim();
  if (t.startsWith("$")) {
    const n = Number(t.slice(1));
    return Number.isFinite(n) ? n : null;
  }
  return SYMBOL_TO_NAG[t] ?? null;
}

function nagSymbol(nag: number): string {
  return NAG_TO_SYMBOL[nag] ?? `$${nag}`;
}

function turnFromFen(fen: string): "w" | "b" {
  return fen.split(" ")[1] === "b" ? "b" : "w";
}

function fullmoveFromFen(fen: string): number {
  const n = Number(fen.split(" ")[5]);
  return Number.isFinite(n) && n > 0 ? n : 1;
}

// ───────────────────────────── Costruzione / mutazione ────────────────────────

/** Crea un albero con la sola radice (posizione iniziale o `startFen`). */
export function createTree(startFen: string = STARTPOS): MoveTree {
  const rootId = "n0";
  const root: MoveNode = {
    id: rootId,
    parentId: null,
    ply: 0,
    san: null,
    uci: null,
    fen: new Chess(startFen).fen(), // normalizza / valida
    children: [],
  };
  return { nodes: { [rootId]: root }, rootId, seq: 1 };
}

export function getNode(tree: MoveTree, id: string): MoveNode | undefined {
  return tree.nodes[id];
}

/** Figlio del nodo con quel SAN, se esiste già (per evitare duplicati). */
function findChildBySan(tree: MoveTree, parentId: string, san: string): MoveNode | undefined {
  const parent = tree.nodes[parentId];
  if (!parent) return undefined;
  return parent.children
    .map((c) => tree.nodes[c])
    .find((n) => n && n.san === san);
}

/**
 * Aggiunge una mossa SAN come figlia di `parentId`.
 * - valida con `chess.js`; se illegale ritorna l'albero invariato e `nodeId` null;
 * - se la mossa esiste già come figlia, NON duplica: ritorna quel nodo;
 * - altrimenti crea un nuovo nodo (variante se non è il primo figlio).
 * Funzione pura: ritorna un nuovo albero.
 */
export function addMove(
  tree: MoveTree,
  parentId: string,
  san: string,
): { tree: MoveTree; nodeId: string | null } {
  const parent = tree.nodes[parentId];
  if (!parent) return { tree, nodeId: null };

  const chess = new Chess(parent.fen);
  let moved;
  try {
    moved = chess.move(san);
  } catch {
    return { tree, nodeId: null };
  }
  const canonicalSan = moved.san;

  const existing = findChildBySan(tree, parentId, canonicalSan);
  if (existing) return { tree, nodeId: existing.id };

  const id = `n${tree.seq}`;
  const node: MoveNode = {
    id,
    parentId,
    ply: parent.ply + 1,
    san: canonicalSan,
    uci: `${moved.from}${moved.to}${moved.promotion ?? ""}`,
    fen: chess.fen(),
    children: [],
  };

  return {
    tree: {
      ...tree,
      seq: tree.seq + 1,
      nodes: {
        ...tree.nodes,
        [id]: node,
        [parentId]: { ...parent, children: [...parent.children, id] },
      },
    },
    nodeId: id,
  };
}

/** Imposta commento / nags / shapes / eval su un nodo (pura). */
export function annotateNode(
  tree: MoveTree,
  id: string,
  patch: Partial<Pick<MoveNode, "comment" | "nags" | "shapes" | "evalCp">>,
): MoveTree {
  const node = tree.nodes[id];
  if (!node) return tree;
  return { ...tree, nodes: { ...tree.nodes, [id]: { ...node, ...patch } } };
}

/** Tutti gli id nel sottoalbero radicato in `id` (incluso `id`). */
function subtreeIds(tree: MoveTree, id: string): string[] {
  const out: string[] = [];
  const stack = [id];
  while (stack.length) {
    const cur = stack.pop()!;
    const node = tree.nodes[cur];
    if (!node) continue;
    out.push(cur);
    stack.push(...node.children);
  }
  return out;
}

/** Elimina un nodo (e tutto il suo sottoalbero); lo stacca dal genitore. */
export function deleteVariation(tree: MoveTree, id: string): MoveTree {
  const node = tree.nodes[id];
  if (!node || node.parentId === null) return tree; // non si elimina la radice
  const toRemove = new Set(subtreeIds(tree, id));
  const nodes: Record<string, MoveNode> = {};
  for (const [key, n] of Object.entries(tree.nodes)) {
    if (toRemove.has(key)) continue;
    nodes[key] = n;
  }
  const parent = tree.nodes[node.parentId];
  if (parent) {
    nodes[parent.id] = {
      ...parent,
      children: parent.children.filter((c) => c !== id),
    };
  }
  return { ...tree, nodes };
}

/**
 * Promuove la variante di un passo verso la principale: porta il nodo all'inizio
 * della lista dei fratelli (children[0] del genitore). Utile in authoring/analisi.
 */
export function promoteVariation(tree: MoveTree, id: string): MoveTree {
  const node = tree.nodes[id];
  if (!node || node.parentId === null) return tree;
  const parent = tree.nodes[node.parentId];
  if (!parent || parent.children[0] === id) return tree;
  const reordered = [id, ...parent.children.filter((c) => c !== id)];
  return {
    ...tree,
    nodes: { ...tree.nodes, [parent.id]: { ...parent, children: reordered } },
  };
}

// ───────────────────────────────── Navigazione ────────────────────────────────

/** Percorso radice → nodo (inclusi entrambi). */
export function pathToNode(tree: MoveTree, id: string): MoveNode[] {
  const path: MoveNode[] = [];
  let cur: MoveNode | undefined = tree.nodes[id];
  while (cur) {
    path.unshift(cur);
    cur = cur.parentId ? tree.nodes[cur.parentId] : undefined;
  }
  return path;
}

/** Id dei nodi sulla linea principale (children[0]) dalla radice alla foglia. */
export function mainlineIds(tree: MoveTree): string[] {
  const ids: string[] = [];
  let cur: MoveNode | undefined = tree.nodes[tree.rootId];
  while (cur) {
    ids.push(cur.id);
    cur = cur.children[0] ? tree.nodes[cur.children[0]] : undefined;
  }
  return ids;
}

/** Foglia seguendo la mainline a partire da `id`. */
export function lastMainlineId(tree: MoveTree, id: string): string {
  let cur = tree.nodes[id];
  while (cur && cur.children[0]) cur = tree.nodes[cur.children[0]];
  return cur ? cur.id : id;
}

/** Fratelli (gli altri figli del genitore), `id` incluso. */
export function siblings(tree: MoveTree, id: string): string[] {
  const node = tree.nodes[id];
  if (!node || node.parentId === null) return [id];
  return tree.nodes[node.parentId]?.children ?? [id];
}

// ─────────────────────────────── Import PGN varianti ──────────────────────────

/** Tipi minimi della parse-tree di @mliebelt/pgn-parser (solo ciò che serve). */
interface PgnMove {
  notation?: { notation?: string };
  nag?: string[];
  commentAfter?: string;
  commentBefore?: string;
  variations?: PgnMove[][];
}

/** Pulisce un SAN dai simboli che chess.js non vuole nei casi limite. */
function cleanSan(san: string): string {
  return san.trim();
}

function applyLine(tree: MoveTree, parentId: string, moves: PgnMove[]): MoveTree {
  let curParent = parentId;
  for (const m of moves) {
    const san = cleanSan(m.notation?.notation ?? "");
    if (!san) continue;
    const res = addMove(tree, curParent, san);
    if (!res.nodeId) continue; // mossa illegale: salta (robustezza)
    tree = res.tree;
    const nodeId = res.nodeId;

    const nags = (m.nag ?? [])
      .map(parseNag)
      .filter((n): n is number => n !== null);
    const comment = m.commentAfter?.trim() || undefined;
    if (nags.length || comment) {
      tree = annotateNode(tree, nodeId, {
        nags: nags.length ? nags : undefined,
        comment,
      });
    }

    // Le varianti sono ALTERNATIVE a questa mossa → si attaccano allo STESSO
    // genitore (la posizione precedente).
    for (const v of m.variations ?? []) {
      tree = applyLine(tree, curParent, v);
    }

    curParent = nodeId;
  }
  return tree;
}

/**
 * Costruisce un albero da un PGN con varianti/commenti/NAG.
 * `chess.js` valida ogni mossa; il parser serve solo a leggere la struttura.
 */
export function loadPgnWithVariations(pgn: string, startFen?: string): MoveTree {
  const parsed = parse(pgn, { startRule: "game" }) as {
    moves?: PgnMove[];
    tags?: Record<string, unknown>;
  };
  const fen =
    startFen ??
    (typeof parsed.tags?.FEN === "string" ? (parsed.tags.FEN as string) : undefined);
  let tree = createTree(fen);
  tree = applyLine(tree, tree.rootId, parsed.moves ?? []);
  return tree;
}

// ─────────────────────────────────── Export PGN ──────────────────────────────

function renderMove(
  tree: MoveTree,
  parent: MoveNode,
  node: MoveNode,
  forceNumber: boolean,
): string {
  const white = turnFromFen(parent.fen) === "w";
  const num = fullmoveFromFen(parent.fen);
  let prefix = "";
  if (white) prefix = `${num}. `;
  else if (forceNumber) prefix = `${num}... `;

  let out = prefix + (node.san ?? "");
  if (node.nags?.length) out += node.nags.map((n) => nagSymbol(n)).join("");
  if (node.comment) out += ` {${node.comment}}`;
  return out;
}

/** Serializza i discendenti di `parent` lungo la mainline, con varianti in parentesi. */
function renderChildren(tree: MoveTree, parent: MoveNode, forceNumber: boolean): string[] {
  if (parent.children.length === 0) return [];
  const [mainId, ...varIds] = parent.children;
  const mainNode = tree.nodes[mainId];
  const tokens: string[] = [];

  tokens.push(renderMove(tree, parent, mainNode, forceNumber));

  for (const vId of varIds) {
    const vNode = tree.nodes[vId];
    const inner = [renderMove(tree, parent, vNode, true), ...renderChildren(tree, vNode, false)];
    tokens.push(`(${inner.join(" ")})`);
  }

  // Dopo una variante o un commento la mossa seguente deve ri-stampare il numero.
  const nextForce = varIds.length > 0 || Boolean(mainNode.comment);
  tokens.push(...renderChildren(tree, mainNode, nextForce));
  return tokens;
}

/** Esporta l'albero in PGN (movetext con varianti, commenti e NAG). */
export function toPgn(tree: MoveTree): string {
  const root = tree.nodes[tree.rootId];
  const body = renderChildren(tree, root, true).join(" ").trim();
  return body;
}

// ─────────────────────────────── Serializzazione ─────────────────────────────

export function serializeTree(tree: MoveTree): SerializedMoveTree {
  return { nodes: tree.nodes, rootId: tree.rootId, seq: tree.seq };
}

/** Deserializza con validazione minima; lancia se la struttura è incoerente. */
export function deserializeTree(data: SerializedMoveTree): MoveTree {
  if (!data || typeof data !== "object" || !data.nodes || !data.rootId) {
    throw new Error("Invalid SerializedMoveTree.");
  }
  if (!data.nodes[data.rootId]) {
    throw new Error("rootId assente tra i nodi.");
  }
  return { nodes: data.nodes, rootId: data.rootId, seq: data.seq ?? Object.keys(data.nodes).length };
}

/** Mossa `[from, to]` di un nodo (per evidenziare l'ultima mossa sulla board). */
export function lastMoveOf(node: MoveNode | undefined): [Square, Square] | null {
  if (!node?.uci || node.uci.length < 4) return null;
  return [node.uci.slice(0, 2) as Square, node.uci.slice(2, 4) as Square];
}

export type { Square, PieceSymbol };
