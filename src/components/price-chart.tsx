"use client";

import { useId, useState, type KeyboardEvent, type PointerEvent } from "react";
import type { Price } from "@/lib/prices/schema";
import { useNow } from "@/hooks/use-now";

// Ritytan. viewBox har samma proportioner som i designen och skalas jämnt.
const W = 334;
const H = 132;
const TOP = 14; // luft ovanför högsta priset
const BASE = H - 1.5; // y-värdet för noll öre

type Props = {
  prices: Price[];
  highlight?: { startIndex: number; length: number } | null;
  /** Namn per datum, t.ex. { "2026-10-19": "I dag", "2026-10-20": "I morgon" } */
  dayNames?: Record<string, string>;
};

const dateOf = (p: Price) => p.time_start.slice(0, 10);
const timeOf = (p: Price) => p.time_start.slice(11, 16);
const endTimeOf = (p: Price) => p.time_end.slice(11, 16);
const ore = (sek: number) => (sek * 100).toFixed(1);

// Färgskalan: grönt (billigast) → guld → orange → rött (dyrast).
// Färgerna ligger som CSS-variabler i globals.css, så de följer temat.
const SCALE = [
  { at: 0, color: "var(--scale-0)" },
  { at: 0.45, color: "var(--scale-1)" },
  { at: 0.75, color: "var(--scale-2)" },
  { at: 1, color: "var(--scale-3)" },
];

/** Färgen för en nivå mellan 0 (dagens lägsta) och 1 (dagens högsta). */
function scaleColor(level: number) {
  const p = Math.min(1, Math.max(0, level));
  for (let i = 1; i < SCALE.length; i++) {
    const from = SCALE[i - 1];
    const to = SCALE[i];
    if (p <= to.at) {
      const percentTo = Math.round(((p - from.at) / (to.at - from.at)) * 100);
      return `color-mix(in srgb, ${to.color} ${percentTo}%, ${from.color})`;
    }
  }
  return SCALE[SCALE.length - 1].color;
}

