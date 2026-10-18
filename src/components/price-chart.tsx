"use client";

import { useState, type KeyboardEvent, type PointerEvent } from "react";
import type { Price } from "@/lib/prices/schema";

const WIDTH = 960;
const HEIGHT = 200;

export function PriceChart({
  prices,
  highlight,
}: {
  prices: Price[];
  highlight?: { startIndex: number; length: number } | null;
}) {
  const [selected, setSelected] = useState<number | null>(null);

  const inHighlight = (i: number) =>
    highlight != null &&
    i >= highlight.startIndex &&
    i < highlight.startIndex + highlight.length;

  const values = prices.map((p) => p.SEK_per_kWh);
  const top = Math.max(...values, 0);
  const bottom = Math.min(...values, 0);
  const range = top - bottom || 1;
  const y = (value: number) => ((top - value) / range) * HEIGHT;
  const barWidth = WIDTH / prices.length;

  function selectFromPointer(e: PointerEvent<SVGSVGElement>) {
    const rect = e.currentTarget.getBoundingClientRect();
    const index = Math.floor(
      ((e.clientX - rect.left) / rect.width) * prices.length,
    );
    setSelected(Math.max(0, Math.min(prices.length - 1, index)));
  }

  function handleKey(e: KeyboardEvent<SVGSVGElement>) {
    if (e.key === "ArrowRight")
      setSelected((i) => Math.min(prices.length - 1, (i ?? -1) + 1));
    if (e.key === "ArrowLeft")
      setSelected((i) => Math.max(0, (i ?? prices.length) - 1));
  }

  const active = selected !== null ? prices[selected] : null;

  return (
    <figure className="mt-6">
      <figcaption className="h-6 text-sm tabular-nums" aria-live="polite">
        {active
          ? `${active.time_start.slice(11, 16)}  ${(active.SEK_per_kWh * 100).toFixed(1)} öre/kWh`
          : "Dra eller hovra över grafen"}
      </figcaption>
      <svg
        viewBox={`0 0 ${WIDTH} ${HEIGHT}`}
        preserveAspectRatio="none"
        className="h-48 w-full touch-pan-y outline-none"
        tabIndex={0}
        aria-label="Elpris per kvart i dag. Använd piltangenterna för att bläddra."
        onPointerMove={selectFromPointer}
        onPointerDown={selectFromPointer}
        onPointerLeave={(e) => e.pointerType === "mouse" && setSelected(null)}
        onKeyDown={handleKey}
      >
        {prices.map((p, i) => (
          <rect
            key={p.time_start}
            x={i * barWidth + barWidth * 0.15}
            y={y(Math.max(p.SEK_per_kWh, 0))}
            width={barWidth * 0.7}
            height={Math.max(1, Math.abs(y(p.SEK_per_kWh) - y(0)))}
            className={
              i === selected
                ? "fill-primary"
                : inHighlight(i)
                  ? "fill-emerald-500"
                  : "fill-muted-foreground/40"
            }
          />
        ))}
      </svg>
    </figure>
  );
}
