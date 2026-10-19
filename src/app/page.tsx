import { fetchPrices } from "@/lib/prices/fetch-prices";
import { getDayStats } from "@/lib/domain/day-stats";
import { Suspense } from "react";
import { TZDate } from "@date-fns/tz";
import { connection } from "next/server";
import { format } from "date-fns";
import { PriceChart } from "@/components/price-chart";
import { findCheapestWindow } from "@/lib/domain/cheapest-window";
import { getMood } from "@/lib/domain/mood";
import { fetchReferenceAverage } from "@/lib/prices/fetch-reference-average";

export default function Home() {
  return (
    <main className="p-6">
      <h1 className="text-2xl font-semibold">Idag</h1>
      <Suspense fallback={<p>Laddar priser...</p>}>
        <TodayPrices />
      </Suspense>
    </main>
  );

  async function TodayPrices() {
    await connection();
    const today = format(
      new TZDate(new Date(), "Europe/Stockholm"),
      "yyyy/MM-dd",
    );
    const prices = await fetchPrices(today);
    const stats = getDayStats(prices);
    const ore = (sek: number) => ` ${(sek * 100).toFixed(1)} öre`;
    const cheapest = findCheapestWindow(prices, 4);
    const reference = await fetchReferenceAverage(today);
    const mood = getMood(stats.average, reference);

    return (
      <div data-mood={mood}>
        <div className="mood-bg fixed inset-0 z-0" aria-hidden="true" />
        <div className="mt-4 relative z-10">
          <h2 className="text-lg font-semibold">Priser</h2>
          <dl className="mt-4 grid grid-cols-3 gap-4">
            <div>
              <dt>Lägst</dt>
              <dd>
                {ore(stats.min.SEK_per_kWh)} kl{" "}
                {stats.min.time_start.slice(11, 16)}
              </dd>
            </div>
            <div>
              <dt>Snitt</dt>
              <dd>{ore(stats.average)}</dd>
            </div>
            <div>
              <dt>Högst</dt>
              <dd>
                {ore(stats.max.SEK_per_kWh)} kl{" "}
                {stats.max.time_start.slice(11, 16)}
              </dd>
            </div>
          </dl>
          {cheapest && (
            <p className="mt-4">
              Billigaste timmen: kl{" "}
              {prices[cheapest.startIndex].time_start.slice(11, 16)} -{" "}
              {prices[cheapest.startIndex + cheapest.length - 1].time_end.slice(
                11,
                16,
              )}{" "}
              snitt {ore(cheapest.averagePrice)}
            </p>
          )}
          {cheapest && (
            <PriceChart
              prices={prices}
              highlight={{
                startIndex: cheapest.startIndex,
                length: cheapest.length,
              }}
            />
          )}

          {/* <ul className="font-mono text-sm">
            {prices.map((price) => (
              <li key={price.time_start}>
                {price.time_start.slice(11, 16)} -{" "}
                {(price.SEK_per_kWh * 100).toFixed(1)} öre/kWh
              </li>
            ))}
          </ul> */}
        </div>
      </div>
    );
  }
}
