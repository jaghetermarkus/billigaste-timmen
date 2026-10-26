import { Suspense } from "react";
import { TZDate } from "@date-fns/tz";
import { format } from "date-fns";

import { AreaLink } from "@/components/area-link";
import { ProductionMix } from "@/components/production-mix";
import { areaCities, areas, type Area } from "@/lib/domain/area";
import {
  energyNames,
  latestPoint,
  roundPercents,
  summarizePoint,
} from "@/lib/domain/production";
import { fetchProductionToday } from "@/lib/production/fetch-production";

export const metadata = {
  title: "Elproduktion just nu",
  description:
    "Hur mycket el Sverige producerar just nu, per kraftslag och elområde.",
};

type SearchParams = Promise<{ visa?: string }>;

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
  const { visa } = await searchParams;
  // ?visa=SE3 visar ett område. Utan visa (eller med något okänt) visas hela Sverige.
  const selected = areas.find((a) => a === visa) ?? null;

  const day = await fetchProductionToday();
  const points = day ? (selected ? day.byArea[selected] : day.sweden) : [];
  const latest = latestPoint(points);

  return (
    <>
      <AreaSwitch selected={selected} />

      <div className="mt-4 flex flex-col gap-0.5">
        <h1 className="font-serif text-[34px] leading-tight font-semibold">
          Produktion
        </h1>
        <p className="text-muted-foreground text-[13px]">
          {selected ? `${selected} · ${areaCities[selected]}` : "Hela Sverige"}
          {latest &&
            ` · kl ${format(new TZDate(latest.time, "Europe/Stockholm"), "HH:mm")}`}{" "}
          · uppdateras var 15:e minut
        </p>
      </div>

      {latest ? (
        <ProductionNow point={latest} />
      ) : (
        <p className="mt-6">Kunde inte hämta produktionen just nu.</p>
      )}

      <p className="text-muted-foreground mt-3 px-1 text-[11px]">
        Källa: ENTSO-E Transparency Platform. Siffrorna bygger delvis på
        kraftbolagens planer och kan justeras i efterhand.
      </p>
    </>
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
}: {
  point: NonNullable<ReturnType<typeof latestPoint>>;
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

      <ProductionMix items={items} total={s.total} />
    </div>
  );
}
