import { describe, expect, it } from "vitest";

import type { Price } from "../prices/schema";
import { formatDuration, planMachine, type Machine } from "./machines";

const QUARTER = 15 * 60 * 1000;

function quarters(startIso: string, values: number[]): Price[] {
  const start = new Date(startIso).getTime();
  return values.map((sek, i) => ({
    SEK_per_kWh: sek,
    EUR_per_kWh: 0,
    EXR: 0,
    time_start: new Date(start + i * QUARTER).toISOString(),
    time_end: new Date(start + (i + 1) * QUARTER).toISOString(),
  }));
}

// 18:00 och 48 timmar framåt. Billigt 02–04, ännu billigare dagen efter kl 20 (mer än 24 h bort).
const values = Array.from({ length: 192 }, (_, i) =>
  i >= 32 && i < 40 ? 0.2 : i >= 104 && i < 112 ? 0.1 : 1,
);
const prices = quarters("2026-10-23T18:00:00+02:00", values);
const now = new Date("2026-10-23T18:00:00+02:00");

const disk: Machine = {
  id: "disk",
  name: "Diskmaskin",
  quarters: 8,
  kwh: 1,
  readyBy: null,
};

describe("planMachine", () => {
  it("hittar billigaste starten inom 24 timmar", () => {
    expect(planMachine(prices, disk, now)?.window.startIndex).toBe(32); // 02:00
  });

  it("räknar besparingen med moms", () => {
    // (1 − 0,2) × 1 kWh × 1,25
    expect(planMachine(prices, disk, now)?.savingSek).toBeCloseTo(1, 6);
  });

  it("respekterar klar senast", () => {
    const tidig = { ...disk, readyBy: "03:00" };
    // Måste vara klar 03:00, så den kan inte ta hela det billiga fönstret
    expect(planMachine(prices, tidig, now)?.window.startIndex).toBe(28); // 01:00
  });

  it("ger null när den inte hinner bli klar", () => {
    const sent = new Date("2026-10-24T02:30:00+02:00");
    expect(planMachine(prices, { ...disk, readyBy: "03:00" }, sent)).toBeNull();
  });
});

describe("formatDuration", () => {
  it("skriver timmar och minuter", () => {
    expect(formatDuration(8)).toBe("2 h");
    expect(formatDuration(6)).toBe("1,5 h");
    expect(formatDuration(3)).toBe("45 min");
  });
});
