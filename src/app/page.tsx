import { fetchPrices } from "@/lib/prices/fetch-prices";
import { getDayStats } from "@/lib/domain/day-stats";
import { Suspense } from "react";
import { TZDate } from "@date-fns/tz";
import { connection } from "next/server";
import { format } from "date-fns";
import { PriceChart } from "@/components/price-chart";

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

    return (
      <div className="mt-4">
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
        <PriceChart prices={prices} />
        <ul className="font-mono text-sm">
          {prices.map((price) => (
            <li key={price.time_start}>
              {price.time_start.slice(11, 16)} -{" "}
              {(price.SEK_per_kWh * 100).toFixed(1)} öre/kWh
            </li>
          ))}
        </ul>
      </div>
    );
  }
}
