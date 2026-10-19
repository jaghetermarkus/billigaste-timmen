"use client";

import type { Price } from "@/lib/prices/schema";
import { findPriceAt } from "@/lib/domain/current-price";
import { useNow } from "@/hooks/use-now";

export function CurrentPrice({ prices }: { prices: Price[] }) {
  const now = useNow();

  if (now === null) return <p className="text-4xl font-light">–</p>;

  const current = findPriceAt(prices, new Date(now));
  if (!current) return <p>Inget pris för just nu</p>;

  return (
    <div>
      <p className="text-sm opacity-70">Just nu</p>
      <p className="text-4xl font-light tabular-nums">
        {(current.SEK_per_kWh * 100).toFixed(1)}{" "}
        <span className="text-base">öre/kWh</span>
      </p>
    </div>
  );
}
