import {
  addDays,
  addMonths,
  format,
  getDaysInMonth,
  parseISO,
  subYears,
} from "date-fns";

import type { Price } from "@/lib/prices/schema";

/** Ett dygn ("2026-10-23") eller en månad ("2026-10") i öre/kWh. */
export type HistoryPoint = {
  key: string;
  average: number;
  /** Snittet för varje timme 00–23. null om timmen saknas, t.ex. när klockan ställs fram. */
  hourly: (number | null)[];
};

/** En stapel i grafen: perioden och samma period ett år tidigare, om den finns. */
export type HistoryRow = { point: HistoryPoint; previous: HistoryPoint | null };

/** Elpriset just nu har priser från och med den här dagen. */
export const historyStart = "2022-11-01";

const weekdays = ["sön", "mån", "tis", "ons", "tor", "fre", "lör"];
const months = [
  "jan",
  "feb",
  "mar",
  "apr",
  "maj",
  "jun",
  "jul",
  "aug",
  "sep",
  "okt",
  "nov",
  "dec",
];

const mean = (values: number[]) =>
  values.reduce((sum, v) => sum + v, 0) / values.length;

/** Gör om ett dygns priser till snitt och timprofil i öre. */
export function summarizeDay(
  date: string,
  prices: Pick<Price, "SEK_per_kWh" | "time_start">[],
): HistoryPoint {
  const hours: number[][] = Array.from({ length: 24 }, () => []);
  for (const p of prices) {
    // time_start är svensk tid, "2026-10-23T14:15:00+02:00", så timmen står på plats 11–12
    hours[Number(p.time_start.slice(11, 13))].push(p.SEK_per_kWh * 100);
  }
  return {
    key: date,
    average: mean(prices.map((p) => p.SEK_per_kWh * 100)),
    hourly: hours.map((h) => (h.length ? mean(h) : null)),
  };
}

/** Slår ihop flera dygn till en månad. null om det inte finns några. */
export function combinePoints(
  key: string,
  points: HistoryPoint[],
): HistoryPoint | null {
  if (points.length === 0) return null;
  return {
    key,
    average: mean(points.map((p) => p.average)),
    hourly: Array.from({ length: 24 }, (_, h) => {
      const values = points.flatMap((p) =>
        p.hourly[h] === null ? [] : [p.hourly[h]],
      );
      return values.length ? mean(values) : null;
    }),
  };
}

/** De senaste `count` dygnen till och med i dag, äldst först. */
export function dayKeys(today: Date, count: number) {
  return Array.from({ length: count }, (_, i) =>
    format(addDays(today, i - count + 1), "yyyy-MM-dd"),
  );
}

/** De senaste `count` månaderna till och med denna, äldst först. */
export function monthKeys(today: Date, count: number) {
  return Array.from({ length: count }, (_, i) =>
    format(addMonths(today, i - count + 1), "yyyy-MM"),
  );
}

/** Alla dygn i en månad, men inte efter `lastDay`. */
export function daysOfMonth(month: string, lastDay: string) {
  const first = parseISO(`${month}-01`);
  return Array.from({ length: getDaysInMonth(first) }, (_, i) =>
    format(addDays(first, i), "yyyy-MM-dd"),
  ).filter((day) => day >= historyStart && day <= lastDay);
}

/** "2026-10-23" blir "2025-10-23" och "2026-10" blir "2025-10". */
export function oneYearEarlier(key: string) {
  const isMonth = key.length === 7;
  const date = subYears(parseISO(isMonth ? `${key}-01` : key), 1);
  return format(date, isMonth ? "yyyy-MM" : "yyyy-MM-dd");
}

/** "2026-10-23" blir "fre 23 okt", "2026-10" blir "okt" eller "okt 2026". */
export function historyLabel(key: string, withYear = false) {
  const date = parseISO(key.length === 7 ? `${key}-01` : key);
  if (key.length === 7)
    return withYear
      ? `${months[date.getMonth()]} ${date.getFullYear()}`
      : months[date.getMonth()];
  return `${weekdays[date.getDay()]} ${date.getDate()} ${months[date.getMonth()]}`;
}

/** Allt som visas på Historik, räknat ur raderna. */
export function summarizeHistory(rows: HistoryRow[]) {
  const points = rows.map((r) => r.point);
  const previous = rows.flatMap((r) => (r.previous ? [r.previous] : []));
  const average = mean(points.map((p) => p.average));
  const previousAverage = previous.length
    ? mean(previous.map((p) => p.average))
    : null;

  const byPrice = [...points].sort((a, b) => a.average - b.average);
  const profile = combinePoints("profil", points)!.hourly.map(
    (v) => v ?? average,
  );
  const cheapestHour = profile.indexOf(Math.min(...profile));
  const dearestHour = profile.indexOf(Math.max(...profile));

  return {
    average,
    /** Procent mot året innan, avrundat. null om året innan saknas. */
    change:
      previousAverage && previousAverage > 0
        ? Math.round((average / previousAverage - 1) * 100)
        : null,
    cheapest: byPrice[0],
    dearest: byPrice[byPrice.length - 1],
    underOneKrona: points.filter((p) => p.average < 100).length,
    profile,
    cheapestHour,
    dearestHour,
  };
}

/** 3 blir "03–04". */
export function hourRange(hour: number) {
  const pad = (h: number) => String(h).padStart(2, "0");
  return `${pad(hour)}–${pad(hour + 1)}`;
}
