/**
 * Descrizione DETERMINISTICA degli effetti di una mossa sulla scacchiera.
 *
 * Dato il FEN prima della mossa e la mossa in SAN, calcola con chess.js (mai
 * col modello) cosa cambia concretamente: catture e scacchi, traiettorie
 * aperte/chiuse per i pezzi a lunga gittata (di entrambi i colori), nuove
 * minacce create e pezzi propri lasciati in presa. Il risultato è un elenco di
 * FATTI in italiano che il coach AI spiega senza poterli inventare.
 */

import { Chess } from "chess.js";
import type { Color, PieceSymbol, Square } from "chess.js";

type Coords = { f: number; r: number };

const sq = (f: number, r: number): Square =>
  (String.fromCharCode(97 + f) + String(r + 1)) as Square;
const coords = (s: Square): Coords => ({ f: s.charCodeAt(0) - 97, r: Number(s[1]) - 1 });
const onBoard = (f: number, r: number): boolean => f >= 0 && f <= 7 && r >= 0 && r <= 7;

/** Direzioni dei pezzi a lunga gittata. */
const DIAG: ReadonlyArray<readonly [number, number]> = [[1, 1], [1, -1], [-1, 1], [-1, -1]];
const ORTH: ReadonlyArray<readonly [number, number]> = [[1, 0], [-1, 0], [0, 1], [0, -1]];

function sliderDirs(type: PieceSymbol): ReadonlyArray<readonly [number, number]> {
  if (type === "b") return DIAG;
  if (type === "r") return ORTH;
  if (type === "q") return [...DIAG, ...ORTH];
  return [];
}

/** "la Donna nera", "l'Alfiere bianco"… (articolo + nome + colore accordati). */
function pieceLabel(type: PieceSymbol, color: Color): string {
  const c = color === "w";
  switch (type) {
    case "q": return c ? "la Donna bianca" : "la Donna nera";
    case "r": return c ? "la Torre bianca" : "la Torre nera";
    case "b": return c ? "l'Alfiere bianco" : "l'Alfiere nero";
    case "n": return c ? "il Cavallo bianco" : "il Cavallo nero";
    case "k": return c ? "il Re bianco" : "il Re nero";
    default: return c ? "il pedone bianco" : "il pedone nero";
  }
}

/** "della Donna nera", "dell'Alfiere bianco"… (forma con preposizione). */
function pieceLabelDi(type: PieceSymbol, color: Color): string {
  const c = color === "w";
  switch (type) {
    case "q": return c ? "della Donna bianca" : "della Donna nera";
    case "r": return c ? "della Torre bianca" : "della Torre nera";
    case "b": return c ? "dell'Alfiere bianco" : "dell'Alfiere nero";
    case "n": return c ? "del Cavallo bianco" : "del Cavallo nero";
    case "k": return c ? "del Re bianco" : "del Re nero";
    default: return c ? "del pedone bianco" : "del pedone nero";
  }
}

const PIECE_VALUE: Record<PieceSymbol, number> = { q: 9, r: 5, b: 3, n: 3, p: 1, k: 0 };

type BoardMap = Map<Square, { type: PieceSymbol; color: Color }>;

function boardMap(chess: Chess): BoardMap {
  const map: BoardMap = new Map();
  for (const row of chess.board()) {
    for (const cell of row) {
      if (cell) map.set(cell.square, { type: cell.type, color: cell.color });
    }
  }
  return map;
}

/** Case raggiunte lungo una direzione (incluso l'eventuale primo pezzo che blocca). */
function ray(board: BoardMap, from: Square, dir: readonly [number, number]): Square[] {
  const out: Square[] = [];
  let { f, r } = coords(from);
  for (;;) {
    f += dir[0];
    r += dir[1];
    if (!onBoard(f, r)) break;
    const s = sq(f, r);
    out.push(s);
    if (board.has(s)) break;
  }
  return out;
}

/** Etichetta umana della linea: colonna, traversa o diagonale. */
function lineLabel(from: Square, dir: readonly [number, number], far: Square): string {
  if (dir[0] === 0) return `sulla colonna ${from[0]}`;
  if (dir[1] === 0) return `sulla traversa ${from[1]}`;
  return `sulla diagonale ${from}–${far}`;
}

interface TrajectoryChange {
  text: string;
  weight: number;
}

/**
 * Confronta la portata dei pezzi a lunga gittata rimasti fermi: traiettorie
 * aperte (la casa lasciata libera non blocca più) o chiuse (la casa d'arrivo
 * ora blocca la linea).
 */
