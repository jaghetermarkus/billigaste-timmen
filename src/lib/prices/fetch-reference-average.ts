import { format, parse, subDays } from "date-fns";
import { cacheLife } from "next/cache";
import { fetchPrices } from "./fetch-prices";
import type { Area } from "../domain/area";

export async function fetchReferenceAverage(
  today: string,
  area: Area,
): Promise<number | null> {
  "use cache: remote";
  cacheLife("days");

  const base = parse(today, "yyyy/MM-dd", new Date());
  const dates = Array.from({ length: 30 }, (_, i) =>
    format(subDays(base, i + 1), "yyyy/MM-dd"),
  );

  const results = await Promise.allSettled(
    dates.map((date) => fetchPrices(date, area)),
  );
  const values = results.flatMap((r) =>
    r.status === "fulfilled" ? r.value.map((p) => p.SEK_per_kWh) : [],
  );

  if (values.length === 0) return null;
  return values.reduce((sum, v) => sum + v, 0) / values.length;
}
