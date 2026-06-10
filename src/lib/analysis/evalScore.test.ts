import { describe, expect, it } from "vitest";
import { decodeEval, encodeEval, toMoverCp, toWhiteCpClamped } from "./evalScore";
import { MATE_SCORE } from "./thresholds";

describe("encodeEval / decodeEval", () => {
  it("roundtrip cp (arrotondato all'intero)", () => {
    expect(decodeEval(encodeEval({ type: "cp", value: 137 }))).toEqual({
      type: "cp",
      value: 137,
    });
    expect(encodeEval({ type: "cp", value: 137.4 })).toBe(137);
  });

  it("roundtrip matto, segno = chi matta", () => {
    expect(encodeEval({ type: "mate", value: 3 })).toBe(MATE_SCORE - 3);
    expect(decodeEval(MATE_SCORE - 3)).toEqual({ type: "mate", value: 3 });
    expect(decodeEval(-(MATE_SCORE - 4))).toEqual({ type: "mate", value: -4 });
  });
});

describe("toMoverCp", () => {
  it("cp: ribalta il segno per il Nero", () => {
    expect(toMoverCp({ type: "cp", value: 50 }, true)).toBe(50);
    expect(toMoverCp({ type: "cp", value: 50 }, false)).toBe(-50);
  });

  it("matto: grande e monotono (matto più vicino > matto più lontano)", () => {
    const mateIn2 = toMoverCp({ type: "mate", value: 2 }, true);
    const mateIn5 = toMoverCp({ type: "mate", value: 5 }, true);
    expect(mateIn2).toBeGreaterThan(mateIn5);
    expect(mateIn5).toBeGreaterThan(10000);
  });

  it("matto subìto da chi muove è fortemente negativo", () => {
    expect(toMoverCp({ type: "mate", value: 2 }, false)).toBeLessThan(-10000);
  });
});

describe("toWhiteCpClamped", () => {
  it("satura cp e matto al cap", () => {
    expect(toWhiteCpClamped({ type: "cp", value: 1500 })).toBe(1000);
    expect(toWhiteCpClamped({ type: "cp", value: -1500 })).toBe(-1000);
    expect(toWhiteCpClamped({ type: "mate", value: 3 })).toBe(1000);
    expect(toWhiteCpClamped({ type: "mate", value: -3 })).toBe(-1000);
  });

  it("lascia invariati i cp dentro il cap", () => {
    expect(toWhiteCpClamped({ type: "cp", value: 240 })).toBe(240);
  });
});
