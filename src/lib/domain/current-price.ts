import type { Price } from "../prices/schema";

export function findPriceAt(prices: Price[], time: Date): Price | undefined {
  const t = time.getTime();
  return prices.find(
    (p) =>
      new Date(p.time_start).getTime() <= t &&
      t < new Date(p.time_end).getTime(),
  );
}
