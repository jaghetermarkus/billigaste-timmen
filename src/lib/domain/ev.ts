import { TZDate } from "@date-fns/tz";
import { addDays } from "date-fns";

import type { Price } from "../prices/schema";
import { findCheapestWindow, type PriceWindow } from "./cheapest-window";

export type Fuel = "bensin" | "diesel";

export type EvSettings = {
  /** Bilens förbrukning enligt färddatorn */
  kwhPerMil: number;
  batteryKwh: number;
  /** Laddar från och till, i procent av batteriet */
  fromPercent: number;
  toPercent: number;
  chargerKw: number;
  /** Bilen ska vara klar senast, "HH:mm" i svensk tid */
  readyBy: string;
  /** Energiskatt och nätavgift per kWh, inklusive moms */
  feeOrePerKwh: number;
  lossPercent: number;
  fuel: Fuel;
  litersPerMil: number;
  fuelSekPerLiter: number;
};

export const defaultEvSettings: EvSettings = {
  kwhPerMil: 1.7,
  batteryKwh: 75,
  fromPercent: 20,
  toPercent: 80,
  chargerKw: 11,
  readyBy: "07:00",
  feeOrePerKwh: 85,
  lossPercent: 10,
  fuel: "bensin",
  litersPerMil: 0.65,
  fuelSekPerLiter: 17.5,
};

/** Rimliga startvärden när man byter bränsle */
export const fuelDefaults: Record<
  Fuel,
  { litersPerMil: number; fuelSekPerLiter: number }
> = {
  bensin: { litersPerMil: 0.65, fuelSekPerLiter: 17.5 },
  diesel: { litersPerMil: 0.55, fuelSekPerLiter: 18.2 },
};

const VAT = 1.25;

/** Vad en kWh kostar på riktigt: spot med moms plus skatt och nät. */
export function allInSekPerKwh(spotSekPerKwh: number, s: EvSettings) {
  return spotSekPerKwh * VAT + s.feeOrePerKwh / 100;
}

/** Kostnad per mil för elbilen om man laddar till ett visst spotpris. */
export function evSekPerMil(spotSekPerKwh: number, s: EvSettings) {
  return (
    allInSekPerKwh(spotSekPerKwh, s) * s.kwhPerMil * (1 + s.lossPercent / 100)
  );
}

/** Kostnad per mil för bensin- eller dieselbilen. */
export function fuelSekPerMil(s: EvSettings) {
  return s.litersPerMil * s.fuelSekPerLiter;
}

/** Hur mycket el som går in i laddboxen för en laddning, förlusten inräknad. */
export function chargeKwh(s: EvSettings) {
  const intoBattery = (s.batteryKwh * (s.toPercent - s.fromPercent)) / 100;
  return intoBattery * (1 + s.lossPercent / 100);
}

/** Antal kvartar en laddning tar, avrundat uppåt. Minst en. */
export function chargeQuarters(s: EvSettings) {
  const exact = (chargeKwh(s) / s.chargerKw) * 4;
  // Små avrundningsfel får inte ge en extra kvart (18,000000000000004 ska bli 18)
  return Math.max(1, Math.ceil(exact - 1e-9));
}

/** Nästa gång klockan är readyBy i svensk tid, räknat från now. */
export function nextDeadline(now: Date, readyBy: string): Date {
  const [hours, minutes] = readyBy.split(":").map(Number);
  const local = new TZDate(now, "Europe/Stockholm");
  const today = new TZDate(
    local.getFullYear(),
    local.getMonth(),
    local.getDate(),
    hours,
    minutes,
    "Europe/Stockholm",
  );
  const deadline = today.getTime() > now.getTime() ? today : addDays(today, 1);
  return new Date(deadline.getTime());
}

/**
 * Billigaste sammanhängande laddfönstret som börjar nu eller senare
 * och är klart före deadline. startIndex pekar in i hela prices.
 */
export function findChargeWindow(
  prices: Price[],
  { now, readyBy, quarters }: { now: Date; readyBy: string; quarters: number },
): PriceWindow | null {
  const deadline = nextDeadline(now, readyBy).getTime();
  const endOf = (p: Price) => new Date(p.time_end).getTime();

  const first = prices.findIndex((p) => endOf(p) > now.getTime());
  if (first < 0) return null;

  let last = first;
  while (last < prices.length && endOf(prices[last]) <= deadline) last++;

  const found = findCheapestWindow(prices.slice(first, last), quarters);
  return found && { ...found, startIndex: found.startIndex + first };
}

/** Hur många procent billigare elbilen är. Negativt om den är dyrare. */
export function percentCheaper(
  evSekPerMil: number,
  fuelSekPerMilValue: number,
) {
  return Math.round((1 - evSekPerMil / fuelSekPerMilValue) * 100);
}
