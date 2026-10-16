import { TZDate } from "@date-fns/tz";
import { format } from "date-fns";
import { pricesSchema, type Prices } from "./schema";

export async function fetchPrices(date: Date, area = "SE4"): Promise<Prices> {
  const day = new TZDate(date, "Europe/Stockholm");
  const url = `https://www.elprisetjustnu.se/api/v1/prices/${format(day, "yyyy/MM-dd")}_${area}.json`;
  const res = await fetch(url, { next: { revalidate: 900 } });
  if (!res.ok) {
    throw new Error(`Failed to fetch prices (${res.status})`);
  }
  const data = await res.json();
  return pricesSchema.parse(data);
}
