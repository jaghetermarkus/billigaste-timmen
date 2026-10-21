"use client";

import type { Price } from "@/lib/prices/schema";
import { findPriceAt } from "@/lib/domain/current-price";
import { useNow } from "@/hooks/use-now";

type Props = {
  prices: Price[];
  min: number; // SEK/kWh, dagens lägsta
  max: number; // SEK/kWh, dagens högsta
  /** Visa ett fast pris i stället för just nu, t.ex. snittet i morgon */
  fixed?: { label: string; price: number };
};

const ore = (sek: number) => (sek * 100).toFixed(1);

export function CurrentPrice({ prices, min, max, fixed }: Props) {
  const now = useNow();
  const current = now === null ? undefined : findPriceAt(prices, new Date(now));

  // Antingen det fasta priset eller priset just nu (SEK/kWh)
  const price = fixed ? fixed.price : current?.SEK_per_kWh;
  const label = fixed ? fixed.label : "Just nu";

  // Var i intervallet priset ligger: 0 = lägst, 1 = högst
  const position =
    price === undefined
      ? null
      : max === min
        ? 0.5
        : (price - min) / (max - min);

  return (
    <section
      aria-label={label}
      className="flex flex-col items-center lg:items-start"
    >
      <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-muted-foreground">
        {label}
      </p>

      <p className="mt-1 flex items-baseline gap-2">
        <span className="text-[60px] leading-none font-light tracking-tight tabular-nums lg:text-[84px]">
          {price !== undefined ? Math.round(price * 100) : "–"}
        </span>
        <span className="text-sm text-muted-foreground">öre/kWh</span>
      </p>

      <div className="mt-5 w-60">
        <div className="relative h-1 rounded-full bg-foreground/10">
          {position !== null && (
            <span
              aria-hidden="true"
              className="absolute top-1/2 size-2.5 -translate-x-1/2 -translate-y-1/2 rounded-full bg-(--mood-accent) shadow-[0_0_10px_var(--mood-accent)]"
              style={{ left: `${position * 100}%` }}
            />
          )}
        </div>
        <div className="mt-1.5 flex justify-between text-[11px] text-muted-foreground tabular-nums">
          <span>{ore(min)}</span>
          <span>{ore(max)}</span>
        </div>
      </div>
    </section>
  );
}
