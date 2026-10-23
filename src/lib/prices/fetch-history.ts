import { cacheLife } from "next/cache";
import { connection } from "next/server";
import { TZDate } from "@date-fns/tz";
import { format } from "date-fns";
import { z } from "zod";

import type { Area } from "@/lib/domain/area";
import {
  combinePoints,
  dayKeys,
  daysOfMonth,
  historyStart,
  monthKeys,
  oneYearEarlier,
  summarizeDay,
  type HistoryPoint,
  type HistoryRow,
} from "@/lib/domain/history";

export type Period = "dagar" | "manader";

/** Bara de två fält vi behöver ur varje kvart. */
const daySchema = z.array(
  z.object({ SEK_per_kWh: z.number(), time_start: z.string() }),
);

/** Ett dygns snitt och timprofil. Priserna för ett dygn ändras aldrig, så det cachas så länge som möjligt. */
async function fetchDay(date: string, area: Area): Promise<HistoryPoint> {
  "use cache: remote";
  cacheLife("max");

  const url = `https://www.elprisetjustnu.se/api/v1/prices/${date.slice(0, 4)}/${date.slice(5)}_${area}.json`;
  const res = await fetch(url);
  if (!res.ok)
    throw new Error(`Inga priser för ${date} i ${area} (${res.status})`);
  return summarizeDay(date, daySchema.parse(await res.json()));
}

/** En hel, avslutad månad. Saknas ett dygn kastas ett fel, så att en halv månad aldrig hamnar i cachen. */
async function fetchClosedMonth(
  month: string,
  area: Area,
): Promise<HistoryPoint | null> {
  "use cache: remote";
  cacheLife("max");

  const days = await inBatches(daysOfMonth(month, "9999-12-31"), (day) =>
    fetchDay(day, area),
  );
  return combinePoints(month, days);
}

/** Månaden vi är i, fram till i dag. Varje dygn är cachat, men själva månaden räknas om. */
async function fetchCurrentMonth(month: string, today: string, area: Area) {
  const days = await inBatches(daysOfMonth(month, today), (day) =>
    fetchDay(day, area).catch(() => null),
  );
  return combinePoints(
    month,
    days.filter((d) => d !== null),
  );
}

/** Kör högst sex hämtningar åt gången, så att vi inte skickar hundratals anrop samtidigt till API:t. */
async function inBatches<T, R>(
  items: T[],
  fn: (item: T) => Promise<R>,
  size = 6,
): Promise<R[]> {
  const results: R[] = [];
  for (let i = 0; i < items.length; i += size) {
    results.push(...(await Promise.all(items.slice(i, i + size).map(fn))));
  }
  return results;
}

/** Perioden och samma period året innan, som rader för grafen. null om inget gick att hämta. */
export async function fetchHistory(
  area: Area,
  period: Period,
): Promise<HistoryRow[] | null> {
  await connection();
  const now = new TZDate(new Date(), "Europe/Stockholm");
  const today = format(now, "yyyy-MM-dd");

  const getDay = (day: string) =>
    day < historyStart
      ? Promise.resolve(null)
      : fetchDay(day, area).catch(() => null);
  const getMonth = (month: string) =>
    month === today.slice(0, 7)
      ? fetchCurrentMonth(month, today, area)
      : fetchClosedMonth(month, area).catch(() => null);

  const keys = period === "dagar" ? dayKeys(now, 30) : monthKeys(now, 12);
  const get = period === "dagar" ? getDay : getMonth;

  const [points, previous] = await Promise.all([
    inBatches(keys, get),
    inBatches(keys.map(oneYearEarlier), get),
  ]);

  const rows = points.flatMap((point, i) =>
    point ? [{ point, previous: previous[i] }] : [],
  );
  return rows.length ? rows : null;
}
