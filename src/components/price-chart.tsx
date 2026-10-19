"use client";

import {
  useEffect,
  useState,
  type KeyboardEvent,
  type PointerEvent,
} from "react";
import type { Price } from "@/lib/prices/schema";

const WIDTH = 960;
const HEIGHT = 200;

type Props = {
  prices: Price[];
  highlight?: { startIndex: number; length: number } | null;
  /** Namn per datum, t.ex. { "2026-10-19": "I dag", "2026-10-20": "I morgon" } */
  dayNames?: Record<string, string>;
};

const dateOf = (p: Price) => p.time_start.slice(0, 10);
const timeOf = (p: Price) => p.time_start.slice(11, 16);

export function PriceChart({ prices, highlight, dayNames = {} }: Props) {
  const [selected, setSelected] = useState<number | null>(null);
  const [now, setNow] = useState<number | null>(null);

  useEffect(() => {
    const first = setTimeout(() => setNow(Date.now()), 0);
    const id = setInterval(() => setNow(Date.now()), 60_000);
    return () => {
      clearTimeout(first);
      clearInterval(id);
    };
  }, []);

  const values = prices.map((p) => p.SEK_per_kWh);
  const top = Math.max(...values, 0);
  const bottom = Math.min(...values, 0);
  const range = top - bottom || 1;
  const y = (value: number) => ((top - value) / range) * HEIGHT;
  const barWidth = WIDTH / prices.length;
  const percent = (i: number) => `${(i / prices.length) * 100}%`;

  // Index där en ny dag börjar (midnatt), och varje dags start, slut och namn
  const dayStarts = prices.flatMap((p, i) =>
    i > 0 && dateOf(p) !== dateOf(prices[i - 1]) ? [i] : [],
  );
  const days = [0, ...dayStarts].map((start, n, all) => ({
    start,
    end: all[n + 1] ?? prices.length,
    name: dayNames[dateOf(prices[start])] ?? dateOf(prices[start]),
  }));
  const multiDay = days.length > 1;

  // Klockslag under grafen var sjätte timme
  const ticks = prices.flatMap((p, i) => {
    const [hour, minute] = timeOf(p).split(":");
    return i > 0 && minute === "00" && Number(hour) % 6 === 0
      ? [{ i, label: hour }]
      : [];
  });

  const inHighlight = (i: number) =>
    highlight != null &&
    i >= highlight.startIndex &&
    i < highlight.startIndex + highlight.length;
  const isPast = (p: Price) =>
    now !== null && new Date(p.time_end).getTime() <= now;

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
  const activeLabel = active
    ? `${multiDay ? `${(dayNames[dateOf(active)] ?? dateOf(active)).toLowerCase()} ` : ""}${timeOf(active)}  ${(active.SEK_per_kWh * 100).toFixed(1)} öre/kWh`
    : "Dra eller hovra över grafen";

  function barClass(p: Price, i: number) {
    if (i === selected) return "fill-foreground";
    if (inHighlight(i)) return "fill-(--mood-accent)";
    if (isPast(p)) return "fill-muted-foreground/15";
    return "fill-muted-foreground/40";
  }

  return (
    <figure className="mt-6">
      <figcaption className="h-6 text-sm tabular-nums" aria-live="polite">
        {activeLabel}
      </figcaption>

      {multiDay && (
        <div
          className="relative h-5 text-xs text-muted-foreground"
          aria-hidden="true"
        >
          {days.map((d) => (
            <span
              key={d.start}
              className="absolute -translate-x-1/2"
              style={{ left: percent((d.start + d.end) / 2) }}
            >
              {d.name}
            </span>
          ))}
        </div>
      )}

      <svg
        viewBox={`0 0 ${WIDTH} ${HEIGHT}`}
        preserveAspectRatio="none"
        className="h-48 w-full touch-pan-y outline-none"
        tabIndex={0}
        aria-label="Elpris per kvart. Använd piltangenterna för att bläddra."
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
            className={barClass(p, i)}
          />
        ))}
        {dayStarts.map((i) => (
          <line
            key={i}
            x1={i * barWidth}
            x2={i * barWidth}
            y1={0}
            y2={HEIGHT}
            className="stroke-foreground/30"
            vectorEffect="non-scaling-stroke"
          />
        ))}
      </svg>

      <div
        className="relative h-5 text-xs text-muted-foreground tabular-nums"
        aria-hidden="true"
      >
        {ticks.map((t) => (
          <span
            key={t.i}
            className="absolute -translate-x-1/2"
            style={{ left: percent(t.i) }}
          >
            {t.label}
          </span>
        ))}
      </div>
    </figure>
  );
}
