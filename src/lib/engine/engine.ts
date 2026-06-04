/**
 * Servizio motore Stockfish (WASM, lite single-thread) — singleton lazy.
 *
 * Possiede UNA sola istanza del web worker (caricarne molte è costoso). Il WASM
 * (~0.6MB + NNUE ~40MB) si carica solo alla PRIMA analisi, mai al boot dell'app.
 * Il protocollo UCI testuale è wrappato in un'API a promesse/callback.
 *
 * Build attuale: Stockfish 16 single-thread → gira ovunque SENZA header COOP/COEP.
 * Per passare alla full multi-threaded in futuro:
 *   1) copiare in /engine/ i file `stockfish-nnue-16.js` + `.wasm` (vedi scripts/copy-engine.mjs);
 *   2) puntare ENGINE_WORKER_URL al nuovo file;
 *   3) aggiungere in next.config gli header `Cross-Origin-Opener-Policy: same-origin`
 *      e `Cross-Origin-Embedder-Policy: require-corp` (servono i thread/SharedArrayBuffer).
 * NON farlo ora: quegli header complicano il caricamento di risorse cross-origin.
 */

export type ScoreType = "cp" | "mate";

export interface EngineLine {
  multipv: number; // 1 = linea principale
  scoreType: ScoreType;
  score: number; // centipawn, oppure numero di mosse al matto (dal lato al tratto)
  depth: number;
  pv: string[]; // mosse in UCI (es. 'e2e4')
  pvSan?: string[]; // opzionale, riempito dai consumer via chess.js
}

export interface EngineEvaluation {
  fen: string;
  bestMove: string; // UCI
  lines: EngineLine[]; // ordinate per multipv
  depth: number;
}

export type EngineState = "idle" | "loading" | "ready" | "error";

export interface AnalyzeOptions {
  depth?: number;
  movetime?: number;
  multiPV?: number;
}

export interface AnalysisHandle {
  /** Chiamata a ogni `info`: valutazione parziale (depth corrente, linee). */
  onUpdate: (cb: (partial: EngineEvaluation) => void) => void;
  /** Si risolve al `bestmove`. Rigetta se l'analisi viene soppiantata da una nuova. */
  result: Promise<EngineEvaluation>;
  /** Invia `stop`: risolve `result` con la migliore valutazione raccolta finora. */
  cancel: () => void;
}

const ENGINE_WORKER_URL = "/engine/stockfish-nnue-16-single.js";

interface Job {
  fen: string;
  opts: AnalyzeOptions;
  multiPV: number;
  lines: Map<number, EngineLine>;
  updateCbs: ((p: EngineEvaluation) => void)[];
  resolve: (e: EngineEvaluation) => void;
  reject: (err: Error) => void;
  settled: boolean;
  superseded: boolean;
}

export class EngineService {
  private worker: Worker | null = null;
  private _state: EngineState = "idle";
  private initPromise: Promise<void> | null = null;
  private multiPV = 1;

  private currentJob: Job | null = null; // job la cui ricerca occupa il motore
  private pendingJob: Job | null = null; // job in attesa che il precedente venga fermato

  // Listener temporanei per l'handshake (uciok / readyok).
  private handshakeWaiters: { token: string; resolve: () => void }[] = [];

  get state(): EngineState {
    return this._state;
  }

  /** Crea il worker ed esegue l'handshake UCI fino a readyok. Idempotente. */
  init(): Promise<void> {
    if (this.initPromise) return this.initPromise;

    this.initPromise = new Promise<void>((resolve, reject) => {
      if (typeof window === "undefined") {
        reject(new Error("Il motore è disponibile solo lato client."));
        return;
      }
      try {
        this._state = "loading";
        const worker = new Worker(ENGINE_WORKER_URL);
        this.worker = worker;
        worker.onmessage = (e: MessageEvent) => {
          const data = typeof e.data === "string" ? e.data : String(e.data ?? "");
          this.handleLine(data);
        };
        worker.onerror = (e) => {
          this._state = "error";
          reject(new Error(`Engine worker: ${e.message ?? "error"}`));
        };

        this.send("uci");
        this.waitFor("uciok")
          .then(() => {
            this.send("isready");
            return this.waitFor("readyok");
          })
          .then(() => {
            this._state = "ready";
            resolve();
          })
          .catch(reject);
      } catch (err) {
        this._state = "error";
        reject(err instanceof Error ? err : new Error("Init motore fallita"));
      }
    });

    // Se l'init fallisce, permetti un nuovo tentativo.
    this.initPromise.catch(() => {
      this.initPromise = null;
    });
    return this.initPromise;
  }

  private send(cmd: string) {
    this.worker?.postMessage(cmd);
  }

  private waitFor(token: string): Promise<void> {
    return new Promise((resolve) => {
      this.handshakeWaiters.push({ token, resolve });
    });
  }

  setMultiPV(n: number) {
    this.multiPV = Math.max(1, Math.floor(n));
  }

