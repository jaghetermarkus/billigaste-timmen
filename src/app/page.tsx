import { AreaPicker } from "@/components/area-picker";
import { CurrentPrice } from "@/components/current-price";
import { DayTabs, type Day } from "@/components/day-tabs";
import { MoodLine } from "@/components/mood-line";
import { PriceChart } from "@/components/price-chart";
import { areaCookie, parseArea, type Area } from "@/lib/domain/area";
import { findCheapestWindow } from "@/lib/domain/cheapest-window";
import { getDayStats } from "@/lib/domain/day-stats";
import { getMood } from "@/lib/domain/mood";
import { fetchAreaOverview } from "@/lib/prices/fetch-area-overview";
import { fetchPrices } from "@/lib/prices/fetch-prices";
import { fetchReferenceAverage } from "@/lib/prices/fetch-reference-average";
import type { Price } from "@/lib/prices/schema";
import { TZDate } from "@date-fns/tz";
import { addDays, format, subDays } from "date-fns";
import { cookies } from "next/headers";
import { connection } from "next/server";
import { Suspense } from "react";

type SearchParams = Promise<{ dag?: string; omrade?: string }>;

const ore = (sek: number) => `${(sek * 100).toFixed(1)} öre`;
const timeOf = (p: Price) => p.time_start.slice(11, 16);
const endTimeOf = (p: Price) => p.time_end.slice(11, 16);
const dateOf = (p: Price) => p.time_start.slice(0, 10);

export default function Home({ searchParams }: { searchParams: SearchParams }) {
  return (
    <main className="mx-auto w-full max-w-md px-5 pt-2 pb-24 lg:max-w-6xl lg:px-8 lg:pt-6">
      <Suspense fallback={<p>Hämtar priser…</p>}>
        <DayPrices searchParams={searchParams} />
      </Suspense>
    </main>
  );
}

