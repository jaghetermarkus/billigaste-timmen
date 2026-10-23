"use client";

import { useId, useState, type KeyboardEvent, type PointerEvent } from "react";

import { SCALE, scaleColor } from "@/components/price-chart";
import { useElementWidth } from "@/hooks/use-element-width";
import type { Price } from "@/lib/prices/schema";

type Props = {
  /** Kvartarna som visas, från nu och framåt */
  prices: Price[];
  /** Kostnad per mil för varje kvart, lika lång som prices */
  values: number[];
  fuel: { label: string; perMil: number };
  highlight: { startIndex: number; length: number } | null;
};

const TOP = 8; // luft ovanför det högsta värdet

const kr = (v: number) =>
  v.toLocaleString("sv-SE", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
const timeOf = (iso: string) => iso.slice(11, 16);

/** Ett jämnt steg för stödlinjerna, så att det blir högst fyra stycken. */
function gridStep(top: number) {
  return [1, 2, 5, 10, 20].find((step) => top / step <= 4) ?? 50;
}

export function EvChart({ prices, values, fuel, highlight }: Props) {
  const [selected, setSelected] = useState<number | null>(null);
  const id = useId().replace(/[^a-zA-Z0-9_-]/g, "");
  const [figureRef, measured] = useElementWidth<HTMLElement>(334);

  const n = values.length;
  if (n < 2) return null;

  // Ritytan i pixlar, lite högre än på I dag för att bensinlinjen ska få plats
  const W = Math.max(measured, 200);
  const H = Math.round(W * 0.45);
  const BASE = H - 1.5;

  const min = Math.min(...values);
  const max = Math.max(...values);
  // Skalan går från 0 till det största av elbilens topp och bensinen, plus lite luft
  const top = Math.max(max, fuel.perMil) * 1.12;

  const x = (i: number) => 1.2 + (i * (W - 2.4)) / (n - 1);
  const y = (v: number) => BASE - (Math.max(v, 0) / top) * (BASE - TOP);
  const level = (v: number) => (max === min ? 0.5 : (v - min) / (max - min));
  const colorOf = (i: number) => scaleColor(level(values[i]));
  const percent = (i: number) => `${(x(i) / W) * 100}%`;

  const points = values.map((v, i) => `${x(i).toFixed(1)} ${y(v).toFixed(1)}`);
  const line = `M${points.join(" L")}`;

  // Ytan mellan bensinlinjen och elbilens linje: rakt åt höger längs bensinen, tillbaka längs elbilen
  const fuelY = y(fuel.perMil);
  const savings = `M${x(0)} ${fuelY} L${x(n - 1)} ${fuelY} L${[...points].reverse().join(" L")} Z`;
  // Texten ovanför linjen, eller under om den ligger för nära toppen
  const fuelTextY = fuelY - 6 > 12 ? fuelY - 6 : fuelY + 14;

  const step = gridStep(top);
  const grid = Array.from(
    { length: Math.floor(top / step) + 1 },
    (_, k) => k * step,
  );

  // Klockslag 02, 06, 10, 14, 18, 22
  const ticks = prices.flatMap((p, i) => {
    const [hour, minute] = timeOf(p.time_start).split(":");
    return minute === "00" && Number(hour) % 4 === 2
      ? [{ i, label: hour }]
      : [];
  });

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

  // Avläsningen: vald kvart, annars den första, alltså nu
  const marker = selected ?? 0;
  const shown = prices[marker];
  const readTime = `${selected === null ? "Nu · " : ""}${timeOf(shown.time_start)}–${timeOf(shown.time_end)}`;
  const scaleUrl = `url(#${id}-scale)`;

  return (
    <figure ref={figureRef} className="flex flex-col gap-2">
      <figcaption
        className="flex items-baseline justify-between px-0.5 tabular-nums"
        aria-live="polite"
      >
        <span className="text-muted-foreground text-[13px]">{readTime}</span>
        <span
          className="text-[17px] font-medium"
          style={{ color: colorOf(marker) }}
        >
          {kr(values[marker])}{" "}
          <span className="text-muted-foreground text-xs font-normal">
            kr/mil
          </span>
        </span>
      </figcaption>

      <svg
        viewBox={`0 0 ${W} ${H}`}
        className="text-foreground block w-full touch-pan-y overflow-visible outline-none"
        tabIndex={0}
        aria-label={`Kostnad per mil för elbilen de kommande timmarna, från ${kr(min)} till ${kr(max)} kronor. Streckad linje: ${fuel.label.toLowerCase()}bil, ${kr(fuel.perMil)} kronor per mil. Använd piltangenterna för att bläddra.`}
        onPointerMove={selectFromPointer}
        onPointerDown={selectFromPointer}
        onPointerLeave={(e) => e.pointerType === "mouse" && setSelected(null)}
        onKeyDown={handleKey}
      >
        <defs>
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
        </defs>

        {/* Stödlinjer i kronor */}
        {grid.map((v) => {
          const gy = v === 0 ? BASE : y(v);
          return (
            <g key={v}>
              <line
                x1={0}
                x2={W}
                y1={gy}
                y2={gy}
                stroke="currentColor"
                strokeOpacity={0.07}
              />
              <text
                x={W - 1}
                y={gy - 3}
                textAnchor="end"
                fontSize={10}
                fill="currentColor"
                fillOpacity={0.4}
                className="tabular-nums"
              >
                {v}
              </text>
            </g>
          );
        })}

        {/* Det du sparar: ytan mellan bensinen och elbilen */}
        <path
          d={savings}
          style={{ fill: "var(--scale-0)" }}
          fillOpacity={0.09}
        />

        {/* Bästa laddfönstret */}
        {band && (
          <rect
            x={band.x1}
            y={TOP - 2}
            width={band.x2 - band.x1}
            height={BASE - TOP + 2}
            rx={5}
            style={{ fill: "var(--scale-0)" }}
            fillOpacity={0.13}
          />
        )}

        {/* Bensin- eller dieselbilen */}
        <line
          x1={0}
          x2={W}
          y1={fuelY}
          y2={fuelY}
          stroke="currentColor"
          strokeOpacity={0.55}
          strokeWidth={1.4}
          strokeDasharray="5 4"
        />
        <text
          x={2}
          y={fuelTextY}
          fontSize={11}
          fontWeight={600}
          fill="currentColor"
          fillOpacity={0.75}
        >
          {fuel.label} {kr(fuel.perMil)} kr/mil
        </text>

        {/* Elbilen */}
        <path
          d={line}
          stroke={scaleUrl}
          strokeWidth={2.4}
          fill="none"
          strokeLinecap="round"
          strokeLinejoin="round"
        />

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

        {/* Markören */}
        {selected !== null && (
          <line
            x1={x(marker)}
            x2={x(marker)}
            y1={TOP}
            y2={H - 1}
            stroke="currentColor"
            strokeOpacity={0.4}
          />
        )}
        <circle
          cx={x(marker)}
          cy={y(values[marker])}
          r={4.5}
          style={{ fill: colorOf(marker), stroke: "var(--base)" }}
          strokeWidth={2}
        />
      </svg>

      <div
        className="text-muted-foreground relative h-4 text-[11px] tabular-nums"
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
