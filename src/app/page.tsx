import { fetchPrices } from "@/lib/prices/fetch-prices";

export default async function Home() {
  const prices = await fetchPrices(new Date());
  return (
    <main className="p-6">
      <h1 className="text-2xl font-semibold">Idag</h1>
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
