import { fetchPrices } from "@/lib/prices/fetch-prices";
import { getDayStats } from "@/lib/domain/day-stats";

export default async function Home() {
  const prices = await fetchPrices(new Date());
  const stats = getDayStats(prices);
  const ore = (sek: number) => ` ${(sek * 100).toFixed(1)} öre`;

  return (
    <main className="p-6">
      <h1 className="text-2xl font-semibold">Idag</h1>
      <dl className="mt-4 grid grid-cols-3 gap-4">
        <div>
          <dt>Lägst</dt>
          <dd>
            {ore(stats.min.SEK_per_kWh)} kl {stats.min.time_start.slice(11, 16)}
          </dd>
        </div>
        <div>
          <dt>Snitt</dt>
          <dd>{ore(stats.average)}</dd>
        </div>
        <div>
          <dt>Högst</dt>
          <dd>
            {ore(stats.max.SEK_per_kWh)} kl {stats.max.time_start.slice(11, 16)}
          </dd>
        </div>
      </dl>
      <ul className="font-mono text-sm">
        {prices.map((price) => (
          <li key={price.time_start}>
            {price.time_start.slice(11, 16)} -{" "}
            {(price.SEK_per_kWh * 100).toFixed(1)} öre/kWh
          </li>
        ))}
      </ul>
    </main>
  );
}
