"use client";

import { Fragment, useEffect, useRef } from "react";
import type { MoveTree, MoveNode } from "@/lib/chess/moveTree";
import { cn } from "@/lib/utils";

export interface VariationTreeProps {
  tree: MoveTree;
  currentNodeId: string;
  onSelect: (nodeId: string) => void;
  className?: string;
}

const NAG_SYMBOL: Record<number, string> = {
  1: "!",
  2: "?",
  3: "!!",
  4: "??",
  5: "!?",
  6: "?!",
};

function turnFromFen(fen: string): "w" | "b" {
  return fen.split(" ")[1] === "b" ? "b" : "w";
}
function fullmove(fen: string): number {
  const n = Number(fen.split(" ")[5]);
  return Number.isFinite(n) && n > 0 ? n : 1;
}
function nags(node: MoveNode): string {
  return (node.nags ?? []).map((n) => NAG_SYMBOL[n] ?? `$${n}`).join("");
}

/**
 * Viewer "ad albero" della linea (equivalente a `MoveList` per le varianti).
 * Mainline in evidenza; varianti annidate tra parentesi e attenuate; NAG come
 * simboli, commenti inline. SAN in monospace. Click su una mossa → `onSelect`.
 */
export function VariationTree({
  tree,
  currentNodeId,
  onSelect,
  className,
}: VariationTreeProps) {
  const activeRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    activeRef.current?.scrollIntoView({ block: "nearest" });
  }, [currentNodeId]);

  const root = tree.nodes[tree.rootId];

  if (!root || root.children.length === 0) {
    return (
      <div className={cn("font-mono text-sm text-text-muted", className)}>
        Nessuna mossa.
      </div>
    );
  }

  /** Una mossa cliccabile. */
  const moveButton = (parent: MoveNode, node: MoveNode, forceNumber: boolean, muted: boolean) => {
    const white = turnFromFen(parent.fen) === "w";
    const num = fullmove(parent.fen);
    const prefix = white ? `${num}.` : forceNumber ? `${num}…` : "";
    const active = node.id === currentNodeId;
    return (
      <button
        ref={active ? activeRef : undefined}
        type="button"
        onClick={() => onSelect(node.id)}
        className={cn(
          "rounded px-1 transition-colors hover:bg-surface-2",
          active && "bg-text text-bg hover:bg-text",
          !active && muted && "text-text-muted",
        )}
      >
        {prefix && <span className="text-text-muted">{prefix} </span>}
        <span className="font-medium">
          {node.san}
          {nags(node)}
        </span>
      </button>
    );
  };

  /**
   * Renderizza la linea che parte dai figli di `parent`: mainline scorrevole,
   * con le varianti dei figli rese tra parentesi (ricorsivo).
   */
  const renderChildren = (
    parent: MoveNode,
    forceNumber: boolean,
    depth: number,
  ): React.ReactNode => {
    if (parent.children.length === 0) return null;
    const [mainId, ...varIds] = parent.children;
    const main = tree.nodes[mainId];
    const muted = depth > 0;

    return (
      <>
        {moveButton(parent, main, forceNumber, muted)}{" "}
        {main.comment && (
          <span className="text-text-muted italic">{main.comment} </span>
        )}
        {varIds.map((vId) => {
          const v = tree.nodes[vId];
          return (
            <span
              key={vId}
              className={cn(
                "text-text-muted",
                depth === 0 && "ml-1 rounded-sm bg-surface-2/40 px-1",
              )}
            >
              ({moveButton(parent, v, true, true)}{" "}
              {v.comment && <span className="italic">{v.comment} </span>}
              {renderChildren(v, false, depth + 1)})
            </span>
          );
        })}{" "}
        {renderChildren(main, varIds.length > 0 || Boolean(main.comment), depth)}
      </>
    );
  };

  return (
    <div
      className={cn(
        "max-h-72 overflow-y-auto font-mono text-sm leading-7",
        className,
      )}
    >
      <Fragment>{renderChildren(root, true, 0)}</Fragment>
    </div>
  );
}
