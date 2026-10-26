import { cacheLife } from "next/cache";
import { connection } from "next/server";
import { TZDate } from "@date-fns/tz";
import { addDays, startOfDay } from "date-fns";

import { areas, type Area } from "@/lib/domain/area";
import {
  combineSeries,
  dropUnsettledConsumption,
  sumAreas,
  type ProductionPoint,
} from "@/lib/domain/production";
import {
  parseConsumption,
  parseGeneration,
} from "@/lib/production/parse-entsoe";

/** ENTSO-E:s koder för elområdena (EIC) */
const areaCodes: Record<Area, string> = {
  SE1: "10Y1001A1001A44P",
  SE2: "10Y1001A1001A45N",
  SE3: "10Y1001A1001A46L",
  SE4: "10Y1001A1001A47J",
};

export type ProductionDay = {
  byArea: Record<Area, ProductionPoint[]>;
  /** Summan av alla fyra områdena */
  sweden: ProductionPoint[];
};

/**
 * "202610252300", formatet ENTSO-E vill ha, i UTC.
 * new Date(...) behövs eftersom en TZDate skriver ut sin egen tidszon i toISOString().
 */
const entsoeTime = (date: Date) =>
  new Date(date.getTime()).toISOString().slice(0, 16).replace(/[-T:]/g, "");

/**
 * Ett anrop till ENTSO-E. Svaret cachas i 15 minuter på Vercel, så det blir högst
 * åtta anrop per kvart oavsett hur många som besöker sidan.
 * Vi cachar XML-texten, eftersom en sträng alltid går att spara i cachen.
 */
async function fetchEntsoe(query: string): Promise<string> {
  "use cache: remote";
  cacheLife({ stale: 300, revalidate: 900, expire: 3600 });

  const token = process.env.ENTSOE_TOKEN;
  if (!token) throw new Error("ENTSOE_TOKEN saknas");

  const res = await fetch(
    `https://web-api.tp.entsoe.eu/api?securityToken=${token}&${query}`,
    {
      headers: { "User-Agent": "billigastetimmen.se" },
    },
  );
  const text = await res.text();
  // "Ingen data" kan komma både som 200 och 400. Tolkningen gör då om svaret till en tom lista.
  if (res.ok || text.includes("No matching data found")) return text;
  // Annars står orsaken i <text> i XML-svaret, eller någonstans i en HTML-sida. Frågan loggas utan nyckeln.
  const reason =
    /<text>([\s\S]*?)<\/text>/.exec(text)?.[1] ??
    text
      .replace(/<(style|script)[\s\S]*?<\/\1>/g, "")
      .replace(/<[^>]+>/g, " ")
      .replace(/\s+/g, " ")
      .trim()
      .slice(0, 300);
  throw new Error(`ENTSO-E svarade ${res.status} på ${query}: ${reason}`);
}

async function fetchArea(
  area: Area,
  start: Date,
  end: Date,
): Promise<ProductionPoint[]> {
  const period = `periodStart=${entsoeTime(start)}&periodEnd=${entsoeTime(end)}`;
  // Efter varandra: ENTSO-E:s server avvisar ibland anrop som kommer samtidigt
  const generation = await fetchEntsoe(
    `documentType=A75&processType=A16&in_Domain=${areaCodes[area]}&${period}`,
  );
  const consumption = await fetchEntsoe(
    `documentType=A65&processType=A16&outBiddingZone_Domain=${areaCodes[area]}&${period}`,
  );
  return dropUnsettledConsumption(
    combineSeries(parseGeneration(generation), parseConsumption(consumption)),
  );
}

/** Dagens produktion, från midnatt svensk tid. null om något gick fel. */
export async function fetchProductionToday(): Promise<ProductionDay | null> {
  await connection();
  const start = startOfDay(new TZDate(new Date(), "Europe/Stockholm"));
  const end = addDays(start, 1);

  try {
    // Ett område i taget, så att bara ett anrop pågår åt gången
    const lists: ProductionPoint[][] = [];
    for (const area of areas) lists.push(await fetchArea(area, start, end));
    const byArea = Object.fromEntries(
      areas.map((area, i) => [area, lists[i]]),
    ) as Record<Area, ProductionPoint[]>;
    return { byArea, sweden: sumAreas(byArea) };
  } catch (error) {
    console.error("Kunde inte hämta produktionen", error);
    return null;
  }
}
