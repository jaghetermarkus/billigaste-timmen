"use client";

import { useEvSettings } from "@/hooks/use-ev-settings";
import { useNow } from "@/hooks/use-now";
import {
  allInSekPerKwh,
  chargeKwh,
  chargeQuarters,
  evSekPerMil,
  findChargeWindow,
  fuelDefaults,
  fuelSekPerMil,
  percentCheaper,
  startLabel,
  type Fuel,
} from "@/lib/domain/ev";
import type { Price } from "@/lib/prices/schema";

const kr = (value: number, decimals = 2) =>
  value.toLocaleString("sv-SE", {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  });
const timeOf = (iso: string) => iso.slice(11, 16);
const averageOf = (ps: Price[]) =>
  ps.reduce((sum, p) => sum + p.SEK_per_kWh, 0) / ps.length;

const fuelNames: Record<Fuel, { label: string; car: string }> = {
  bensin: { label: "Bensin", car: "Bensinbil" },
  diesel: { label: "Diesel", car: "Dieselbil" },
};

export function EvPlanner({ prices }: { prices: Price[] }) {
  const now = useNow();
  const [settings, update] = useEvSettings();

  // På servern vet vi inte vad klockan är hos besökaren. Håll platsen tills vi vet.
  if (now === null)
    return <div className="mt-5 h-[440px]" aria-hidden="true" />;

  const quarters = chargeQuarters(settings);
  const best = findChargeWindow(prices, {
    now: new Date(now),
    readyBy: settings.readyBy,
    quarters,
  });

  const subtitle = `${kr(settings.kwhPerMil, 1)} kWh/mil · laddar ${settings.fromPercent}→${settings.toPercent} % på ${kr(quarters / 4, 1)} h · klar ${settings.readyBy}`;

  if (!best) {
    return (
      <>
        <p className="text-muted-foreground text-[13px]">{subtitle}</p>
        <p className="glass mt-5 rounded-[22px] px-4 py-3.5">
          Laddningen hinner inte bli klar till {settings.readyBy} med de priser
          som finns just nu.
        </p>
      </>
    );
  }

  // Jämför med att börja ladda direkt
  const first = prices.findIndex((p) => new Date(p.time_end).getTime() > now);
  const nowAverage = averageOf(prices.slice(first, first + quarters));

  const start = prices[best.startIndex];
  const end = prices[best.startIndex + best.length - 1];
  const bestPerMil = evSekPerMil(best.average, settings);
  const nowPerMil = evSekPerMil(nowAverage, settings);
  const chargeCost =
    allInSekPerKwh(best.average, settings) * chargeKwh(settings);
  const nowCost = allInSekPerKwh(nowAverage, settings) * chargeKwh(settings);

  const fuelPerMil = fuelSekPerMil(settings);
  const percent = percentCheaper(bestPerMil, fuelPerMil);
  const widest = Math.max(bestPerMil, fuelPerMil);
  const fuel = fuelNames[settings.fuel];

  const pickFuel = (f: Fuel) => update({ fuel: f, ...fuelDefaults[f] });

  return (
    <>
      <p className="text-muted-foreground text-[13px]">{subtitle}</p>

      {/* Bästa laddfönstret */}
      <section
        aria-labelledby="ev-best"
        className="glass mt-5 flex flex-col gap-2 rounded-[22px] border-(--mood-accent) px-4 py-3.5"
      >
        <h2
          id="ev-best"
          className="text-muted-foreground text-[11px] font-semibold tracking-[0.14em] uppercase"
        >
          Bäst att ladda
        </h2>
        <p className="font-serif text-[26px] leading-tight font-semibold">
          {startLabel(start.time_start, new Date(now))}{" "}
          {timeOf(start.time_start)}–{timeOf(end.time_end)}
        </p>
        <div className="flex items-end justify-between gap-3">
          <p className="flex items-baseline gap-1.5">
            <span className="font-serif text-[48px] leading-none font-medium text-(--scale-0) tabular-nums">
              {kr(bestPerMil)}
            </span>
            <span className="text-muted-foreground text-sm">kr/mil</span>
          </p>
          <p className="flex flex-col items-end pb-1">
            <span className="text-muted-foreground text-xs">Laddar du nu</span>
            <span className="tabular-nums">{kr(nowPerMil)} kr/mil</span>
          </p>
        </div>
        <p className="text-muted-foreground border-foreground/10 border-t pt-2 text-xs">
          Laddningen kostar ca {kr(chargeCost, 0)} kr
          {nowCost - chargeCost >= 1 && (
            <>, {kr(nowCost - chargeCost, 0)} kr mindre än att ladda nu</>
          )}
          .
        </p>
      </section>

      {/* Jämförelsen */}
      <section
        aria-labelledby="ev-compare"
        className="glass mt-3 flex flex-col gap-2.5 rounded-[22px] px-4 py-3.5"
      >
        <div className="flex items-center justify-between">
          <div>
            <h2
              id="ev-compare"
              className="text-muted-foreground text-[11px] font-semibold tracking-[0.14em] uppercase"
            >
              Per 10 mil
            </h2>
            <p
              className={`font-serif text-[22px] font-semibold ${percent > 0 ? "text-(--scale-0)" : "text-(--mood-accent)"}`}
            >
              {percent > 0 ? `${percent} % billigare` : `${-percent} % dyrare`}
            </p>
          </div>
          <div
            role="group"
            aria-label="Jämför med"
            className="bg-foreground/5 flex rounded-full border p-0.5"
          >
            {(Object.keys(fuelNames) as Fuel[]).map((f) => (
              <button
                key={f}
                type="button"
                aria-pressed={settings.fuel === f}
                onClick={() => pickFuel(f)}
                className={`min-h-8 rounded-full px-3 text-[13px] font-semibold ${
                  settings.fuel === f
                    ? "bg-foreground text-background"
                    : "text-muted-foreground"
                }`}
              >
                {fuelNames[f].label}
              </button>
            ))}
          </div>
        </div>

        <dl className="grid grid-cols-[74px_minmax(0,1fr)_56px] items-center gap-x-2.5 gap-y-2 text-[13px]">
          <dt>Elbil</dt>
          <dd className="bg-foreground/5 h-2.5 overflow-hidden rounded-full">
            <span
              className="block h-full rounded-full bg-(--scale-0)"
              style={{ width: `${(bestPerMil / widest) * 100}%` }}
            />
          </dd>
          <dd className="text-right font-semibold tabular-nums">
            {kr(bestPerMil * 10, 0)} kr
          </dd>

          <dt>{fuel.car}</dt>
          <dd className="bg-foreground/5 h-2.5 overflow-hidden rounded-full">
            <span
              className="bg-foreground/45 block h-full rounded-full"
              style={{ width: `${(fuelPerMil / widest) * 100}%` }}
            />
          </dd>
          <dd className="text-right font-semibold tabular-nums">
            {kr(fuelPerMil * 10, 0)} kr
          </dd>
        </dl>

        <p className="text-muted-foreground text-[11px] leading-snug">
          Elen räknas med skatt, nätavgift och {settings.lossPercent} %
          laddförlust. {fuel.label}: {kr(settings.litersPerMil)} l/mil ×{" "}
          {kr(settings.fuelSekPerLiter)} kr/l.
        </p>
      </section>
    </>
  );
}
