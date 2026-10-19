import { describe, expect, it } from "vitest";
import { findPriceAt } from "./current-price";
import type { Price } from "../prices/schema";

const quarter = (start: string, end: string, sek: number): Price => ({
  SEK_per_kWh: sek,
  EUR_per_kWh: 0,
  EXR: 0,
  time_start: `2026-10-16T${start}:00+02:00`,
  time_end: `2026-10-16T${end}:00+02:00`,
});

const prices = [quarter("14:00", "14:15", 0.3), quarter("14:15", "14:30", 0.5)];

describe("findPriceAt", () => {
  it("finds the quarter that contains the time", () => {
    expect(
      findPriceAt(prices, new Date("2026-10-16T14:20:00+02:00"))?.SEK_per_kWh,
    ).toBe(0.5);
  });

  it("treats the end time as the start of the next quarter", () => {
    expect(
      findPriceAt(prices, new Date("2026-10-16T14:15:00+02:00"))?.SEK_per_kWh,
    ).toBe(0.5);
  });

  it("returns undefined outside the prices", () => {
    expect(
      findPriceAt(prices, new Date("2026-10-16T18:00:00+02:00")),
    ).toBeUndefined();
  });
});
