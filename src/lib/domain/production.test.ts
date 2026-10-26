import { describe, expect, it } from "vitest";

import {
  QUARTER,
  combineSeries,
  emptyMix,
  expandPeriod,
  kindFromPsrType,
  latestPoint,
  resolutionMinutes,
  roundPercents,
  sumAreas,
  summarizePoint,
  type ProductionPoint,
} from "./production";

const t0 = Date.parse("2026-10-26T23:00Z");

function point(
  time: number,
  mix: Partial<ProductionPoint["mix"]>,
  consumption: number | null = 1000,
  fossil = 0,
): ProductionPoint {
  return { time, mix: { ...emptyMix(), ...mix }, fossil, consumption };
}

describe("kindFromPsrType", () => {
  it("översätter kända koder", () => {
    expect(kindFromPsrType("B14")).toEqual({ kind: "karn", fossil: false });
    expect(kindFromPsrType("B12").kind).toBe("vatten");
    expect(kindFromPsrType("B19").kind).toBe("vind");
    expect(kindFromPsrType("B16").kind).toBe("sol");
  });

  it("lägger okända koder i värme och känner igen fossila", () => {
    expect(kindFromPsrType("B01")).toEqual({ kind: "varme", fossil: false }); // biobränsle
    expect(kindFromPsrType("B04")).toEqual({ kind: "varme", fossil: true }); // fossilgas
    expect(kindFromPsrType("B99").kind).toBe("varme");
  });
});

describe("resolutionMinutes", () => {
  it("läser 15 och 60 minuter", () => {
    expect(resolutionMinutes("PT15M")).toBe(15);
    expect(resolutionMinutes("PT60M")).toBe(60);
  });

  it("kastar fel på okända", () => {
    expect(() => resolutionMinutes("P1D")).toThrow();
  });
});

describe("expandPeriod", () => {
  it("ger en kvart per position vid 15 minuter", () => {
    const values = expandPeriod({
      start: "2026-10-26T23:00Z",
      end: "2026-10-26T23:30Z",
      resolution: "PT15M",
      points: [
        { position: 1, quantity: 100 },
        { position: 2, quantity: 120 },
      ],
    });
    expect([...values]).toEqual([
      [t0, 100],
      [t0 + QUARTER, 120],
    ]);
  });

  it("delar en timme i fyra kvartar med samma MW", () => {
    const values = expandPeriod({
      start: "2026-10-26T23:00Z",
      end: "2026-10-27T00:00Z",
      resolution: "PT60M",
      points: [{ position: 1, quantity: 600 }],
    });
    expect([...values.values()]).toEqual([600, 600, 600, 600]);
  });

  it("fyller saknade positioner med värdet före (kurvtyp A03)", () => {
    const values = expandPeriod({
      start: "2026-10-26T23:00Z",
      end: "2026-10-27T00:00Z",
      resolution: "PT15M",
      points: [
        { position: 1, quantity: 50 },
        { position: 4, quantity: 80 },
      ],
    });
    expect([...values.values()]).toEqual([50, 50, 50, 80]);
  });
});

describe("combineSeries", () => {
  it("summerar koder till kraftslag och tar med förbrukningen", () => {
    const points = combineSeries(
      [
        { psrType: "B11", values: new Map([[t0, 100]]) },
        { psrType: "B12", values: new Map([[t0, 300]]) },
        { psrType: "B04", values: new Map([[t0, 20]]) },
      ],
      new Map([[t0, 350]]),
    );
    expect(points).toEqual([point(t0, { vatten: 400, varme: 20 }, 350, 20)]);
  });

  it("ger null när förbrukningen saknas", () => {
    const points = combineSeries(
      [{ psrType: "B14", values: new Map([[t0, 5000]]) }],
      new Map(),
    );
    expect(points[0].consumption).toBeNull();
  });
});

describe("sumAreas", () => {
  it("summerar de fyra områdena och hoppar över kvartar som saknas i något", () => {
    const t1 = t0 + QUARTER;
    const sweden = sumAreas({
      SE1: [
        point(t0, { vatten: 3000 }, 1000),
        point(t1, { vatten: 3100 }, 1000),
      ],
      SE2: [point(t0, { vind: 2000 }, 1500), point(t1, { vind: 2100 }, 1500)],
      SE3: [point(t0, { karn: 6000 }, 10000), point(t1, { karn: 6000 }, null)],
      SE4: [point(t0, { sol: 100 }, 3000)],
    });
    expect(sweden).toEqual([
      point(t0, { vatten: 3000, vind: 2000, karn: 6000, sol: 100 }, 15500),
    ]);
  });
});

describe("latestPoint", () => {
  it("väljer den senaste kvarten som har förbrukning", () => {
    const points = [
      point(t0, { vind: 1 }),
      point(t0 + QUARTER, { vind: 2 }, null),
    ];
    expect(latestPoint(points)?.time).toBe(t0);
  });

  it("tar den senaste om ingen har förbrukning", () => {
    expect(latestPoint([point(t0, { vind: 1 }, null)])?.time).toBe(t0);
    expect(latestPoint([])).toBeNull();
  });
});

describe("summarizePoint", () => {
  it("räknar total, andelar, fossilfritt och export", () => {
    const s = summarizePoint(
      point(t0, { vatten: 600, vind: 300, varme: 100 }, 800, 50),
    );
    expect(s.total).toBe(1000);
    expect(s.shares.map((x) => [x.kind, x.percent])).toEqual([
      ["vatten", 60],
      ["vind", 30],
      ["varme", 10],
    ]);
    expect(s.fossilFree).toBe(95);
    expect(s.net).toBe(200);
  });

  it("ger minus vid import och null utan förbrukning", () => {
    expect(summarizePoint(point(t0, { vind: 500 }, 900)).net).toBe(-400);
    expect(summarizePoint(point(t0, { vind: 500 }, null)).net).toBeNull();
  });
});

describe("roundPercents", () => {
  it("avrundar så att summan blir 100", () => {
    expect(roundPercents([33.3, 33.3, 33.4])).toEqual([33, 33, 34]);
    expect(roundPercents([35.5, 28.4, 30.1, 1.6, 4.4])).toEqual([
      36, 28, 30, 2, 4,
    ]);
  });
});
