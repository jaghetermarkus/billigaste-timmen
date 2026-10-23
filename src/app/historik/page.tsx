import { Suspense } from "react";

import { AreaLink } from "@/components/area-link";
import {
  DayProfile,
  HistoryChart,
  type HistoryBar,
} from "@/components/history-chart";
import { areaFromRequest } from "@/lib/area-from-request";
import type { Area } from "@/lib/domain/area";
import {
  historyLabel,
  hourRange,
  summarizeHistory,
} from "@/lib/domain/history";
import { fetchHistory, type Period } from "@/lib/prices/fetch-history";
import { connection } from "next/server";
import { TZDate } from "@date-fns/tz";
import { AreaPicker } from "@/components/area-picker";
import { fetchAreaOverview } from "@/lib/prices/fetch-area-overview";

export const metadata = { title: "Historik · Billigaste timmen" };

type SearchParams = Promise<{ omrade?: string; visa?: string }>;

export default function HistoryPage({
  searchParams,
}: {
  searchParams: SearchParams;
}) {
  return (
    <main className="mx-auto w-full max-w-md px-5 pt-2 lg:max-w-2xl lg:px-8 lg:pt-6">
      <Suspense fallback={<div className="h-[640px]" aria-hidden="true" />}>
        <HistorySection searchParams={searchParams} />
      </Suspense>
    </main>
  );
}

async function HistorySection({
  searchParams,
}: {
  searchParams: SearchParams;
}) {
  const { omrade, visa } = await searchParams;
  const period: Period = visa === "manader" ? "manader" : "dagar";
  const months = period === "manader";
  const area = await areaFromRequest(omrade);
  await connection();
  const overview = await fetchAreaOverview(
    new TZDate(new Date(), "Europe/Stockholm"),
    false,
  );

  return (
    <>
      <div className="flex items-center justify-between gap-3">
        <AreaPicker area={area} overview={overview} />
        <PeriodSwitch months={months} />
      </div>

      <h1 className="mt-4 font-serif text-[34px] leading-tight font-semibold">
        Historik
      </h1>
      <p className="text-muted-foreground text-[13px]">
        Spotpris utan moms och avgifter.
      </p>

      <Suspense
        key={`${period}-${area}`}
        fallback={<div className="mt-6 h-[560px]" aria-hidden="true" />}
      >
        <HistoryContent area={area} period={period} />
      </Suspense>
    </>
  );
}

function PeriodSwitch({ months }: { months: boolean }) {
  const options = [
    { href: "/historik", label: "30 dagar", active: !months },
    { href: "/historik?visa=manader", label: "12 månader", active: months },
  ];
  return (
    <nav
      aria-label="Period"
      className="bg-foreground/5 border-foreground/10 flex rounded-full border p-0.5"
    >
      {options.map((o) => (
        <AreaLink
          key={o.href}
          href={o.href}
          aria-current={o.active ? "page" : undefined}
          className={`flex min-h-8 items-center rounded-full px-3 text-[13px] font-semibold ${
            o.active ? "bg-foreground text-background" : "text-muted-foreground"
          }`}
        >
          {o.label}
        </AreaLink>
      ))}
    </nav>
  );
}

