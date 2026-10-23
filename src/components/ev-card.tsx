"use client";

import { CarFront, ChevronRight } from "lucide-react";

import { AreaLink } from "@/components/area-link";
import { useEvSettings } from "@/hooks/use-ev-settings";
import { useNow } from "@/hooks/use-now";
import { chargeQuarters, planCharge, startLabel } from "@/lib/domain/ev";
import type { Price } from "@/lib/prices/schema";

const kr = (value: number, decimals = 2) =>
  value.toLocaleString("sv-SE", {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  });
const timeOf = (iso: string) => iso.slice(11, 16);

/** Kortet överst i Maskiner: nästa laddning och vad milen kostar. Hela kortet är en länk. */
export function EvCard({ prices }: { prices: Price[] }) {
  const now = useNow();
  const [settings] = useEvSettings();

  if (now === null) return <div className="h-[118px]" aria-hidden="true" />;

  const hours = kr(chargeQuarters(settings) / 4, 1).replace(",0", "");
  const plan = planCharge(prices, settings, new Date(now));
  const start = plan && prices[plan.window.startIndex];
  const end = plan && prices[plan.window.startIndex + plan.window.length - 1];
  const fuelLabel = settings.fuel === "bensin" ? "bensin" : "diesel";

  return (
    <AreaLink
      href="/maskiner/elbil"
      className="glass flex flex-col gap-2.5 rounded-[20px] border-(--scale-0)/45 px-4 py-3.5"
    >
      <div className="flex items-center gap-3">
        <span className="grid size-9 shrink-0 place-items-center rounded-xl bg-(--scale-0)/15 text-(--scale-0)">
          <CarFront className="size-5" aria-hidden="true" />
        </span>
        <div className="flex min-w-0 flex-1 flex-col">
          <span className="font-semibold">
            Elbil{" "}
            <span className="text-muted-foreground text-[13px] font-normal">
              · {hours} h
            </span>
          </span>
          <span className="text-muted-foreground text-[13px]">
            {start && end
              ? `${startLabel(start.time_start, new Date(now))} ${timeOf(start.time_start)}–${timeOf(end.time_end)} · klar ${settings.readyBy}`
              : `Hinner inte bli klar till ${settings.readyBy}`}
          </span>
        </div>
        {plan && (
          <span className="flex flex-col items-end">
            <span className="font-serif text-[28px] leading-none font-semibold text-(--scale-0) tabular-nums">
              {kr(plan.perMil)}
            </span>
            <span className="text-muted-foreground text-[11px]">kr/mil</span>
          </span>
        )}
      </div>

      {plan && (
        <div className="border-foreground/10 flex items-center gap-2 border-t pt-2.5 text-[13px]">
          <span className="bg-foreground/10 h-1.5 flex-1 overflow-hidden rounded-full">
            <span
              className="block h-full rounded-full bg-(--scale-0)"
              style={{
                width: `${Math.min(100, (plan.perMil / plan.fuelPerMil) * 100)}%`,
              }}
            />
          </span>
          <span className="text-muted-foreground">
            {plan.percent > 0 ? (
              <>
                <span className="font-semibold text-(--scale-0)">
                  {plan.percent} % billigare
                </span>{" "}
                än {fuelLabel}
              </>
            ) : (
              <>
                <span className="font-semibold text-(--mood-accent)">
                  {-plan.percent} % dyrare
                </span>{" "}
                än {fuelLabel}
              </>
            )}
          </span>
          <ChevronRight
            className="text-muted-foreground size-4"
            aria-hidden="true"
          />
        </div>
      )}
    </AreaLink>
  );
}
