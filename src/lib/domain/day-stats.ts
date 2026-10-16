import type { Price } from "../prices/schema";

export type DayStats = {
  min: Price;
  max: Price;
  average: number;
};

export function getDayStats(prices: Price[]): DayStats {
  if (prices.length === 0) {
    throw new Error("No prices to calculate stats from");
  }

  let min = prices[0];
  let max = prices[0];
  let sum = 0;

  for (const price of prices) {
    if (price.SEK_per_kWh < min.SEK_per_kWh) {
      min = price;
    }
    if (price.SEK_per_kWh > max.SEK_per_kWh) {
      max = price;
    }
    sum += price.SEK_per_kWh;
  }

  return { min, max, average: sum / prices.length };
}
