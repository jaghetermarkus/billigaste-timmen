import { areas, type Area } from "@/lib/domain/area";
import { findPriceAt } from "@/lib/domain/current-price";
import { getDayStats } from "@/lib/domain/day-stats";
import { getMood, type Mood } from "@/lib/domain/mood";
import { addDays, format } from "date-fns";
import { fetchPrices } from "./fetch-prices";
import { fetchReferenceAverage } from "./fetch-reference-average";

export type AreaOverview = {
  area: Area;
  price: number | null; // SEK/kWh just nu
  mood: Mood | null;
};

export async function fetchAreaOverview(
  now: Date,
  forTomorrow: boolean,
): Promise<AreaOverview[]> {
  const date = format(forTomorrow ? addDays(now, 1) : now, "yyyy/MM-dd");
  const referenceDate = format(now, "yyyy/MM-dd");

  return Promise.all(
    areas.map(async (area) => {
      try {
        const [prices, reference] = await Promise.all([
          fetchPrices(date, area),
          fetchReferenceAverage(referenceDate, area),
        ]);
        const average = getDayStats(prices).average;
        const price = forTomorrow
          ? average
          : (findPriceAt(prices, now)?.SEK_per_kWh ?? null);
        return { area, price, mood: getMood(average, reference) };
      } catch {
        return { area, price: null, mood: null };
      }
    }),
  );
}
