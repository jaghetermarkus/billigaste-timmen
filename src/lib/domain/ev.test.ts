import { describe, expect, it } from "vitest";

import type { Price } from "../prices/schema";
import {
  chargeKwh,
  chargeQuarters,
  defaultEvSettings,
  evSekPerMil,
  findChargeWindow,
  fuelSekPerMil,
  nextDeadline,
  percentCheaper,
  planCharge,
  startLabel,
} from "./ev";

const QUARTER = 15 * 60 * 1000;

/** Kvartspriser från start, en kvart per värde */
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

describe("kostnad per mil", () => {
  it("räknar med moms, avgifter och laddförlust", () => {
    // (0,42 × 1,25 + 0,85) × 1,7 × 1,1
    expect(evSekPerMil(0.42, defaultEvSettings)).toBeCloseTo(2.571, 3);
  });

  it("räknar bensinbilen", () => {
    expect(fuelSekPerMil(defaultEvSettings)).toBeCloseTo(11.3685, 4);
  });

  it("ger procent billigare, och negativt när elbilen är dyrare", () => {
    expect(percentCheaper(2.5, 10)).toBe(75);
    expect(percentCheaper(12, 10)).toBe(-20);
  });
});

describe("laddningen", () => {
  it("räknar energin från väggen", () => {
    // 75 kWh × 60 % × 1,1
    expect(chargeKwh(defaultEvSettings)).toBeCloseTo(49.5, 3);
  });

  it("avrundar laddtiden uppåt till hela kvartar", () => {
    // 49,5 kWh / 11 kW = 4,5 h = 18 kvartar
    expect(chargeQuarters(defaultEvSettings)).toBe(18);
    expect(chargeQuarters({ ...defaultEvSettings, chargerKw: 10 })).toBe(20);
  });
});

describe("nextDeadline", () => {
  it("tar 07:00 i morgon på kvällen", () => {
    const now = new Date("2026-10-23T18:00:00+02:00");
    expect(nextDeadline(now, "07:00").toISOString()).toBe(
      "2026-10-24T05:00:00.000Z",
    );
  });

  it("tar 07:00 i dag tidigt på morgonen", () => {
    const now = new Date("2026-10-24T03:00:00+02:00");
    expect(nextDeadline(now, "07:00").toISOString()).toBe(
      "2026-10-24T05:00:00.000Z",
    );
  });

  it("klarar natten när sommartiden tar slut", () => {
    // 25 oktober 2026 går klockan tillbaka, så 07:00 är +01:00
    const now = new Date("2026-10-24T18:00:00+02:00");
    expect(nextDeadline(now, "07:00").toISOString()).toBe(
      "2026-10-25T06:00:00.000Z",
    );
  });
});

describe("findChargeWindow", () => {
  // 18:00 till 12:00 dagen efter. Billigt 02–04, ännu billigare 08–10 (efter deadline).
  const values = Array.from({ length: 72 }, (_, i) =>
    i >= 32 && i < 40 ? 0.1 : i >= 56 && i < 64 ? 0 : 1,
  );
  const prices = quarters("2026-10-23T18:00:00+02:00", values);

  it("väljer billigaste fönstret före deadline", () => {
    const now = new Date("2026-10-23T18:00:00+02:00");
    const w = findChargeWindow(prices, { now, readyBy: "07:00", quarters: 8 });
    expect(w?.startIndex).toBe(32); // 02:00
  });

  it("hoppar över kvartar som redan har passerat", () => {
    const now = new Date("2026-10-24T03:00:00+02:00");
    const w = findChargeWindow(prices, { now, readyBy: "07:00", quarters: 8 });
    expect(w?.startIndex).toBe(36); // 03:00, resten av det billiga
  });

  it("ger null när laddningen inte hinner bli klar", () => {
    const now = new Date("2026-10-24T05:00:00+02:00");
    expect(
      findChargeWindow(prices, { now, readyBy: "07:00", quarters: 12 }),
    ).toBeNull();
  });
});

describe("startLabel", () => {
  const evening = new Date("2026-10-23T17:15:00+02:00");

  it("säger i kväll och i natt samma dag", () => {
    expect(startLabel("2026-10-23T19:00:00+02:00", evening)).toBe("I kväll");
    expect(startLabel("2026-10-23T23:00:00+02:00", evening)).toBe("I natt");
  });

  it("säger i natt och i morgon dagen efter", () => {
    expect(startLabel("2026-10-24T01:15:00+02:00", evening)).toBe("I natt");
    expect(startLabel("2026-10-24T09:00:00+02:00", evening)).toBe("I morgon");
  });

  it("säger i natt efter midnatt, samma datum", () => {
    const lateNight = new Date("2026-10-24T00:30:00+02:00");
    expect(startLabel("2026-10-24T02:00:00+02:00", lateNight)).toBe("I natt");
  });

  it("säger i dag på dagen", () => {
    const morning = new Date("2026-10-23T10:00:00+02:00");
    expect(startLabel("2026-10-23T13:00:00+02:00", morning)).toBe("I dag");
  });
});

describe("planCharge", () => {
  // 18:00 till 12:00: 1 kr överallt utom 0,2 kr kl 01–05
  const values = Array.from({ length: 72 }, (_, i) =>
    i >= 28 && i < 44 ? 0.2 : 1,
  );
  const prices = quarters("2026-10-23T18:00:00+02:00", values);
  const s = { ...defaultEvSettings, chargerKw: 12.375 }; // 49,5 kWh på exakt 4 h = 16 kvartar

  it("räknar ut fönster, kr/mil och kostnad", () => {
    const plan = planCharge(prices, s, new Date("2026-10-23T18:00:00+02:00"));
    expect(plan?.window.startIndex).toBe(28); // 01:00
    expect(plan?.first).toBe(0);
    expect(plan?.perMil).toBeCloseTo(evSekPerMil(0.2, s), 6);
    expect(plan?.nowPerMil).toBeCloseTo(evSekPerMil(1, s), 6);
    // (0,2 × 1,25 + 0,85) × 49,5 kWh
    expect(plan?.cost).toBeCloseTo(54.45, 2);
    expect(plan?.percent).toBeGreaterThan(0);
  });

  it("ger null när laddningen inte hinner bli klar", () => {
    expect(
      planCharge(prices, s, new Date("2026-10-24T05:00:00+02:00")),
    ).toBeNull();
  });
});