async function DayPrices({ searchParams }: { searchParams: SearchParams }) {
  const { dag, omrade } = await searchParams;
  const day: Day = dag === "imorgon" || dag === "2dagar" ? dag : "idag";
  const cookieStore = await cookies();
  const area = parseArea(omrade ?? cookieStore.get(areaCookie)?.value);

  await connection();
  const now = new TZDate(new Date(), "Europe/Stockholm");
  const todayIso = format(now, "yyyy-MM-dd");
  const dayNames: Record<string, string> = {
    [format(subDays(now, 1), "yyyy-MM-dd")]: "I går",
    [todayIso]: "I dag",
    [format(addDays(now, 1), "yyyy-MM-dd")]: "I morgon",
  };

  const prices = await loadPrices(day, now, area);
  const tomorrowAvailable = await fetchPrices(
    format(addDays(now, 1), "yyyy/MM-dd"),
    area,
  ).then(
    () => true,
    () => false,
  );
  if (!prices) {
    return (
      <>
        <DayTabs day={day} area={area} />
        <p className="mt-6">
          {day === "imorgon"
            ? "Morgondagens priser publiceras runt kl 13. Titta in lite senare."
            : "Kunde inte hämta priserna just nu."}
        </p>
      </>
    );
  }

  const multiDay = day === "2dagar";
  const stats = getDayStats(prices);

  // Stämningen följer i dag när två dagar visas
  const moodPrices = multiDay
    ? prices.filter((p) => dateOf(p) === todayIso)
    : prices;
  const reference = await fetchReferenceAverage(
    format(now, "yyyy/MM-dd"),
    area,
  );
  const overview = await fetchAreaOverview(now, day === "imorgon");
  const moodAverage = getDayStats(moodPrices).average;
  const mood = getMood(moodAverage, reference);

  // Med två dagar letar vi bara bland kvartar som inte har passerat
  const first = multiDay
    ? prices.findIndex((p) => new Date(p.time_end).getTime() > now.getTime())
    : 0;
  const found = first >= 0 ? findCheapestWindow(prices.slice(first), 4) : null;
  const cheapest = found && { ...found, startIndex: found.startIndex + first };

  // "kl 03:00" för en dag, "i morgon kl 03:00" när två dagar visas
  const when = (p: Price) =>
    multiDay
      ? `${(dayNames[dateOf(p)] ?? dateOf(p)).toLowerCase()} kl ${timeOf(p)}`
      : `kl ${timeOf(p)}`;

  const cheapestLabel =
    day === "imorgon"
      ? "Morgondagens billigaste timme"
      : multiDay && cheapest
        ? `Billigaste timmen ${(dayNames[dateOf(prices[cheapest.startIndex])] ?? "").toLowerCase()}`
        : "Dagens billigaste timme";

  const statItems = [
    { label: "Lägst", value: stats.min.SEK_per_kWh, sub: when(stats.min) },
    { label: "Snitt", value: stats.average, sub: "öre/kWh" },
    { label: "Högst", value: stats.max.SEK_per_kWh, sub: when(stats.max) },
  ];

  return (
    <div data-mood={mood} data-page-mood={mood}>
      <div className="relative z-10 lg:grid lg:grid-cols-[minmax(0,1fr)_minmax(0,1.6fr)] lg:grid-rows-[auto_auto_auto_1fr] lg:items-start lg:gap-x-14">
        <div className="flex items-center justify-between lg:col-span-2 lg:mb-6">
          {/* <span className="glass rounded-full px-3 py-1.5 text-[13px] font-semibold tracking-wide">
            {area}
          </span> */}
          <AreaPicker area={area} day={day} overview={overview} />
          <DayTabs
            day={day}
            area={area}
            tomorrowAvailable={tomorrowAvailable}
          />
        </div>

        {/* <p className="mt-6 text-center text-[13px] text-muted-foreground first-letter:uppercase">
          {format(now, "EEEE d MMMM", { locale: sv })}
        </p> */}

        {reference !== null && (
          <div className="lg:col-start-1">
            <MoodLine
              mood={mood}
              dayAverage={moodAverage}
              referenceAverage={reference}
            />
          </div>
        )}

        {day !== "imorgon" && (
          <div className="mt-8 lg:col-start-1">
            <CurrentPrice
              prices={prices}
              min={stats.min.SEK_per_kWh}
              max={stats.max.SEK_per_kWh}
            />
          </div>
        )}

        <section className="glass mt-4 rounded-[22px] px-3.5 pt-3.5 pb-3 lg:col-start-2 lg:row-span-3 lg:row-start-2 lg:mt-0 lg:rounded-3xl lg:px-5 lg:pt-4 lg:pb-4">
          <PriceChart
            key={`${day}-${area}`}
            prices={prices}
            highlight={cheapest}
            dayNames={dayNames}
          />

          {cheapest && (
            <div className="mt-4 flex items-center gap-2 border-t border-foreground/10 px-0.5 pt-3 text-[13px]">
              <span
                aria-hidden="true"
                className="size-2 rounded-[2px] bg-(--scale-0) shadow-[0_0_8px_var(--scale-0)]"
              />
              <span className="text-muted-foreground">{cheapestLabel}</span>
              <span className="ml-auto font-serif text-[17px] font-semibold text-(--scale-0) tabular-nums">
                {timeOf(prices[cheapest.startIndex])}–
                {endTimeOf(prices[cheapest.startIndex + cheapest.length - 1])}
              </span>
            </div>
          )}
        </section>

        <dl className="glass mt-3 grid grid-cols-3 rounded-[18px] lg:col-start-1 lg:mt-8">
          {statItems.map((s) => (
            <div
              key={s.label}
              className="flex flex-col gap-0.5 border-l border-foreground/10 px-3.5 py-3 first:border-l-0"
            >
              <dt className="text-[10px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">
                {s.label}
              </dt>
              <dd className="text-[22px] font-light tabular-nums">
                {(s.value * 100).toFixed(1)}
              </dd>
              <dd className="text-[11px] text-muted-foreground">{s.sub}</dd>
            </div>
          ))}
        </dl>
      </div>
    </div>
  );
}

async function loadPrices(
  day: Day,
  now: Date,
  area: Area,
): Promise<Price[] | null> {
  const get = (date: Date) =>
    fetchPrices(format(date, "yyyy/MM-dd"), area).catch(() => null);

  if (day === "idag") return get(now);
  if (day === "imorgon") return get(addDays(now, 1));

  // 2 dagar: i dag + i morgon om morgondagen finns, annars i går + i dag
  const [today, tomorrow] = await Promise.all([get(now), get(addDays(now, 1))]);
  if (!today) return null;
  if (tomorrow) return [...today, ...tomorrow];
  const yesterday = await get(subDays(now, 1));
  return [...(yesterday ?? []), ...today];
}
