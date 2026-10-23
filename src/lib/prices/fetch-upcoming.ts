import { connection } from "next/server";
import { TZDate } from "@date-fns/tz";
import { addDays, format } from "date-fns";

import type { Area } from "@/lib/domain/area";
import { getDayStats } from "@/lib/domain/day-stats";
import { getMood } from "@/lib/domain/mood";
import { fetchPrices } from "./fetch-prices";
import { fetchReferenceAverage } from "./fetch-reference-average";

/** Dagens priser och morgondagens om de finns, plus dagens stämning. null om dagens saknas. */
export async function fetchUpcoming(area: Area) {
  await connection();
  const now = new TZDate(new Date(), "Europe/Stockholm");
  const get = (date: Date) =>
    fetchPrices(format(date, "yyyy/MM-dd"), area).catch(() => null);

  const [today, tomorrow] = await Promise.all([get(now), get(addDays(now, 1))]);
  if (!today) return null;

  const reference = await fetchReferenceAverage(
    format(now, "yyyy/MM-dd"),
    area,
  );
  return {
    prices: [...today, ...(tomorrow ?? [])],
    mood: getMood(getDayStats(today).average, reference),
  };
}