export function PriceChart({ prices, highlight, dayNames = {} }: Props) {
  const [selected, setSelected] = useState<number | null>(null);
  const now = useNow();
  // Unikt id för gradienter och mask, utan tecken som inte fungerar i url(#...)
  const id = useId().replace(/[^a-zA-Z0-9_-]/g, "");

  const n = prices.length;
  const values = prices.map((p) => p.SEK_per_kWh);
  const min = Math.min(...values);
  const max = Math.max(...values);
  const x = (i: number) => 1.2 + (i * (W - 2.4)) / Math.max(1, n - 1);
  const y = (v: number) =>
    BASE - Math.max(3, (Math.max(v, 0) / Math.max(max, 0.0001)) * (BASE - TOP));
  const level = (v: number) => (max === min ? 0.5 : (v - min) / (max - min));
  const colorOf = (i: number) => scaleColor(level(values[i]));
  const percent = (i: number) => `${(x(i) / W) * 100}%`;

  // Index där en ny dag börjar (midnatt), och varje dags start, slut och namn
  const dayStarts = prices.flatMap((p, i) =>
    i > 0 && dateOf(p) !== dateOf(prices[i - 1]) ? [i] : [],
  );
  const days = [0, ...dayStarts].map((start, k, all) => ({
    start,
    end: all[k + 1] ?? n,
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

  // Var historiken slutar och framtiden börjar
  const firstFuture =
    now === null
      ? 0
      : prices.findIndex((p) => new Date(p.time_end).getTime() > now);
  const split = firstFuture === -1 ? n - 1 : firstFuture;
  const hasPast = split > 0;
  const currentIndex =
    now === null
      ? -1
      : prices.findIndex(
          (p) =>
            new Date(p.time_start).getTime() <= now &&
            now < new Date(p.time_end).getTime(),
        );

  // Linjer och ytor som SVG-paths
  const points = values.map((v, i) => `${x(i).toFixed(1)} ${y(v).toFixed(1)}`);
  const lineThrough = (from: number, to: number) =>
    `M${points.slice(from, to + 1).join(" L")}`;
  const areaUnder = (from: number, to: number) =>
    `${lineThrough(from, to)} L${x(to).toFixed(1)} ${H} L${x(from).toFixed(1)} ${H} Z`;

  // Bandet för billigaste timmen
  const band = highlight
    ? {
        x1: x(highlight.startIndex) - 3.5,
        x2: x(highlight.startIndex + highlight.length - 1) + 3.5,
      }
    : null;

  function selectFromPointer(e: PointerEvent<SVGSVGElement>) {
    const rect = e.currentTarget.getBoundingClientRect();
    const svgX = ((e.clientX - rect.left) / rect.width) * W;
    const index = Math.round(((svgX - 1.2) / (W - 2.4)) * (n - 1));
    setSelected(Math.max(0, Math.min(n - 1, index)));
  }

  function handleKey(e: KeyboardEvent<SVGSVGElement>) {
    if (e.key === "ArrowRight")
      setSelected((i) => Math.min(n - 1, (i ?? -1) + 1));
    if (e.key === "ArrowLeft") setSelected((i) => Math.max(0, (i ?? n) - 1));
  }

  // Avläsningen och markören: vald punkt, annars kvarten just nu
  const marker = selected ?? (currentIndex >= 0 ? currentIndex : null);
  const shownPrice = marker !== null ? prices[marker] : null;
  const prefix =
    selected === null
      ? "Nu · "
      : multiDay && shownPrice
        ? `${dayNames[dateOf(shownPrice)] ?? ""} · `
        : "";
  const readTime = shownPrice
    ? `${prefix}${timeOf(shownPrice)}–${endTimeOf(shownPrice)}`
    : "Dra över grafen för att se en kvart";

  const scaleUrl = `url(#${id}-scale)`;
  const maskUrl = `url(#${id}-mask)`;
  const round = {
    fill: "none",
    strokeLinecap: "round" as const,
    strokeLinejoin: "round" as const,
  };

  return (
    <figure className="flex flex-col gap-2">
      <figcaption
        className="flex items-baseline justify-between px-0.5 tabular-nums"
        aria-live="polite"
      >
        <span className="text-[13px] text-muted-foreground">{readTime}</span>
        <span
          className="text-[17px] font-medium"
          style={{ color: marker !== null ? colorOf(marker) : undefined }}
        >
          {shownPrice ? ore(shownPrice.SEK_per_kWh) : "–"}{" "}
          <span className="text-xs font-normal text-muted-foreground">öre</span>
        </span>
      </figcaption>

      {multiDay && (
        <div
          className="relative h-4 text-[10px] font-bold uppercase tracking-[0.14em] text-muted-foreground"
          aria-hidden="true"
        >
          {days.map((d) => (
            <span
              key={d.start}
              className="absolute -translate-x-1/2"
              style={{ left: percent((d.start + d.end - 1) / 2) }}
            >
              {d.name}
            </span>
          ))}
        </div>
      )}

      <svg
        viewBox={`0 0 ${W} ${H}`}
        className="block w-full touch-pan-y overflow-visible text-foreground outline-none"
        tabIndex={0}
        aria-label="Elpris per kvart. Färgen går från grönt för billigt till rött för dyrt. Använd piltangenterna för att bläddra."
        onPointerMove={selectFromPointer}
        onPointerDown={selectFromPointer}
        onPointerLeave={(e) => e.pointerType === "mouse" && setSelected(null)}
        onKeyDown={handleKey}
      >
        <defs>
          {/* Lodrät färgskala: grönt vid dagens lägsta pris, rött vid högsta */}
          <linearGradient
            id={`${id}-scale`}
            gradientUnits="userSpaceOnUse"
            x1="0"
            y1={y(min)}
            x2="0"
            y2={y(max)}
          >
            {SCALE.map((s) => (
              <stop key={s.at} offset={s.at} style={{ stopColor: s.color }} />
            ))}
          </linearGradient>
          {/* Ytan under linjen tonar från 32 % till 0 nedåt */}
          <linearGradient id={`${id}-fade`} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" stopColor="#fff" stopOpacity={0.32} />
            <stop offset="1" stopColor="#fff" stopOpacity={0} />
          </linearGradient>
          <mask id={`${id}-mask`}>
            <rect width={W} height={H} fill={`url(#${id}-fade)`} />
          </mask>
        </defs>

        {/* Streckad linje vid midnatt */}
        {dayStarts.map((i) => {
          const mid = (x(i - 1) + x(i)) / 2;
          return (
            <line
              key={i}
              x1={mid}
              x2={mid}
              y1={8}
              y2={H}
              stroke="currentColor"
              strokeOpacity={0.18}
              strokeDasharray="2 3"
            />
          );
        })}

        {/* Billigaste timmen: grönt band bakom linjen */}
        {band && (
          <rect
            x={band.x1}
            y={8}
            width={band.x2 - band.x1}
            height={124}
            rx={5}
            style={{ fill: "var(--scale-0)" }}
            fillOpacity={0.13}
          />
        )}

        {/* Ytor under linjen: historiken matt, framtiden full */}
        {hasPast && (
          <path
            d={areaUnder(0, split)}
            fill={scaleUrl}
            mask={maskUrl}
            opacity={0.4}
          />
        )}
        <path d={areaUnder(split, n - 1)} fill={scaleUrl} mask={maskUrl} />

        {/* Billigaste timmen: grön linje i botten */}
        {band && (
          <line
            x1={band.x1}
            x2={band.x2}
            y1={BASE}
            y2={BASE}
            style={{ stroke: "var(--scale-0)" }}
            strokeWidth={3}
            strokeLinecap="round"
          />
        )}

        {/* Själva linjen: historiken matt, framtiden full */}
        {hasPast && (
          <path
            d={lineThrough(0, split)}
            stroke={scaleUrl}
            strokeOpacity={0.38}
            strokeWidth={2}
            {...round}
          />
        )}
        <path
          d={lineThrough(split, n - 1)}
          stroke={scaleUrl}
          strokeWidth={2.4}
          {...round}
        />

        {/* Markören: just nu (streckad) eller vald punkt (heldragen) */}
        {marker !== null && (
          <>
            <line
              x1={x(marker)}
              x2={x(marker)}
              y1={selected === null ? y(values[marker]) : 8}
              y2={H - 1}
              stroke="currentColor"
              strokeOpacity={selected === null ? 0.25 : 0.4}
              strokeDasharray={selected === null ? "2 2" : undefined}
            />
            <circle
              cx={x(marker)}
              cy={y(values[marker])}
              r={selected === null ? 4 : 4.5}
              style={{ fill: colorOf(marker), stroke: "var(--base)" }}
              strokeWidth={2}
            />
          </>
        )}
      </svg>

      <div
        className="relative h-4 text-[11px] text-muted-foreground tabular-nums"
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
