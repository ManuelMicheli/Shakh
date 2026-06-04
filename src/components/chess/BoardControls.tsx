"use client";

import { useEffect, type RefObject } from "react";
import {
  ChevronFirst,
  ChevronLast,
  ChevronLeft,
  ChevronRight,
  FlipVertical2,
} from "lucide-react";
import { Button } from "@/components/ui/button";

export interface BoardControlsProps {
  onFirst: () => void;
  onPrev: () => void;
  onNext: () => void;
  onLast: () => void;
  onFlip: () => void;
  /** Disabilita i controlli all'indietro (già all'inizio). */
  atStart?: boolean;
  /** Disabilita i controlli in avanti (già alla fine). */
  atEnd?: boolean;
  /**
   * Elemento che, se ha il focus, abilita la navigazione da tastiera
   * (← → indietro/avanti, Home/End inizio/fine). Tipicamente il wrapper della board.
   */
  keyboardTarget?: RefObject<HTMLElement | null>;
}

/** Barra di navigazione: inizio / indietro / avanti / fine + gira scacchiera. */
export function BoardControls({
  onFirst,
  onPrev,
  onNext,
  onLast,
  onFlip,
  atStart,
  atEnd,
  keyboardTarget,
}: BoardControlsProps) {
  useEffect(() => {
    const el = keyboardTarget?.current;
    if (!el) return;

    const handler = (e: KeyboardEvent) => {
      switch (e.key) {
        case "ArrowLeft":
          e.preventDefault();
          onPrev();
          break;
        case "ArrowRight":
          e.preventDefault();
          onNext();
          break;
        case "Home":
          e.preventDefault();
          onFirst();
          break;
        case "End":
          e.preventDefault();
          onLast();
          break;
      }
    };

    el.addEventListener("keydown", handler);
    return () => el.removeEventListener("keydown", handler);
  }, [keyboardTarget, onFirst, onPrev, onNext, onLast]);

  return (
    <div className="flex items-center gap-1">
      <Button
        variant="secondary"
        size="icon"
        onClick={onFirst}
        disabled={atStart}
        aria-label="First move"
      >
        <ChevronFirst className="h-5 w-5" />
      </Button>
      <Button
        variant="secondary"
        size="icon"
        onClick={onPrev}
        disabled={atStart}
        aria-label="Previous move"
      >
        <ChevronLeft className="h-5 w-5" />
      </Button>
      <Button
        variant="secondary"
        size="icon"
        onClick={onNext}
        disabled={atEnd}
        aria-label="Next move"
      >
        <ChevronRight className="h-5 w-5" />
      </Button>
      <Button
        variant="secondary"
        size="icon"
        onClick={onLast}
        disabled={atEnd}
        aria-label="Last move"
      >
        <ChevronLast className="h-5 w-5" />
      </Button>
      <Button
        variant="ghost"
        size="icon"
        onClick={onFlip}
        aria-label="Flip the board"
        className="ml-1"
      >
        <FlipVertical2 className="h-5 w-5" />
      </Button>
    </div>
  );
}