function trajectoryChanges(
  before: BoardMap,
  after: BoardMap,
  fromSq: Square,
  toSq: Square,
): TrajectoryChange[] {
  const changes: TrajectoryChange[] = [];
  for (const [s, piece] of after) {
    if (s === toSq) continue; // il pezzo mosso: le sue nuove minacce sono trattate a parte
    const beforePiece = before.get(s);
    if (!beforePiece || beforePiece.type !== piece.type || beforePiece.color !== piece.color) continue;
    for (const dir of sliderDirs(piece.type)) {
      const rb = ray(before, s, dir);
      const ra = ray(after, s, dir);
      const farA = ra[ra.length - 1];
      const farB = rb[rb.length - 1];
      if (ra.length > rb.length && farB === fromSq) {
        // Linea APERTA: il pezzo che stava in `fromSq` non blocca più.
        const target = after.get(farA);
        const targetTxt =
          target && target.color !== piece.color
            ? ` e ora punta ${pieceLabel(target.type, target.color)} in ${farA}`
            : ` (ora arriva fino a ${farA})`;
        changes.push({
          text: `Apre la traiettoria ${pieceLabelDi(piece.type, piece.color)} in ${s} ${lineLabel(s, dir, farA)}${targetTxt}.`,
          weight: PIECE_VALUE[piece.type] + (target && target.color !== piece.color ? PIECE_VALUE[target.type] : 0),
        });
      } else if (ra.length < rb.length && farA === toSq) {
        // Linea CHIUSA: il pezzo arrivato in `toSq` blocca la linea.
        const oldTarget = before.get(farB);
        const lostTxt =
          oldTarget && oldTarget.color !== piece.color
            ? `: non punta più ${pieceLabel(oldTarget.type, oldTarget.color)} in ${farB}`
            : ` (prima arrivava fino a ${farB})`;
        changes.push({
          text: `Chiude la traiettoria ${pieceLabelDi(piece.type, piece.color)} in ${s} ${lineLabel(s, dir, farB)}${lostTxt}.`,
          weight: PIECE_VALUE[piece.type] + (oldTarget && oldTarget.color !== piece.color ? PIECE_VALUE[oldTarget.type] : 0),
        });
      }
    }
  }
  return changes.sort((a, b) => b.weight - a.weight);
}

/** Case dei pezzi di `victimColor` attaccate da `attackerColor`. */
function attackedEnemySquares(chess: Chess, board: BoardMap, attackerColor: Color): Set<Square> {
  const out = new Set<Square>();
  for (const [s, piece] of board) {
    if (piece.color === attackerColor || piece.type === "k") continue;
    if (chess.attackers(s, attackerColor).length > 0) out.add(s);
  }
  return out;
}

/**
 * Descrive in italiano gli effetti concreti della mossa sulla scacchiera.
 * Ritorna un elenco di righe-fatto ("- …") o null se la mossa non è legale
 * nella posizione data.
 */
export function describeMoveEffects(fenBefore: string, san: string): string | null {
  let chessBefore: Chess;
  try {
    chessBefore = new Chess(fenBefore);
  } catch {
    return null;
  }
  const mapBefore = boardMap(chessBefore);
  const mover = chessBefore.turn();
  const enemy: Color = mover === "w" ? "b" : "w";

  const chessAfter = new Chess(fenBefore);
  let move;
  try {
    move = chessAfter.move(san);
  } catch {
    return null;
  }
  if (!move) return null;
  const mapAfter = boardMap(chessAfter);

  const facts: string[] = [];

  // 1) Cattura, promozione, scacco/matto.
  if (move.captured) {
    facts.push(`Cattura ${pieceLabel(move.captured, enemy)} in ${move.to}.`);
  }
  if (move.promotion) {
    facts.push(`Il pedone promuove in ${move.to}.`);
  }
  if (chessAfter.isCheckmate()) {
    facts.push(`Dà SCACCO MATTO al Re ${enemy === "w" ? "bianco" : "nero"}.`);
  } else if (chessAfter.isCheck()) {
    facts.push(`Dà scacco al Re ${enemy === "w" ? "bianco" : "nero"}.`);
  }

  // 2) Traiettorie aperte/chiuse per i pezzi a lunga gittata rimasti fermi.
  for (const c of trajectoryChanges(mapBefore, mapAfter, move.from, move.to).slice(0, 4)) {
    facts.push(c.text);
  }

  // 3) Nuove minacce: pezzi avversari attaccati ora e non prima.
  const attackedBefore = attackedEnemySquares(chessBefore, mapBefore, mover);
  const attackedAfter = attackedEnemySquares(chessAfter, mapAfter, mover);
  const newThreats: { s: Square; type: PieceSymbol; weight: number }[] = [];
  for (const s of attackedAfter) {
    if (attackedBefore.has(s)) continue;
    const piece = mapAfter.get(s);
    if (!piece) continue;
    newThreats.push({ s, type: piece.type, weight: PIECE_VALUE[piece.type] });
  }
  newThreats.sort((a, b) => b.weight - a.weight);
  for (const t of newThreats.slice(0, 3)) {
    const defended = chessAfter.attackers(t.s, enemy).length > 0;
    facts.push(
      `Ora attacca ${pieceLabel(t.type, enemy)} in ${t.s}${defended ? "" : " (indifeso!)"}.`,
    );
  }

  // 4) Pezzi propri lasciati in presa (attaccati e non difesi) dopo la mossa.
  const hanging: { s: Square; type: PieceSymbol; weight: number }[] = [];
  for (const [s, piece] of mapAfter) {
    if (piece.color !== mover || piece.type === "k" || piece.type === "p") continue;
    const attackers = chessAfter.attackers(s, enemy).length;
    const defenders = chessAfter.attackers(s, mover).length;
    if (attackers > 0 && defenders === 0) {
      hanging.push({ s, type: piece.type, weight: PIECE_VALUE[piece.type] });
    }
  }
  hanging.sort((a, b) => b.weight - a.weight);
  for (const h of hanging.slice(0, 2)) {
    facts.push(`Lascia ${pieceLabel(h.type, mover)} in ${h.s} in presa (attaccato e non difeso).`);
  }

  if (facts.length === 0) return null;
  return facts.map((f) => `- ${f}`).join("\n");
}