async function HistoryContent({
  area,
  period,
}: {
  area: Area;
  period: Period;
}) {
  const rows = await fetchHistory(area, period);
  if (!rows)
    return <p className="mt-6">Kunde inte hämta historiken just nu.</p>;

  const months = period === "manader";
  const s = summarizeHistory(rows);
  const ore = (v: number, decimals: number) =>
    v.toLocaleString("sv-SE", {
      maximumFractionDigits: decimals,
      minimumFractionDigits: decimals,
    });
  // Dagar: datum på fyra staplar. Månader: månadsnamn på fem.
  const tickAt = months
    ? [0, 3, 6, 9, rows.length - 1]
    : [0, 10, 20, rows.length - 1];

  const bars: HistoryBar[] = rows.map(({ point, previous }, i) => ({
    label: historyLabel(point.key, months),
    tick: tickAt.includes(i)
      ? months
        ? historyLabel(point.key)
        : historyLabel(point.key).split(" ").slice(1).join(" ")
      : undefined,
    value: point.average,
    previous: previous?.average ?? null,
  }));

  const stats = [
    {
      label: "Billigast",
      value: ore(s.cheapest.average, months ? 0 : 1),
      sub: historyLabel(s.cheapest.key),
      color: "text-(--scale-0)",
    },
    {
      label: "Dyrast",
      value: ore(s.dearest.average, months ? 0 : 1),
      sub: historyLabel(s.dearest.key),
      color: "text-(--scale-3)",
    },
    {
      label: "Under 1 kr",
      value: `${s.underOneKrona} av ${rows.length}`,
      sub: months ? "månader" : "dagar",
      color: "",
    },
  ];

  return (
    <div className="mt-5 flex flex-col gap-3">
      <div>
        <p className="text-muted-foreground text-[11px] font-semibold tracking-[0.14em] uppercase">
          {months ? "Senaste 12 månaderna" : "Senaste 30 dagarna"}
        </p>
        <p className="flex items-baseline gap-1.5">
          <span className="text-[60px] leading-none font-extralight tabular-nums">
            {ore(s.average, 0)}
          </span>
          <span className="text-muted-foreground text-[15px]">
            öre/kWh i snitt
          </span>
        </p>
        {s.change !== null && (
          <p className="mt-2 flex items-center gap-2 text-[13px]">
            <span
              className={`rounded-full px-2.5 py-0.5 font-bold ${
                s.change > 0
                  ? "bg-(--scale-3)/15 text-(--scale-3)"
                  : "bg-(--scale-0)/15 text-(--scale-0)"
              }`}
            >
              {s.change > 0 ? "+" : "−"}
              {Math.abs(s.change)} %
            </span>
            <span className="text-muted-foreground">
              {months ? "mot de 12 månaderna innan" : "mot samma period i fjol"}
            </span>
          </p>
        )}
      </div>

      <div className="glass rounded-[22px] p-3">
        <HistoryChart
          bars={bars}
          average={s.average}
          showPrevious={months}
          totalLabel={months ? "Snitt 12 månader" : "Snitt 30 dagar"}
        />
      </div>

      <dl className="glass grid grid-cols-3 rounded-[18px]">
        {stats.map((stat, i) => (
          <div
            key={stat.label}
            className={`flex flex-col gap-0.5 px-3.5 py-3 ${i > 0 ? "border-foreground/10 border-l" : ""}`}
          >
            <dt className="text-muted-foreground text-[10px] font-semibold tracking-[0.14em] uppercase">
              {stat.label}
            </dt>
            <dd className={`text-xl font-light tabular-nums ${stat.color}`}>
              {stat.value}
            </dd>
            <dd className="text-muted-foreground text-xs">{stat.sub}</dd>
          </div>
        ))}
      </dl>

      <section
        className="glass flex flex-col gap-2 rounded-[22px] px-4 pt-3.5 pb-3"
        aria-labelledby="snittdygn"
      >
        <div className="flex items-baseline justify-between">
          <h2
            id="snittdygn"
            className="text-muted-foreground text-[11px] font-semibold tracking-[0.14em] uppercase"
          >
            Ett snittdygn
          </h2>
          <span className="text-muted-foreground text-[13px]">
            {months ? "senaste 12 mån" : "senaste 30 dagarna"}
          </span>
        </div>
        <DayProfile profile={s.profile} />
        <div
          className="text-muted-foreground flex justify-between text-[11px] tabular-nums"
          aria-hidden="true"
        >
          <span>00</span>
          <span>06</span>
          <span>12</span>
          <span>18</span>
          <span>24</span>
        </div>
        <div className="border-foreground/10 flex justify-between gap-2.5 border-t pt-2.5 text-[13px]">
          <span className="text-muted-foreground">
            Billigast i snitt{" "}
            <span className="font-serif text-[17px] font-semibold text-(--scale-0)">
              kl {hourRange(s.cheapestHour)}
            </span>
          </span>
          <span className="text-muted-foreground">
            Dyrast{" "}
            <span className="font-serif text-[17px] font-semibold text-(--scale-3)">
              kl {hourRange(s.dearestHour)}
            </span>
          </span>
        </div>
      </section>
    </div>
  );
}
