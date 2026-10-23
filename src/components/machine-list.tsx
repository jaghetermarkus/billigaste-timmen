"use client";

import { useState } from "react";
import { ChevronDown } from "lucide-react";

import { useNow } from "@/hooks/use-now";
import { startLabel } from "@/lib/domain/ev";
import {
  defaultMachines,
  formatDuration,
  planMachine,
} from "@/lib/domain/machines";
import type { Price } from "@/lib/prices/schema";

const timeOf = (iso: string) => iso.slice(11, 16);
const ore = (sek: number) => (sek * 100).toFixed(1).replace(".", ",");
const kr = (sek: number) =>
  sek.toLocaleString("sv-SE", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });

const statLabel =
  "text-muted-foreground text-[10px] font-semibold tracking-[0.14em] uppercase";

export function MachineList({ prices }: { prices: Price[] }) {
  const now = useNow();
  const [open, setOpen] = useState<string | null>(null);

  if (now === null) return <div className="h-[230px]" aria-hidden="true" />;

  return (
    <ul className="flex flex-col gap-2.5">
      {defaultMachines.map((m) => {
        const plan = planMachine(prices, m, new Date(now));
        const isOpen = open === m.id;
        const start = plan && prices[plan.window.startIndex];
        const end =
          plan && prices[plan.window.startIndex + plan.window.length - 1];

        return (
          <li
            key={m.id}
            className={`glass overflow-hidden rounded-[20px] ${isOpen ? "border-(--mood-accent)" : ""}`}
          >
            <button
              type="button"
              aria-expanded={isOpen}
              aria-controls={`machine-${m.id}`}
              onClick={() => setOpen(isOpen ? null : m.id)}
              className="flex w-full items-center gap-3 px-4 py-3.5 text-left"
            >
              <span className="flex min-w-0 flex-1 flex-col">
                <span className="font-semibold">
                  {m.name}{" "}
                  <span className="text-muted-foreground text-[13px] font-normal">
                    · {formatDuration(m.quarters)}
                  </span>
                </span>
                <span className="text-muted-foreground text-[13px]">
                  {start && end
                    ? `${startLabel(start.time_start, new Date(now))} · klar ${timeOf(end.time_end)}`
                    : `Hinner inte bli klar till ${m.readyBy}`}
                </span>
              </span>
              {start && (
                <span className="font-serif text-[28px] font-semibold text-(--mood-accent) tabular-nums">
                  {timeOf(start.time_start)}
                </span>
              )}
              <ChevronDown
                className={`text-muted-foreground size-4 transition-transform ${isOpen ? "rotate-180" : ""}`}
                aria-hidden="true"
              />
            </button>

            {isOpen && plan && (
              <dl
                id={`machine-${m.id}`}
                className="border-foreground/10 mx-4 mb-3.5 grid grid-cols-3 border-t pt-2.5"
              >
                <div className="flex flex-col gap-0.5">
                  <dt className={statLabel}>Snitt då</dt>
                  <dd className="text-[17px] font-light tabular-nums">
                    {ore(plan.window.average)} öre
                  </dd>
                </div>
                <div className="border-foreground/10 flex flex-col gap-0.5 border-l pl-3">
                  <dt className={statLabel}>Startar du nu</dt>
                  <dd className="text-[17px] font-light tabular-nums">
                    {ore(plan.nowAverage)} öre
                  </dd>
                </div>
                <div className="border-foreground/10 flex flex-col gap-0.5 border-l pl-3">
                  <dt className={statLabel}>Sparar</dt>
                  <dd className="text-[17px] font-medium text-(--mood-accent) tabular-nums">
                    {kr(plan.savingSek)} kr
                  </dd>
                </div>
              </dl>
            )}
          </li>
        );
      })}
    </ul>
  );
}
