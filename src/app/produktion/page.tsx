import { Suspense } from "react";
import { TZDate } from "@date-fns/tz";
import { format } from "date-fns";

import { ChartColumn, Map as MapIcon } from "lucide-react";

import { AreaLink } from "@/components/area-link";
import { ProductionChart } from "@/components/production-chart";
import { ProductionMap } from "@/components/production-map";
import { ProductionMix } from "@/components/production-mix";
import { areaCities, areas, type Area } from "@/lib/domain/area";
import {
  energyNames,
  latestPoint,
  pointsAt,
  roundPercents,
  summarizePoint,
} from "@/lib/domain/production";
import { fetchProductionToday } from "@/lib/production/fetch-production";

export const metadata = {
  title: "Elproduktion just nu",
  description:
    "Hur mycket el Sverige producerar just nu, per kraftslag och elområde.",
};

type SearchParams = Promise<{ visa?: string; vy?: string }>;

export default function ProductionPage({
  searchParams,
}: {
  searchParams: SearchParams;
}) {
  return (
    <main className="mx-auto w-full max-w-md px-5 pt-2 lg:max-w-2xl lg:px-8 lg:pt-6">
      <Suspense fallback={<div className="h-[640px]" aria-hidden="true" />}>
        <ProductionSection searchParams={searchParams} />
      </Suspense>
    </main>
  );
}

const mw = (v: number) => Math.round(v).toLocaleString("sv-SE");

async function ProductionSection({
  searchParams,
}: {
  searchParams: SearchParams;
}) {
  const { visa, vy } = await searchParams;
  // ?visa=SE3 visar ett område. Utan visa (eller med något okänt) visas hela Sverige.
  const selected = areas.find((a) => a === visa) ?? null;
  const showMap = vy === "karta";

  const day = await fetchProductionToday();

  return (
    <>
      <ViewSwitch selected={selected} showMap={showMap} />
      {showMap ? (
        <MapView day={day} selected={selected} />
      ) : (
        <OverviewView day={day} selected={selected} />
      )}

      <p className="text-muted-foreground mt-3 px-1 text-[11px]">
        Källa: ENTSO-E Transparency Platform. Siffrorna bygger delvis på
        kraftbolagens planer och kan justeras i efterhand.
      </p>
    </>
  );
}

type Day = Awaited<ReturnType<typeof fetchProductionToday>>;

const clock = (time: number) =>
  format(new TZDate(time, "Europe/Stockholm"), "HH:mm");

function OverviewView({ day, selected }: { day: Day; selected: Area | null }) {
  const points = day ? (selected ? day.byArea[selected] : day.sweden) : [];
  const latest = latestPoint(points);

  return (
    <>
      <div className="mt-4 flex flex-col gap-0.5">
        <h1 className="font-serif text-[34px] leading-tight font-semibold">
          Produktion
        </h1>
        <p className="text-muted-foreground text-[13px]">
          {selected ? `${selected} · ${areaCities[selected]}` : "Hela Sverige"}
          {latest && ` · kl ${clock(latest.time)}`} · uppdateras var 15:e minut
        </p>
      </div>

      {day && latest ? (
        <>
          <ProductionNow point={latest} selected={selected} />
          <section
            className="glass mt-3 flex flex-col gap-1.5 rounded-[22px] p-3"
            aria-labelledby="idag"
          >
            <div className="flex items-baseline justify-between px-1">
              <h2
                id="idag"
                className="text-muted-foreground text-[11px] font-semibold tracking-[0.14em] uppercase"
              >
                I dag
              </h2>
              <span className="text-muted-foreground flex items-center gap-1.5 text-xs">
                <span
                  className="w-[18px] border-t-[1.5px] border-dashed border-current opacity-60"
                  aria-hidden="true"
                />
                förbrukning
              </span>
            </div>
            <ProductionChart
              key={selected ?? "SE"}
              points={points}
              dayStart={day.start}
              dayEnd={day.end}
            />
          </section>
        </>
      ) : (
        <p className="mt-6">Kunde inte hämta produktionen just nu.</p>
      )}
    </>
  );
}

