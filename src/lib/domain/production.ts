import { areas, type Area } from "./area";

/** Appens fem kraftslag, i den ordning de visas. */
export const energyKinds = ["vatten", "karn", "vind", "sol", "varme"] as const;
export type EnergyKind = (typeof energyKinds)[number];

export const energyNames: Record<EnergyKind, { name: string; long: string }> = {
  vatten: { name: "Vatten", long: "vattenkraft" },
  karn: { name: "Kärnkraft", long: "kärnkraft" },
  vind: { name: "Vind", long: "vindkraft" },
  sol: { name: "Sol", long: "solkraft" },
  varme: { name: "Värme", long: "värmekraft" },
};

/** MW per kraftslag. */
export type Mix = Record<EnergyKind, number>;

/** En kvart i ett område eller i hela Sverige. Alla värden i MW. */
export type ProductionPoint = {
  /** Kvartens start i millisekunder (UTC) */
  time: number;
  mix: Mix;
  /** Den del av produktionen som kommer från fossila bränslen */
  fossil: number;
  /** null om förbrukningen inte är publicerad än */
  consumption: number | null;
};

export const QUARTER = 15 * 60 * 1000;

export const emptyMix = (): Mix => ({
  vatten: 0,
  karn: 0,
  vind: 0,
  sol: 0,
  varme: 0,
});

// ENTSO-E:s koder för kraftslag (psrType). Allt som inte står här räknas som värme och övrigt.
const psrKinds: Record<string, EnergyKind> = {
  B10: "vatten", // pumpkraft
  B11: "vatten", // strömmande vatten
  B12: "vatten", // vattenmagasin
  B14: "karn",
  B16: "sol",
  B18: "vind", // havsbaserad
  B19: "vind", // landbaserad
};
// Brunkol, kolgas, fossilgas, stenkol, olja, oljeskiffer och torv
const fossilPsrTypes = new Set([
  "B02",
  "B03",
  "B04",
  "B05",
  "B06",
  "B07",
  "B08",
]);

export function kindFromPsrType(psrType: string): {
  kind: EnergyKind;
  fossil: boolean;
} {
  return {
    kind: psrKinds[psrType] ?? "varme",
    fossil: fossilPsrTypes.has(psrType),
  };
}

/** "PT15M" → 15, "PT60M" → 60. Andra upplösningar stöds inte. */
export function resolutionMinutes(resolution: string): number {
  const match = /^PT(\d+)M$/.exec(resolution);
  if (!match) throw new Error(`Okänd upplösning: ${resolution}`);
  return Number(match[1]);
}

export type RawPeriod = {
  /** "2026-10-26T23:00Z" */
  start: string;
  end: string;
  resolution: string;
  points: { position: number; quantity: number }[];
};

/**
 * Gör om en period från ENTSO-E till ett värde per kvart.
 *
 * Två saker att tänka på:
 * - En timme blir fyra kvartar med samma MW, eftersom MW är effekt och inte energi.
 * - ENTSO-E använder kurvtyp A03: en position som saknas har samma värde som
 *   positionen före. Därför fyller vi på med det senaste värdet.
 */
export function expandPeriod(period: RawPeriod): Map<number, number> {
  const start = Date.parse(period.start);
  const end = Date.parse(period.end);
  const step = resolutionMinutes(period.resolution) * 60 * 1000;
  const byPosition = new Map(
    period.points.map((p) => [p.position, p.quantity]),
  );

  const result = new Map<number, number>();
  let last: number | undefined;
  for (let position = 1; start + (position - 1) * step < end; position++) {
    last = byPosition.get(position) ?? last;
    if (last === undefined) continue;
    const from = start + (position - 1) * step;
    for (let t = from; t < from + step; t += QUARTER) result.set(t, last);
  }
  return result;
}

export type GenerationSeries = { psrType: string; values: Map<number, number> };

/**
 * Bygger ett områdes kvartar av produktionen per kraftslag och förbrukningen.
 * Bara kvartar där det finns produktion tas med.
 */
export function combineSeries(
  generation: GenerationSeries[],
  consumption: Map<number, number>,
): ProductionPoint[] {
  const byTime = new Map<number, ProductionPoint>();
  for (const series of generation) {
    const { kind, fossil } = kindFromPsrType(series.psrType);
    for (const [time, mw] of series.values) {
      const point = byTime.get(time) ?? {
        time,
        mix: emptyMix(),
        fossil: 0,
        consumption: consumption.get(time) ?? null,
      };
      point.mix[kind] += mw;
      if (fossil) point.fossil += mw;
      byTime.set(time, point);
    }
  }
  return [...byTime.values()].sort((a, b) => a.time - b.time);
}

