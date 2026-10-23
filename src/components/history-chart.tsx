"use client";

import { useRef, useState, type KeyboardEvent, type PointerEvent } from "react";

import { scaleColor } from "@/components/price-chart";
import { useElementWidth } from "@/hooks/use-element-width";

export type HistoryBar = {
  /** "fre 23 okt" eller "okt 2026" */
  label: string;
  /** Kort text under grafen, bara på några av staplarna */
  tick?: string;
  value: number;
  /** Samma dygn eller månad året innan */
  previous: number | null;
};

type Props = {
  bars: HistoryBar[];
  average: number;
  /** Visar året innan som svaga staplar bakom, som i månadsläget */
  showPrevious: boolean;
  /** "Snitt 30 dagar" eller "Snitt 12 månader", visas när ingen stapel är vald */
  totalLabel: string;
};

const TOP = 6; // luft ovanför den högsta stapeln
const GUTTER = 26; // plats till höger för siffrorna på stödlinjerna

const ore = (v: number, decimals = 1) =>
  v.toLocaleString("sv-SE", {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  });

/** Ett jämnt steg för stödlinjerna, så att det blir högst fyra stycken. */
function gridStep(top: number) {
  return [10, 25, 50, 100].find((step) => top / step <= 4) ?? 200;
}

export function HistoryChart({
  bars,
  average,
  showPrevious,
  totalLabel,
}: Props) {
  const [selected, setSelected] = useState<number | null>(null);
  // Stapeln som just avmarkerades, så att fingret inte markerar den igen direkt
  const skipped = useRef<number | null>(null);
  const [figureRef, measured] = useElementWidth<HTMLElement>(334);

  const n = bars.length;
  const W = Math.max(measured, 200);
  const H = Math.round(W * 0.45);
  const BASE = H - 1.5;

  const values = bars.map((b) => b.value);
  const min = Math.min(...values);
  const max = Math.max(...values);
  const previousMax = showPrevious
    ? Math.max(0, ...bars.map((b) => b.previous ?? 0))
    : 0;
  const top = Math.max(max, previousMax) * 1.1;

  const slot = (W - GUTTER) / n;
  const barWidth = showPrevious ? slot * 0.5 : slot * 0.62;
  // I månadsläget står årets stapel lite till höger och fjolårets lite till vänster
  const nudge = showPrevious ? barWidth * 0.18 : 0;
  const center = (i: number) => slot * i + slot / 2;
  const y = (v: number) => BASE - (Math.max(v, 0) / top) * (BASE - TOP);
  const level = (v: number) => (max === min ? 0.5 : (v - min) / (max - min));

  const step = gridStep(top);
  const grid = Array.from(
    { length: Math.floor(top / step) },
    (_, k) => (k + 1) * step,
  ).filter((v) => v < top);

  /** Stapeln under pekaren. Siffrorna till höger räknas till den sista. */
  function indexAt(e: PointerEvent<HTMLDivElement>) {
    const rect = e.currentTarget.getBoundingClientRect();
    const svgX = ((e.clientX - rect.left) / rect.width) * W;
    return Math.max(0, Math.min(n - 1, Math.floor(svgX / slot)));
  }

  function handleDown(e: PointerEvent<HTMLDivElement>) {
    const index = indexAt(e);
    // Tryck på den valda stapeln igen: tillbaka till hela perioden
    if (index === selected) {
      skipped.current = index;
      setSelected(null);
    } else {
      setSelected(index);
    }
  }

  function handleMove(e: PointerEvent<HTMLDivElement>) {
    const index = indexAt(e);
    if (index === skipped.current) return;
    skipped.current = null;
    setSelected(index);
  }

  function handleKey(e: KeyboardEvent<HTMLDivElement>) {
    if (e.key === "ArrowRight")
      setSelected((i) => Math.min(n - 1, (i ?? -1) + 1));
    if (e.key === "ArrowLeft") setSelected((i) => Math.max(0, (i ?? n) - 1));
    if (e.key === "Escape") setSelected(null);
  }

  // Avläsningen: vald stapel, annars snittet för hela perioden
  const shown = selected === null ? null : bars[selected];
  const readValue = shown ? shown.value : average;
  const readLabel = shown
    ? [
        shown.label,
        showPrevious && shown.previous !== null
          ? `i fjol ${ore(shown.previous, 0)} öre`
          : null,
      ]
        .filter(Boolean)
        .join(" · ")
    : totalLabel;

  return (
    <figure ref={figureRef} className="flex flex-col gap-1.5">
      <figcaption
        className="flex items-baseline justify-between gap-3 px-1 tabular-nums"
        aria-live="polite"
      >
        <span className="text-muted-foreground text-[13px]">{readLabel}</span>
        <span
          className="shrink-0 text-[17px] font-medium"
          style={{ color: scaleColor(level(readValue)) }}
        >
          {ore(readValue)}{" "}
          <span className="text-muted-foreground text-xs font-normal">öre</span>
        </span>
      </figcaption>

      <div
        tabIndex={0}
        role="img"
        aria-label={`Snittpris per ${showPrevious ? "månad" : "dygn"}, från ${ore(min, 0)} till ${ore(max, 0)} öre per kilowattimme. Använd piltangenterna för att bläddra och Esc för att visa snittet.`}
        className="cursor-crosshair touch-none outline-none"
        onPointerDown={handleDown}
        onPointerMove={handleMove}
        onPointerLeave={(e) => e.pointerType === "mouse" && setSelected(null)}
        onKeyDown={handleKey}
      >
        <svg
          viewBox={`0 0 ${W} ${H}`}
          className="text-foreground block w-full overflow-visible"
          aria-hidden="true"
        >
          {/* Stödlinjer i öre */}
          {grid.map((v) => (
            <g key={v}>
              <line
                x1={0}
                x2={W}
                y1={y(v)}
                y2={y(v)}
                stroke="currentColor"
                strokeOpacity={0.07}
              />
              <text
                x={W - 1}
                y={y(v) - 3}
                textAnchor="end"
                fontSize={10}
                fill="currentColor"
                fillOpacity={0.4}
              >
                {v}
              </text>
            </g>
          ))}

          {bars.map((b, i) => {
            const opacity =
              selected === null ? 0.85 : i === selected ? 1 : 0.45;
            return (
              <g key={b.label}>
                {showPrevious && b.previous !== null && (
                  <rect
                    x={center(i) - barWidth / 2 - nudge}
                    y={y(b.previous)}
                    width={barWidth}
                    height={BASE - y(b.previous)}
                    rx={2}
                    fill="currentColor"
                    fillOpacity={0.16}
                  />
                )}
                <rect
                  x={center(i) - barWidth / 2 + nudge}
                  y={y(b.value)}
                  width={barWidth}
                  height={BASE - y(b.value)}
                  rx={2}
                  style={{ fill: scaleColor(level(b.value)) }}
                  fillOpacity={opacity}
                />
              </g>
            );
          })}

          {/* Snittet för hela perioden */}
          <line
            x1={0}
            x2={W}
            y1={y(average)}
            y2={y(average)}
            stroke="currentColor"
            strokeOpacity={0.5}
            strokeWidth={1.2}
            strokeDasharray="4 4"
          />
          <text
            x={2}
            y={y(average) - 5}
            fontSize={10}
            fontWeight={600}
            fill="currentColor"
            fillOpacity={0.7}
          >
            snitt {ore(average, 0)}
          </text>
        </svg>
      </div>

      <div
        className="text-muted-foreground relative h-4 text-[11px] tabular-nums"
        aria-hidden="true"
      >
        {bars.map((b, i) =>
          b.tick ? (
            <span
              key={b.label}
              className="absolute -translate-x-1/2 whitespace-nowrap"
              style={{ left: `${(center(i) / W) * 100}%` }}
            >
              {b.tick}
            </span>
          ) : null,
        )}
      </div>

      {showPrevious && (
        <div className="text-muted-foreground flex gap-3.5 px-1 pt-1 text-[11px]">
          <span className="flex items-center gap-1.5">
            <span
              className="size-2 rounded-xs"
              style={{ background: scaleColor(0.45) }}
            />
            Senaste 12 mån
          </span>
          <span className="flex items-center gap-1.5">
            <span className="bg-foreground/20 size-2 rounded-xs" />
            Året innan
          </span>
        </div>
      )}
    </figure>
  );
}

/** 24 staplar: snittpriset för varje timme under perioden. */
export function DayProfile({ profile }: { profile: number[] }) {
  const min = Math.min(...profile);
  const max = Math.max(...profile);
  const level = (v: number) => (max === min ? 0.5 : (v - min) / (max - min));

  return (
    <svg viewBox="0 0 310 56" className="block w-full" aria-hidden="true">
      {profile.map((v, hour) => {
        const height = 6 + level(v) * 48;
        return (
          <rect
            key={hour}
            x={hour * 12.9 + 1}
            y={56 - height}
            width={10}
            height={height}
            rx={2}
            style={{ fill: scaleColor(level(v)) }}
          />
        );
      })}
    </svg>
  );
}
