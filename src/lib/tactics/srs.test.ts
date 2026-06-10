import { describe, expect, it } from "vitest";
import { scheduleNext } from "./srs";

describe("scheduleNext", () => {
  it("fallimento: ease giù, intervallo azzerato, ritorno ~10 minuti", () => {
    const s = scheduleNext(null, false);
    expect(s.ease).toBeCloseTo(2.3, 2);
    expect(s.intervalDays).toBe(0);
    expect(s.dueInDays).toBeCloseTo(10 / (60 * 24), 6);
  });

  it("primo successo: intervallo 1 giorno, ease su", () => {
    const s = scheduleNext(null, true);
    expect(s.ease).toBeCloseTo(2.6, 2);
    expect(s.intervalDays).toBe(1);
    expect(s.dueInDays).toBe(1);
  });

  it("progressione: 1 → 3 → round(interval × ease)", () => {
    const second = scheduleNext({ ease: 2.5, intervalDays: 1 }, true);
    expect(second.intervalDays).toBe(3);
    const third = scheduleNext({ ease: 2.5, intervalDays: 3 }, true);
    expect(third.intervalDays).toBe(Math.round(3 * 2.5));
  });

  it("ease resta nei limiti [1.3, 3.0]", () => {
    expect(scheduleNext({ ease: 1.35, intervalDays: 0 }, false).ease).toBe(1.3);
    expect(scheduleNext({ ease: 2.95, intervalDays: 1 }, true).ease).toBe(3.0);
  });

  it("un fallimento dopo una lunga serie riporta il puzzle a breve", () => {
    const s = scheduleNext({ ease: 2.8, intervalDays: 30 }, false);
    expect(s.intervalDays).toBe(0);
    expect(s.dueInDays).toBeLessThan(0.01);
  });
});
