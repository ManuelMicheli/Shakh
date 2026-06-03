/**
 * Calibrazione Lichess-puzzle ↔ Elo OTB (over-the-board).
 *
 * I rating dei puzzle Lichess sono gonfiati di ~300–700 punti rispetto alla
 * forza reale a tavolino. Per ottenere un "Rating Shakh" severo e onesto
 * (giocatore di circolo ~1600–1800, principiante 600–1000) deflazioniamo il
 * rating del puzzle PRIMA di darlo in pasto a Glicko-2 come forza dell'avversario.
 *
 * La curva è un OFFSET crescente, definito per punti d'ancoraggio e interpolato
 * linearmente. È un'APPROSSIMAZIONE tarata su dati pubblici Lichess↔FIDE: i
 * valori in `CALIBRATION_ANCHORS` sono ritoccabili senza toccare la logica.
 */

/** Punti [ratingLichess, offsetDaSottrarre]. Monotòni crescenti in offset. */
export const CALIBRATION_ANCHORS: ReadonlyArray<readonly [number, number]> = [
  [600, 250],
  [1000, 300],
  [1500, 430],
  [2000, 550],
  [2500, 700],
  [3000, 700],
];

/** Offset di deflazione interpolato per un dato rating Lichess. */
function offsetFor(lichess: number): number {
  const a = CALIBRATION_ANCHORS;
  if (lichess <= a[0][0]) return a[0][1];
  const last = a[a.length - 1];
  if (lichess >= last[0]) return last[1];
  for (let i = 0; i < a.length - 1; i++) {
    const [x0, y0] = a[i];
    const [x1, y1] = a[i + 1];
    if (lichess >= x0 && lichess <= x1) {
      const t = (lichess - x0) / (x1 - x0);
      return y0 + t * (y1 - y0);
    }
  }
  return last[1];
}

/** Rating puzzle Lichess → Elo OTB equivalente della "forza" che batti risolvendolo. */
export function lichessPuzzleToOtb(lichess: number): number {
  return Math.round(lichess - offsetFor(lichess));
}

/**
 * Inverso: Elo OTB → rating puzzle Lichess equivalente.
 * Serve a `selectNextPuzzle` per centrare la finestra sulla scala NATIVA della
 * tabella `puzzles` partendo dal rating OTB dell'utente. La relazione è monotòna
 * → ricerca binaria sul dominio Lichess plausibile.
 */
export function otbToLichessPuzzle(otb: number): number {
  let lo = 400;
  let hi = 3200;
  for (let i = 0; i < 40; i++) {
    const mid = (lo + hi) / 2;
    if (lichessPuzzleToOtb(mid) < otb) lo = mid;
    else hi = mid;
  }
  return Math.round((lo + hi) / 2);
}
