import { TZDate } from "@date-fns/tz";
import { addDays, format, subDays } from "date-fns";
import { connection } from "next/server";
import { Suspense } from "react";

import { CurrentPrice } from "@/components/current-price";
import { DayTabs, type Day } from "@/components/day-tabs";
import { PriceChart } from "@/components/price-chart";
import { findCheapestWindow } from "@/lib/domain/cheapest-window";
import { getDayStats } from "@/lib/domain/day-stats";
import { getMood } from "@/lib/domain/mood";
import { fetchPrices } from "@/lib/prices/fetch-prices";
import { fetchReferenceAverage } from "@/lib/prices/fetch-reference-average";
import type { Price } from "@/lib/prices/schema";

type SearchParams = Promise<{ dag?: string }>;

const ore = (sek: number) => `${(sek * 100).toFixed(1)} öre`;
const timeOf = (p: Price) => p.time_start.slice(11, 16);
const endTimeOf = (p: Price) => p.time_end.slice(11, 16);
const dateOf = (p: Price) => p.time_start.slice(0, 10);

export default function Home({ searchParams }: { searchParams: SearchParams }) {
  return (
    <main className="p-6">
      <Suspense fallback={<p>Hämtar priser…</p>}>
        <DayPrices searchParams={searchParams} />
      </Suspense>
    </main>
  );
}

async function DayPrices({ searchParams }: { searchParams: SearchParams }) {
  const { dag } = await searchParams;
  const day: Day = dag === "imorgon" || dag === "2dagar" ? dag : "idag";

  await connection();
  const now = new TZDate(new Date(), "Europe/Stockholm");
  const todayIso = format(now, "yyyy-MM-dd");
  const dayNames: Record<string, string> = {
    [format(subDays(now, 1), "yyyy-MM-dd")]: "I går",
    [todayIso]: "I dag",
    [format(addDays(now, 1), "yyyy-MM-dd")]: "I morgon",
  };

  const prices = await loadPrices(day, now);
  if (!prices) {
    return (
      <>
        <DayTabs day={day} />
        <p className="mt-6">
          {day === "imorgon"
            ? "Morgondagens priser publiceras runt kl 13. Titta in lite senare."
            : "Kunde inte hämta priserna just nu."}
        </p>
      </>
    );
  }

  const multiDay = day === "2dagar";
  const stats = getDayStats(prices);

  // Stämningen följer i dag när två dagar visas
  const moodPrices = multiDay
    ? prices.filter((p) => dateOf(p) === todayIso)
    : prices;
  const reference = await fetchReferenceAverage(format(now, "yyyy/MM-dd"));
  const mood = getMood(getDayStats(moodPrices).average, reference);

  // Med två dagar letar vi bara bland kvartar som inte har passerat
  const first = multiDay
    ? prices.findIndex((p) => new Date(p.time_end).getTime() > now.getTime())
    : 0;
  const found = first >= 0 ? findCheapestWindow(prices.slice(first), 4) : null;
  const cheapest = found && { ...found, startIndex: found.startIndex + first };

  // "kl 03:00" för en dag, "i morgon kl 03:00" när två dagar visas
  const when = (p: Price) =>
    multiDay
      ? `${(dayNames[dateOf(p)] ?? dateOf(p)).toLowerCase()} kl ${timeOf(p)}`
      : `kl ${timeOf(p)}`;

  return (
    <div data-mood={mood}>
      <div className="mood-bg fixed inset-0 z-0" aria-hidden="true" />

      <div className="relative z-10">
        <DayTabs day={day} />

        {day !== "imorgon" && (
          <div className="mt-6">
            <CurrentPrice prices={prices} />
          </div>
        )}

        <dl className="mt-6 grid grid-cols-3 gap-4">
          <div>
            <dt>Lägst</dt>
            <dd>
              {ore(stats.min.SEK_per_kWh)} {when(stats.min)}
            </dd>
          </div>
          <div>
            <dt>Snitt</dt>
            <dd>{ore(stats.average)}</dd>
          </div>
          <div>
            <dt>Högst</dt>
            <dd>
              {ore(stats.max.SEK_per_kWh)} {when(stats.max)}
            </dd>
          </div>
        </dl>

        {cheapest && (
          <p className="mt-6">
            Billigaste timmen: {when(prices[cheapest.startIndex])}–
            {endTimeOf(prices[cheapest.startIndex + cheapest.length - 1])},
            snitt {ore(cheapest.average)}
          </p>
        )}

        <PriceChart prices={prices} highlight={cheapest} dayNames={dayNames} />
      </div>
    </div>
  );
}

async function loadPrices(day: Day, now: Date): Promise<Price[] | null> {
  const get = (date: Date) =>
    fetchPrices(format(date, "yyyy/MM-dd")).catch(() => null);

  if (day === "idag") return get(now);
  if (day === "imorgon") return get(addDays(now, 1));

  // 2 dagar: i dag + i morgon om morgondagen finns, annars i går + i dag
  const [today, tomorrow] = await Promise.all([get(now), get(addDays(now, 1))]);
  if (!today) return null;
  if (tomorrow) return [...today, ...tomorrow];
  const yesterday = await get(subDays(now, 1));
  return [...(yesterday ?? []), ...today];
}
