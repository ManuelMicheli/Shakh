"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
} from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { useToast } from "@/components/ui/toast";
import {
  analyzeGame,
  InvalidPgnError,
  EmptyGameError,
} from "@/lib/analysis/pipeline";
import {
  saveAnalysisChunk,
  finalizeGameAnalysis,
  getSavedAnalysisPlies,
} from "@/app/app/partite/actions";

export type JobStatus = "running" | "done" | "error";

export interface AnalysisJob {
  gameId: string;
  title: string;
  status: JobStatus;
  current: number;
  total: number;
  error?: string;
}

export interface StartOptions {
  depth?: number;
}

/** Una partita da analizzare (con il PGN necessario al runner). */
export interface JobInput {
  gameId: string;
  pgn: string;
  title: string;
}

/** Massimo di partite accodabili in un solo lotto. */
export const MAX_BATCH_JOBS = 3;

interface AnalysisJobCtx {
  job: AnalysisJob | null;
  /** Partite ancora in coda (oltre a quella in corso). */
  queueLength: number;
  /** Avvia/accoda l'analisi di una partita; ritorna sempre `true` (accodata). */
  start: (
    gameId: string,
    pgn: string,
    title: string,
    opts?: StartOptions,
  ) => boolean;
  /** Accoda più partite (max {@link MAX_BATCH_JOBS}); ritorna quante ne ha accodate. */
  startBatch: (jobs: JobInput[], opts?: StartOptions) => number;
  /** Annulla il job in corso e svuota la coda. */
  cancel: () => void;
  /** Chiude la mini-tab (solo a job finito/errore e coda vuota). */
  dismiss: () => void;
}

const Ctx = createContext<AnalysisJobCtx | null>(null);

export function useAnalysisJob() {
  const c = useContext(Ctx);
  if (!c) throw new Error("useAnalysisJob deve stare dentro <AnalysisJobProvider>");
  return c;
}

const STORAGE_KEY = "shakh:analysis-job";

interface PersistedJob {
  gameId: string;
  title: string;
  pgn: string;
  depth?: number;
}

interface PersistedState {
  current: PersistedJob | null;
  queue: PersistedJob[];
}

function isJob(x: unknown): x is PersistedJob {
  return (
    typeof x === "object" &&
    x !== null &&
    typeof (x as PersistedJob).gameId === "string" &&
    typeof (x as PersistedJob).pgn === "string"
  );
}

function readPersisted(): PersistedState | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const p = JSON.parse(raw) as unknown;
    // Forma legacy: un singolo job al livello radice.
    if (isJob(p)) return { current: p, queue: [] };
    if (typeof p === "object" && p !== null) {
      const s = p as Partial<PersistedState>;
      const current = isJob(s.current) ? s.current : null;
      const queue = Array.isArray(s.queue) ? s.queue.filter(isJob) : [];
      if (current || queue.length > 0) return { current, queue };
    }
  } catch {
    // ignora
  }
  return null;
}

/**
 * Possiede il job d'analisi a livello di shell (sopravvive alla navigazione tra
 * pagine sotto /app) e lo persiste in localStorage per riprenderlo dopo un
 * reload. Le partite vengono processate in coda, una alla volta (l'analisi vera
 * gira nel pool di worker condiviso, vedi `analyzeGame`).
 */