  analyze(fen: string, opts: AnalyzeOptions = {}): AnalysisHandle {
    const multiPV = Math.max(1, Math.floor(opts.multiPV ?? this.multiPV));
    let resolveFn!: (e: EngineEvaluation) => void;
    let rejectFn!: (err: Error) => void;
    const result = new Promise<EngineEvaluation>((res, rej) => {
      resolveFn = res;
      rejectFn = rej;
    });

    const job: Job = {
      fen,
      opts,
      multiPV,
      lines: new Map(),
      updateCbs: [],
      resolve: resolveFn,
      reject: rejectFn,
      settled: false,
      superseded: false,
    };

    // Garantisce l'init lazy, poi avvia (o accoda) il job.
    this.init()
      .then(() => this.schedule(job))
      .catch((err) => {
        if (!job.settled) {
          job.settled = true;
          job.reject(err instanceof Error ? err : new Error("Motore non disponibile"));
        }
      });

    return {
      onUpdate: (cb) => job.updateCbs.push(cb),
      result,
      cancel: () => this.cancelJob(job),
    };
  }

  /** Avvia il job se il motore è libero, altrimenti ferma il corrente e lo accoda. */
  private schedule(job: Job) {
    if (job.settled) return; // già cancellato prima di partire
    if (!this.currentJob) {
      this.startJob(job);
      return;
    }
    // Motore occupato: soppianta. Rigetta un eventuale pending non ancora avviato.
    if (this.pendingJob && !this.pendingJob.settled) {
      this.pendingJob.settled = true;
      this.pendingJob.reject(new Error("superseded"));
    }
    this.pendingJob = job;
    // Rigetta il corrente ma tienilo come "draining" per consumarne il bestmove.
    if (!this.currentJob.settled) {
      this.currentJob.settled = true;
      this.currentJob.superseded = true;
      this.currentJob.reject(new Error("superseded"));
    }
    this.send("stop");
  }

  private startJob(job: Job) {
    this.currentJob = job;
    job.lines.clear();
    this.send(`setoption name MultiPV value ${job.multiPV}`);
    this.send(`position fen ${job.fen}`);
    if (job.opts.movetime != null) {
      this.send(`go movetime ${job.opts.movetime}`);
    } else {
      this.send(`go depth ${job.opts.depth ?? 16}`);
    }
  }

  private cancelJob(job: Job) {
    if (job === this.pendingJob) {
      this.pendingJob = null;
      if (!job.settled) {
        job.settled = true;
        job.reject(new Error("cancelled"));
      }
      return;
    }
    if (job === this.currentJob && !job.settled) {
      // Lascia che il bestmove successivo risolva con la valutazione raccolta.
      this.send("stop");
    }
  }

  private handleLine(line: string) {
    // Handshake.
    if (this.handshakeWaiters.length > 0) {
      const idx = this.handshakeWaiters.findIndex((w) => line.includes(w.token));
      if (idx !== -1) {
        const [w] = this.handshakeWaiters.splice(idx, 1);
        w.resolve();
        return;
      }
    }

    if (line.startsWith("info ")) {
      this.handleInfo(line);
    } else if (line.startsWith("bestmove")) {
      this.handleBestmove(line);
    }
  }

  private handleInfo(line: string) {
    const job = this.currentJob;
    if (!job) return;
    // Ignora le righe parziali (bound) e quelle senza pv/score.
    if (line.includes("lowerbound") || line.includes("upperbound")) return;
    const tokens = line.split(/\s+/);

    let depth = 0;
    let multipv = 1;
    let scoreType: ScoreType | null = null;
    let score = 0;
    let pv: string[] = [];

    for (let i = 0; i < tokens.length; i++) {
      const t = tokens[i];
      if (t === "depth") depth = Number(tokens[++i]);
      else if (t === "multipv") multipv = Number(tokens[++i]);
      else if (t === "score") {
        scoreType = tokens[++i] as ScoreType;
        score = Number(tokens[++i]);
      } else if (t === "pv") {
        pv = tokens.slice(i + 1);
        break;
      }
    }

    if (scoreType == null || pv.length === 0) return;

    job.lines.set(multipv, { multipv, scoreType, score, depth, pv });
    this.emitUpdate(job);
  }

  private handleBestmove(line: string) {
    const job = this.currentJob;
    if (!job) return;
    this.currentJob = null;

    const bestMove = line.split(/\s+/)[1] ?? "";
    const evaluation = this.buildEvaluation(job, bestMove);

    // Risolvi solo se non soppiantato (in tal caso era già stato rigettato).
    if (!job.superseded && !job.settled) {
      job.settled = true;
      job.resolve(evaluation);
    } else if (!job.superseded) {
      // Cancellato dall'utente: risolvi con quanto raccolto.
      job.resolve(evaluation);
    }

    // Avvia l'eventuale job in coda.
    if (this.pendingJob) {
      const next = this.pendingJob;
      this.pendingJob = null;
      if (!next.settled) this.startJob(next);
    }
  }

  private buildEvaluation(job: Job, bestMove: string): EngineEvaluation {
    const lines = [...job.lines.values()].sort((a, b) => a.multipv - b.multipv);
    const depth = lines.reduce((m, l) => Math.max(m, l.depth), 0);
    return {
      fen: job.fen,
      bestMove: bestMove && bestMove !== "(none)" ? bestMove : lines[0]?.pv[0] ?? "",
      lines,
      depth,
    };
  }

  private emitUpdate(job: Job) {
    if (job.updateCbs.length === 0) return;
    const partial = this.buildEvaluation(job, "");
    for (const cb of job.updateCbs) cb(partial);
  }

  /** Termina il worker e azzera lo stato. */
  quit() {
    this.send("quit");
    this.worker?.terminate();
    this.worker = null;
    this._state = "idle";
    this.initPromise = null;
    this.currentJob = null;
    this.pendingJob = null;
    this.handshakeWaiters = [];
  }
}

/** Singleton condiviso da tutta l'app. */
export const engine = new EngineService();