function MapView({ day, selected }: { day: Day; selected: Area | null }) {
  // Kartan visar samma kvart i alla områden: den senaste där hela Sverige har pålitliga siffror
  const sweden = day ? latestPoint(day.sweden) : null;
  const now = day && sweden ? pointsAt(day.byArea, sweden.time) : null;

  return (
    <>
      <h1 className="mt-4 font-serif text-[34px] leading-tight font-semibold">
        Produktion
      </h1>
      {sweden && now ? (
        <>
          <div className="mt-0.5 mb-3 flex items-end justify-between gap-3">
            <p className="text-muted-foreground text-[13px]">
              Hela Sverige · kl {clock(sweden.time)}
              <br />
              Tryck på ett område eller kraftslag
            </p>
            <p className="flex flex-col text-right">
              <span className="text-[30px] leading-none font-extralight tabular-nums">
                {mw(summarizePoint(sweden).total)}
              </span>
              <span className="text-muted-foreground text-[11px]">
                MW i hela landet
              </span>
            </p>
          </div>
          <ProductionMap now={now} sweden={sweden} selected={selected} />
        </>
      ) : (
        <p className="mt-6">Kunde inte hämta produktionen just nu.</p>
      )}
    </>
  );
}

/** Översikt eller Karta. Valt område följer med åt båda hållen. */
function ViewSwitch({
  selected,
  showMap,
}: {
  selected: Area | null;
  showMap: boolean;
}) {
  const visa = selected ? `visa=${selected}` : "";
  const options = [
    {
      href: visa ? `/produktion?${visa}` : "/produktion",
      label: "Översikt",
      icon: ChartColumn,
      active: !showMap,
    },
    {
      href: `/produktion?vy=karta${visa ? `&${visa}` : ""}`,
      label: "Karta",
      icon: MapIcon,
      active: showMap,
    },
  ];
  return (
    <nav
      aria-label="Vy"
      className="glass border-foreground/10 flex rounded-full border p-0.5"
    >
      {options.map(({ href, label, icon: Icon, active }) => (
        <AreaLink
          key={label}
          href={href}
          aria-current={active ? "page" : undefined}
          className={`flex min-h-[30px] flex-1 items-center justify-center gap-1.5 rounded-full text-[13px] font-semibold ${
            active ? "bg-foreground text-background" : "text-muted-foreground"
          }`}
        >
          <Icon className="size-[13px]" aria-hidden="true" />
          {label}
        </AreaLink>
      ))}
    </nav>
  );
}

function AreaSwitch({ selected }: { selected: Area | null }) {
  const options: { href: string; label: string; active: boolean }[] = [
    { href: "/produktion", label: "Sverige", active: selected === null },
    ...areas.map((a) => ({
      href: `/produktion?visa=${a}`,
      label: a,
      active: selected === a,
    })),
  ];
  return (
    <nav aria-label="Område" className="flex gap-1.5 overflow-x-auto">
      {options.map((o) => (
        <AreaLink
          key={o.label}
          href={o.href}
          aria-current={o.active ? "page" : undefined}
          className={`flex min-h-[34px] items-center rounded-full border px-3 text-[13px] font-semibold whitespace-nowrap ${
            o.active
              ? "bg-foreground text-background border-foreground"
              : "glass border-foreground/10"
          }`}
        >
          {o.label}
        </AreaLink>
      ))}
    </nav>
  );
}

function ProductionNow({
  point,
  selected,
}: {
  point: NonNullable<ReturnType<typeof latestPoint>>;
  selected: Area | null;
}) {
  const s = summarizePoint(point);
  const percents = roundPercents(s.shares.map((x) => x.percent));
  const items = s.shares.map((x, i) => {
    const long = energyNames[x.kind].long; // "vattenkraft" → "Vattenkraft"
    return {
      kind: x.kind,
      name: long[0].toUpperCase() + long.slice(1),
      mw: x.mw,
      percent: percents[i],
    };
  });

  return (
    <div className="mt-4 flex flex-col gap-3">
      <div className="px-0.5">
        <p className="text-muted-foreground text-[11px] font-semibold tracking-[0.14em] uppercase">
          Produceras just nu
        </p>
        <p className="flex items-baseline gap-1.5">
          <span className="text-[60px] leading-none font-extralight tabular-nums">
            {mw(s.total)}
          </span>
          <span className="text-muted-foreground text-[15px]">MW</span>
        </p>
        <p className="mt-2 flex flex-wrap items-center gap-2 text-[13px]">
          {s.net !== null && (
            <span
              className={`rounded-full px-2.5 py-0.5 font-bold ${
                s.net >= 0
                  ? "bg-(--scale-0)/15 text-(--scale-0)"
                  : "bg-(--scale-3)/15 text-(--scale-3)"
              }`}
            >
              {s.net >= 0 ? "Export" : "Import"} {mw(Math.abs(s.net))} MW
            </span>
          )}
          <span className="text-muted-foreground">
            {point.consumption !== null &&
              `förbrukning ${mw(point.consumption)} MW · `}
            {Math.round(s.fossilFree)} % fossilfritt
          </span>
        </p>
      </div>

      <AreaSwitch selected={selected} />
      <ProductionMix items={items} total={s.total} />
    </div>
  );
}
