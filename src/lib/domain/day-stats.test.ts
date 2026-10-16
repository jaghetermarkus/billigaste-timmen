import { describe, expect, it } from "vitest";
import { getDayStats } from "./day-stats";
import type { Price } from "../prices/schema";

const price = (time: string, sek: number): Price => ({
  SEK_per_kWh: sek,
  EUR_per_kWh: 0,
  EXR: 0,
  time_start: `2026-10-16T${time}:00+02:00`,
  time_end: "",
});

describe("getDayStats", () => {
  it("finds lowest, highest and average", () => {
    const stats = getDayStats([
      price("00:00", 0.5),
      price("00:15", 0.2),
      price("00:30", 0.8),
    ]);
    expect(stats.min.time_start).toContain("00:15");
    expect(stats.max.SEK_per_kWh).toBe(0.8);
    expect(stats.average).toBeCloseTo(0.5);
  });

  it("throws on an empty list", () => {
    expect(() => getDayStats([])).toThrow();
  });
});
