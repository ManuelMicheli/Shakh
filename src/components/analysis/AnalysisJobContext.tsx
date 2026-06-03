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

interface AnalysisJobCtx {
  job: AnalysisJob | null;
  /** Avvia l'analisi; ritorna `false` se un altro job è già attivo. */
  start: (
    gameId: string,
    pgn: string,
    title: string,
    opts?: StartOptions,
  ) => boolean;
  /** Annulla il job in corso. */
  cancel: () => void;
  /** Chiude la mini-tab (solo a job finito/errore). */
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

function readPersisted(): PersistedJob | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const p = JSON.parse(raw) as PersistedJob;
    if (p && typeof p.gameId === "string" && typeof p.pgn === "string") return p;
  } catch {
    // ignora
  }
  return null;
}

function clearPersisted() {
  try {
    localStorage.removeItem(STORAGE_KEY);
  } catch {
    // ignora
  }
}

/**
 * Possiede il job d'analisi a livello di shell (sopravvive alla navigazione tra
 * pagine sotto /app) e lo persiste in localStorage per riprenderlo dopo un
 * reload. L'analisi vera gira nel pool di worker (vedi `analyzeGame`).
 */
export function AnalysisJobProvider({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const { toast } = useToast();
  const [job, setJob] = useState<AnalysisJob | null>(null);
  const abortRef = useRef(false);
  const runningRef = useRef(false);

  const run = useCallback(
    async (p: PersistedJob) => {
      if (runningRef.current) return;
      runningRef.current = true;
      abortRef.current = false;
      setJob({
        gameId: p.gameId,
        title: p.title,
        status: "running",
        current: 0,
        total: 0,
      });
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(p));
      } catch {
        // ignora
      }

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
          clearPersisted();
          setJob(null);
          return;
        }

        const res = await finalizeGameAnalysis(p.gameId);
        clearPersisted();
        if (!res.ok) {
          setJob((j) => (j ? { ...j, status: "error", error: res.error } : j));
          toast({
            title: "Salvataggio non riuscito",
            description: res.error,
            variant: "error",
          });
          return;
        }
        setJob((j) => (j ? { ...j, status: "done" } : j));
        toast({
          title: "Analisi completata",
          description: p.title,
          variant: "success",
        });
        router.refresh();
      } catch (e) {
        clearPersisted();
        const msg =
          e instanceof InvalidPgnError || e instanceof EmptyGameError
            ? e.message
            : "Errore durante l'analisi.";
        setJob((j) => (j ? { ...j, status: "error", error: msg } : j));
        toast({ title: "Analisi non riuscita", description: msg, variant: "error" });
      } finally {
        runningRef.current = false;
      }
    },
    [router, toast],
  );

  const start = useCallback<AnalysisJobCtx["start"]>(
    (gameId, pgn, title, opts) => {
      if (runningRef.current) return false;
      void run({ gameId, title, pgn, depth: opts?.depth });
      return true;
    },
    [run],
  );

  const cancel = useCallback(() => {
    abortRef.current = true;
    clearPersisted();
  }, []);

  const dismiss = useCallback(() => {
    if (runningRef.current) return; // non chiudere un job ancora attivo
    setJob(null);
  }, []);

  // Ripresa dopo reload: se resta un descrittore persistito, riavvia il job.
  useEffect(() => {
    const p = readPersisted();
    if (p) void run(p);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <Ctx.Provider value={{ job, start, cancel, dismiss }}>{children}</Ctx.Provider>
  );
}
