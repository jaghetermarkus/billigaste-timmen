"use client";

import { useId, useState, type KeyboardEvent, type PointerEvent } from "react";
import type { Price } from "@/lib/prices/schema";
import { useNow } from "@/hooks/use-now";

const WIDTH = 960;
const HEIGHT = 200;

type Props = {
  prices: Price[];
  highlight?: { startIndex: number; length: number } | null;
  /** Namn per datum, t.ex. { "2026-10-19": "I dag", "2026-10-20": "I morgon" } */
  dayNames?: Record<string, string>;
};

type Group = "past" | "rest" | "best" | "selected";

const dateOf = (p: Price) => p.time_start.slice(0, 10);
const timeOf = (p: Price) => p.time_start.slice(11, 16);
const endTimeOf = (p: Price) => p.time_end.slice(11, 16);
const ore = (sek: number) => (sek * 100).toFixed(1);

export function PriceChart({ prices, highlight, dayNames = {} }: Props) {
  const [selected, setSelected] = useState<number | null>(null);
  const now = useNow();
  // Unikt id för gradienterna, utan tecken som inte fungerar i url(#...)
  const id = useId().replace(/[^a-zA-Z0-9_-]/g, "");

  const values = prices.map((p) => p.SEK_per_kWh);
  const top = Math.max(...values, 0) * 1.04;
  const bottom = Math.min(...values, 0);
  const range = top - bottom || 1;
  const y = (value: number) => ((top - value) / range) * HEIGHT;
  const slot = WIDTH / prices.length;
  const xOf = (i: number) => i * slot + slot / 2;
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

  // Klockslag var sjätte timme, var tolfte med två dagar
  const tickEvery = multiDay ? 12 : 6;
  const ticks = prices.flatMap((p, i) => {
    const [hour, minute] = timeOf(p).split(":");
    return i > 0 && minute === "00" && Number(hour) % tickEvery === 0
      ? [{ i, label: hour }]
      : [];
  });

  const inHighlight = (i: number) =>
    highlight != null &&
    i >= highlight.startIndex &&
    i < highlight.startIndex + highlight.length;
  const isPast = (p: Price) =>
    now !== null && new Date(p.time_end).getTime() <= now;
  const currentIndex =
    now === null
      ? -1
      : prices.findIndex(
          (p) =>
            new Date(p.time_start).getTime() <= now &&
            now < new Date(p.time_end).getTime(),
        );

  // Varje stapel är ett kort streck: "M x botten V topp". Strecken samlas
  // i en path per grupp, så att det blir fyra element i stället för 96.
  const groups: Record<Group, string> = {
    past: "",
    rest: "",
    best: "",
    selected: "",
  };
  prices.forEach((p, i) => {
    const base = y(0);
    let tip = y(p.SEK_per_kWh);
    if (Math.abs(tip - base) < 4) tip = base - 4; // syns även när priset är nära noll
    const group: Group =
      i === selected
        ? "selected"
        : inHighlight(i)
          ? "best"
          : isPast(p)
            ? "past"
            : "rest";
    groups[group] +=
      `M${xOf(i).toFixed(1)} ${base.toFixed(1)}V${tip.toFixed(1)}`;
  });

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

  // Avläsningen: vald stapel, annars kvarten just nu
  const shown = selected ?? (currentIndex >= 0 ? currentIndex : null);
  const shownPrice = shown !== null ? prices[shown] : null;
  const prefix =
    selected === null
      ? "Nu · "
      : multiDay && shownPrice
        ? `${dayNames[dateOf(shownPrice)] ?? ""} · `
        : "";
  const readTime = shownPrice
    ? `${prefix}${timeOf(shownPrice)}–${endTimeOf(shownPrice)}`
    : "Dra över grafen för att se en kvart";

  const stroke = multiDay ? 1.4 : 2.2;
  const line = {
    fill: "none",
    strokeLinecap: "round" as const,
    strokeWidth: stroke,
    vectorEffect: "non-scaling-stroke" as const,
  };

  return (
    <figure className="flex flex-col gap-2">
      <figcaption
        className="flex items-baseline justify-between px-0.5 tabular-nums"
        aria-live="polite"
      >
        <span className="text-[13px] text-muted-foreground">{readTime}</span>
        <span className="text-[17px] font-medium">
          {shownPrice ? ore(shownPrice.SEK_per_kWh) : "–"}{" "}
          <span className="text-xs font-normal text-muted-foreground">öre</span>
        </span>
      </figcaption>

      {multiDay && (
        <div
          className="relative h-4 text-[11px] text-muted-foreground"
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
        className="h-32 w-full touch-pan-y overflow-visible text-foreground outline-none"
        tabIndex={0}
        aria-label="Elpris per kvart. Använd piltangenterna för att bläddra."
        onPointerMove={selectFromPointer}
        onPointerDown={selectFromPointer}
        onPointerLeave={(e) => e.pointerType === "mouse" && setSelected(null)}
        onKeyDown={handleKey}
      >
        <defs>
          <linearGradient
            id={`${id}-rest`}
            gradientUnits="userSpaceOnUse"
            x1="0"
            y1={HEIGHT}
            x2="0"
            y2="0"
          >
            <stop offset="0" stopColor="currentColor" stopOpacity={0.06} />
            <stop offset="1" stopColor="currentColor" stopOpacity={0.36} />
          </linearGradient>
          <linearGradient
            id={`${id}-best`}
            gradientUnits="userSpaceOnUse"
            x1="0"
            y1={HEIGHT}
            x2="0"
            y2="0"
          >
            <stop
              offset="0"
              style={{ stopColor: "var(--mood-accent)" }}
              stopOpacity={0.25}
            />
            <stop offset="1" style={{ stopColor: "var(--mood-accent)" }} />
          </linearGradient>
          <filter
            id={`${id}-glow`}
            x="-50%"
            y="-50%"
            width="200%"
            height="200%"
          >
            <feGaussianBlur stdDeviation="3" />
          </filter>
        </defs>

        {dayStarts.map((i) => (
          <line
            key={i}
            x1={i * slot}
            x2={i * slot}
            y1={0}
            y2={HEIGHT}
            className="stroke-foreground/20"
            strokeDasharray="2 3"
            vectorEffect="non-scaling-stroke"
          />
        ))}

        <path
          d={groups.past}
          stroke="currentColor"
          strokeOpacity={0.12}
          {...line}
        />
        <path d={groups.rest} stroke={`url(#${id}-rest)`} {...line} />
        <path
          d={groups.best}
          className="stroke-(--mood-accent)"
          opacity={0.6}
          filter={`url(#${id}-glow)`}
          {...line}
          strokeWidth={stroke + 1}
        />
        <path d={groups.best} stroke={`url(#${id}-best)`} {...line} />

        {selected !== null && (
          <line
            x1={xOf(selected)}
            x2={xOf(selected)}
            y1={0}
            y2={HEIGHT}
            stroke="currentColor"
            strokeOpacity={0.35}
            vectorEffect="non-scaling-stroke"
          />
        )}
        <path
          d={groups.selected}
          stroke="currentColor"
          {...line}
          strokeWidth={stroke + 0.8}
        />
      </svg>

      <div
        className="relative h-4 text-[10px] font-bold uppercase tracking-[0.14em] text-muted-foreground"
        aria-hidden="true"
      >
        <span className="absolute left-0">00</span>
        {ticks.map((t) => (
          <span
            key={t.i}
            className="absolute -translate-x-1/2"
            style={{ left: percent(t.i) }}
          >
            {t.label}
          </span>
        ))}
        <span className="absolute right-0">24</span>
      </div>
    </figure>
  );
}
