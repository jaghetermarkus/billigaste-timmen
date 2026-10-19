import type { Price } from "../prices/schema";

export type PriceWindow = {
  startIndex: number;
  length: number;
  average: number;
};

export function findCheapestWindow(
  prices: Price[],
  length: number,
): PriceWindow | null {
  if (length <= 0 || prices.length < length) return null;

  let sum = 0;
  for (let i = 0; i < length; i++) sum += prices[i].SEK_per_kWh;

  let bestSum = sum;
  let bestStart = 0;

  for (let i = length; i < prices.length; i++) {
    sum += prices[i].SEK_per_kWh - prices[i - length].SEK_per_kWh;
    if (sum < bestSum) {
      bestSum = sum;
      bestStart = i - length + 1;
    }
  }

  return { startIndex: bestStart, length, average: bestSum / length };
}
