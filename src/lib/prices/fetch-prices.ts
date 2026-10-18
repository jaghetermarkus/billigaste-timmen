import { cacheLife } from "next/cache";
import { pricesSchema, type Prices } from "./schema";

export async function fetchPrices(date: string, area = "SE4"): Promise<Prices> {
  "use cache";
  cacheLife("hours");

  const url = `https://www.elprisetjustnu.se/api/v1/prices/${date}_${area}.json`;
  const res = await fetch(url);
  if (!res.ok) {
    throw new Error(`Failed to fetch prices (${res.status})`);
  }
  const data = await res.json();
  return pricesSchema.parse(data);
}
