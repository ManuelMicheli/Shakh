import { describe, expect, it } from "vitest";
import { encodeEval } from "@/lib/analysis/evalScore";
import { evalText, moverFromPly, phaseFromFen } from "./format";

const START_FEN = "rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1";

describe("evalText", () => {
  it("null resta null", () => {
    expect(evalText(null)).toBeNull();
  });

  it("cp white-relative con segno e meno tipografico", () => {
    expect(evalText(encodeEval({ type: "cp", value: 140 }))).toBe("+1.4");
    expect(evalText(encodeEval({ type: "cp", value: -70 }))).toBe("−0.7");
    expect(evalText(encodeEval({ type: "cp", value: 0 }))).toBe("0.0");
  });

  it("matto formattato come M<n>", () => {
    expect(evalText(encodeEval({ type: "mate", value: 5 }))).toBe("M5");
    expect(evalText(encodeEval({ type: "mate", value: -5 }))).toBe("−M5");
  });
});

describe("phaseFromFen", () => {
  it("posizione iniziale → apertura", () => {
    expect(phaseFromFen(START_FEN)).toBe("opening");
  });

  it("re e pedoni → finale", () => {
    expect(phaseFromFen("8/8/4k3/8/8/4K3/4P3/8 w - - 0 50")).toBe("endgame");
  });

  it("materiale pieno oltre la 10ª mossa → mediogioco", () => {
    expect(
      phaseFromFen("rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 20"),
    ).toBe("middlegame");
  });
});

describe("moverFromPly", () => {
  it("ply dispari = Bianco, pari = Nero", () => {
    expect(moverFromPly(1)).toBe("white");
    expect(moverFromPly(2)).toBe("black");
    expect(moverFromPly(33)).toBe("white");
  });
});