export function AnalysisJobProvider({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const t = useTranslations("games");
  const { toast } = useToast();
  const [job, setJob] = useState<AnalysisJob | null>(null);
  const [queueLength, setQueueLength] = useState(0);

  const abortRef = useRef(false); // annulla la partita in corso
  const drainingRef = useRef(false); // un drain è già attivo
  const queueRef = useRef<PersistedJob[]>([]);
  const currentRef = useRef<PersistedJob | null>(null);

  const persist = useCallback(() => {
    try {
      if (!currentRef.current && queueRef.current.length === 0) {
        localStorage.removeItem(STORAGE_KEY);
      } else {
        localStorage.setItem(
          STORAGE_KEY,
          JSON.stringify({ current: currentRef.current, queue: queueRef.current }),
        );
      }
    } catch {
      // ignora
    }
  }, []);

  /** Analizza una singola partita fino in fondo (o all'annullamento). */
  const runOne = useCallback(
    async (p: PersistedJob) => {
      abortRef.current = false;
      currentRef.current = p;
      persist();
      setJob({
        gameId: p.gameId,
        title: p.title,
        status: "running",
        current: 0,
        total: 0,
      });

      try {
        const saved = new Set(await getSavedAnalysisPlies(p.gameId));
        const { aborted } = await analyzeGame(p.pgn, {
          depth: p.depth,
          savedPlies: saved,
          signal: () => abortRef.current,
          onProgress: (current, total) =>
            setJob((j) => (j ? { ...j, current, total } : j)),
          onBatch: async (batch) => {
            await saveAnalysisChunk(p.gameId, batch);
          },
        });

        if (aborted || abortRef.current) {
          setJob(null);
          return;
        }

        const res = await finalizeGameAnalysis(p.gameId);
        if (!res.ok) {
          setJob((j) => (j ? { ...j, status: "error", error: res.error } : j));
          toast({
            title: t("saveFailed"),
            description: res.error,
            variant: "error",
          });
          return;
        }
        setJob((j) => (j ? { ...j, status: "done" } : j));
        toast({
          title: t("analysisComplete"),
          description: p.title,
          variant: "success",
        });
        router.refresh();
      } catch (e) {
        const msg =
          e instanceof InvalidPgnError || e instanceof EmptyGameError
            ? e.message
            : t("errDuringAnalysis");
        setJob((j) => (j ? { ...j, status: "error", error: msg } : j));
        toast({ title: t("analysisFailed"), description: msg, variant: "error" });
      } finally {
        currentRef.current = null;
        persist();
      }
    },
    [router, toast, persist, t],
  );

  /** Svuota la coda processando una partita alla volta. */
  const drain = useCallback(async () => {
    if (drainingRef.current) return;
    drainingRef.current = true;
    try {
      while (queueRef.current.length > 0) {
        const next = queueRef.current.shift()!;
        setQueueLength(queueRef.current.length);
        await runOne(next);
      }
    } finally {
      drainingRef.current = false;
    }
  }, [runOne]);

  const start = useCallback<AnalysisJobCtx["start"]>(
    (gameId, pgn, title, opts) => {
      queueRef.current.push({ gameId, title, pgn, depth: opts?.depth });
      setQueueLength(queueRef.current.length);
      persist();
      void drain();
      return true;
    },
    [drain, persist],
  );

  const startBatch = useCallback<AnalysisJobCtx["startBatch"]>(
    (jobs, opts) => {
      const slice = jobs.slice(0, MAX_BATCH_JOBS);
      if (slice.length === 0) return 0;
      for (const j of slice) {
        queueRef.current.push({
          gameId: j.gameId,
          title: j.title,
          pgn: j.pgn,
          depth: opts?.depth,
        });
      }
      setQueueLength(queueRef.current.length);
      persist();
      void drain();
      return slice.length;
    },
    [drain, persist],
  );

  const cancel = useCallback(() => {
    abortRef.current = true;
    queueRef.current = [];
    setQueueLength(0);
    persist();
  }, [persist]);

  const dismiss = useCallback(() => {
    if (drainingRef.current || currentRef.current) return; // job ancora attivo
    setJob(null);
  }, []);

  // Ripresa dopo reload: rimette in coda ciò che era rimasto e riavvia il drain.
  useEffect(() => {
    const s = readPersisted();
    if (!s) return;
    queueRef.current = [...(s.current ? [s.current] : []), ...s.queue];
    setQueueLength(queueRef.current.length);
    void drain();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <Ctx.Provider
      value={{ job, queueLength, start, startBatch, cancel, dismiss }}
    >
      {children}
    </Ctx.Provider>
  );
}