/** Hela Sverige: summan av de fyra områdena, bara för kvartar där alla fyra har data. */
export function sumAreas(
  byArea: Record<Area, ProductionPoint[]>,
): ProductionPoint[] {
  const maps = areas.map(
    (area) => new Map(byArea[area].map((p) => [p.time, p])),
  );
  return byArea[areas[0]].flatMap((first) => {
    const points = maps.map((m) => m.get(first.time));
    if (points.some((p) => p === undefined)) return [];
    const all = points as ProductionPoint[];
    const mix = emptyMix();
    for (const p of all)
      for (const kind of energyKinds) mix[kind] += p.mix[kind];
    return [
      {
        time: first.time,
        mix,
        fossil: all.reduce((sum, p) => sum + p.fossil, 0),
        consumption: all.some((p) => p.consumption === null)
          ? null
          : all.reduce((sum, p) => sum + p.consumption!, 0),
      },
    ];
  });
}

/** Den senaste kvarten där förbrukningen också finns, annars den senaste med produktion. */
export function latestPoint(points: ProductionPoint[]): ProductionPoint | null {
  for (let i = points.length - 1; i >= 0; i--)
    if (points[i].consumption !== null) return points[i];
  return points.at(-1) ?? null;
}

export type ProductionSummary = {
  total: number;
  /** Kraftslagen med mest först, utan de som är 0 */
  shares: { kind: EnergyKind; mw: number; percent: number }[];
  /** 0–100 */
  fossilFree: number;
  /** Plus är export, minus är import. null om förbrukningen saknas. */
  net: number | null;
};

export function summarizePoint(point: ProductionPoint): ProductionSummary {
  const total = energyKinds.reduce((sum, kind) => sum + point.mix[kind], 0);
  const percent = (mw: number) => (total > 0 ? (mw / total) * 100 : 0);
  return {
    total,
    shares: energyKinds
      .map((kind) => ({
        kind,
        mw: point.mix[kind],
        percent: percent(point.mix[kind]),
      }))
      .filter((s) => s.mw > 0)
      .sort((a, b) => b.mw - a.mw),
    fossilFree: total > 0 ? 100 - percent(point.fossil) : 100,
    net: point.consumption === null ? null : total - point.consumption,
  };
}

/**
 * Avrundar procent så att summan blir exakt 100, så att listan inte visar 99 % eller 101 %.
 * Den med störst rest får den extra procentenheten.
 */
export function roundPercents(values: number[]): number[] {
  const floors = values.map(Math.floor);
  let missing =
    Math.round(values.reduce((sum, v) => sum + v, 0)) -
    floors.reduce((sum, v) => sum + v, 0);
  const order = values
    .map((v, i) => ({ i, rest: v - Math.floor(v) }))
    .sort((a, b) => b.rest - a.rest);
  for (const { i } of order) {
    if (missing <= 0) break;
    floors[i]++;
    missing--;
  }
  return floors;
}

/**
 * De senaste kvartarnas förbrukning från ENTSO-E är ibland preliminär och nästan lika stor som
 * produktionen, troligen för att utlandshandeln inte är inräknad än. I SE2 kunde den hoppa från
 * 1 500 till 6 400 MW mellan två kvartar. Riktig förbrukning ändras aldrig så snabbt.
 *
 * Funktionen letar efter ett sådant hopp bland de sista kvartarna och tar bort förbrukningen
 * därifrån och framåt. Då väljer latestPoint en tidigare kvart med en pålitlig siffra.
 */
export function dropUnsettledConsumption(
  points: ProductionPoint[],
  maxJump = 0.15,
  window = 8,
): ProductionPoint[] {
  const from = Math.max(1, points.length - window);
  for (let i = from; i < points.length; i++) {
    const before = points[i - 1].consumption;
    const now = points[i].consumption;
    if (before === null || now === null || before === 0) continue;
    if (Math.abs(now - before) / before > maxJump) {
      return points.map((p, j) => (j >= i ? { ...p, consumption: null } : p));
    }
  }
  return points;
}
