"use client";

import { useState, type KeyboardEvent, type PointerEvent } from "react";

import { useElementWidth } from "@/hooks/use-element-width";
import type { EnergyKind, ProductionPoint } from "@/lib/domain/production";

type Props = {
  points: ProductionPoint[];
  /** Dygnets start och slut i millisekunder, så att x-axeln alltid är hela dygnet */
  dayStart: number;
  dayEnd: number;
};

/** Ordningen i högen, nerifrån och upp: jämna kraftslag längst ner, väderberoende överst. */
const stackOrder: EnergyKind[] = ["karn", "vatten", "varme", "vind", "sol"];

const TOP = 8; // luft ovanför toppen
const mw = (v: number) => Math.round(v).toLocaleString("sv-SE");
const clock = (t: number) =>
  new Date(t).toLocaleTimeString("sv-SE", {
    timeZone: "Europe/Stockholm",
    hour: "2-digit",
    minute: "2-digit",
  });
const total = (p: ProductionPoint) =>
  stackOrder.reduce((sum, kind) => sum + p.mix[kind], 0);

/** Stödlinjer i jämna steg, högst fyra stycken. */
function gridStep(top: number) {
  return (
    [500, 1000, 2000, 5000, 10000].find((step) => top / step <= 4) ?? 20000
  );
}

export function ProductionChart({ points, dayStart, dayEnd }: Props) {
  const [selected, setSelected] = useState<number | null>(null);
  const [figureRef, measured] = useElementWidth<HTMLElement>(334);

  if (points.length === 0) return null;

  const W = Math.max(measured, 200);
  const H = Math.round(W * 0.45);
  const BASE = H - 1.5;

  const top =
    Math.max(...points.map((p) => Math.max(total(p), p.consumption ?? 0))) *
    1.08;
  const x = (t: number) => ((t - dayStart) / (dayEnd - dayStart)) * W;
  const y = (v: number) => BASE - (v / top) * (BASE - TOP);

  // En yta per kraftslag: övre kanten är summan hittills plus kraftslaget, undre kanten summan hittills
  const below = points.map(() => 0);
  const layers = stackOrder.flatMap((kind) => {
    const lower = [...below];
    points.forEach((p, i) => (below[i] += p.mix[kind]));
    if (points.every((p) => p.mix[kind] < 0.5)) return [];
    const upperLine = points.map(
      (p, i) => `${x(p.time).toFixed(1)} ${y(below[i]).toFixed(1)}`,
    );
    const lowerLine = points
      .map((p, i) => `${x(p.time).toFixed(1)} ${y(lower[i]).toFixed(1)}`)
      .reverse();
    return [{ kind, d: `M${upperLine.join(" L")} L${lowerLine.join(" L")} Z` }];
  });

  // Förbrukningen som streckad linje. Kvartar utan förbrukning ger ett avbrott.
  const consumptionPath = points
    .map((p, i) => {
      if (p.consumption === null) return "";
      const command = i > 0 && points[i - 1].consumption !== null ? "L" : "M";
      return `${command}${x(p.time).toFixed(1)} ${y(p.consumption).toFixed(1)}`;
    })
    .join(" ");

  const step = gridStep(top);
  const grid = Array.from(
    { length: Math.floor(top / step) },
    (_, k) => (k + 1) * step,
  ).filter((v) => v < top);
  const gridLabel = (v: number) =>
    v >= 1000 ? `${(v / 1000).toLocaleString("sv-SE")} GW` : `${v} MW`;

  /** Kvarten under pekaren */
  function indexAt(e: PointerEvent<HTMLDivElement>) {
    const rect = e.currentTarget.getBoundingClientRect();
    const t =
      dayStart + ((e.clientX - rect.left) / rect.width) * (dayEnd - dayStart);
    const i = points.findIndex((p) => p.time > t);
    return i === -1 ? points.length - 1 : Math.max(0, i - 1);
  }

  function handleKey(e: KeyboardEvent<HTMLDivElement>) {
    const last = points.length - 1;
    if (e.key === "ArrowRight")
      setSelected((i) => Math.min(last, (i ?? last) + 1));
    if (e.key === "ArrowLeft") setSelected((i) => Math.max(0, (i ?? last) - 1));
    if (e.key === "Escape") setSelected(null);
  }

  // Avläsningen: vald kvart, annars den senaste
  const shown = points[selected ?? points.length - 1];
  const markerX = x(shown.time);

  return (
    <figure ref={figureRef} className="flex flex-col gap-1.5">
      <figcaption
        className="flex items-baseline justify-between gap-3 px-1 tabular-nums"
        aria-live="polite"
      >
        <span className="text-muted-foreground text-[13px]">
          {selected === null ? "Senaste" : "Kl"} {clock(shown.time)}
          {shown.consumption !== null &&
            ` · förbrukning ${mw(shown.consumption)} MW`}
        </span>
        <span className="shrink-0 text-[17px] font-medium">
          {mw(total(shown))}{" "}
          <span className="text-muted-foreground text-xs font-normal">MW</span>
        </span>
      </figcaption>

      <div
        tabIndex={0}
        role="img"
        aria-label={`Produktion per kraftslag från midnatt till ${clock(points.at(-1)!.time)}. Använd piltangenterna för att bläddra.`}
        className="cursor-crosshair touch-none outline-none"
        onPointerDown={(e) => setSelected(indexAt(e))}
        onPointerMove={(e) => setSelected(indexAt(e))}
        onPointerLeave={(e) => e.pointerType === "mouse" && setSelected(null)}
        onKeyDown={handleKey}
      >
        <svg
          viewBox={`0 0 ${W} ${H}`}
          className="text-foreground block w-full overflow-visible"
          aria-hidden="true"
        >
          {layers.map((l) => (
            <path
              key={l.kind}
              d={l.d}
              fillOpacity={0.85}
              style={{ fill: `var(--energy-${l.kind})` }}
            />
          ))}

          {/* Stödlinjerna ritas ovanpå ytorna, så att siffrorna syns även där ytan är hög */}
          {grid.map((v) => (
            <g key={v}>
              <line
                x1={0}
                x2={W}
                y1={y(v)}
                y2={y(v)}
                stroke="currentColor"
                strokeOpacity={0.12}
              />
              <text
                x={W - 2}
                y={y(v) - 3}
                textAnchor="end"
                fontSize={10}
                fontWeight={600}
                fill="currentColor"
                fillOpacity={0.75}
              >
                {gridLabel(v)}
              </text>
            </g>
          ))}

          <path
            d={consumptionPath}
            fill="none"
            stroke="currentColor"
            strokeOpacity={0.6}
            strokeWidth={1.5}
            strokeDasharray="3 3"
          />
          <line
            x1={markerX}
            x2={markerX}
            y1={TOP}
            y2={BASE}
            stroke="currentColor"
            strokeOpacity={0.35}
          />
        </svg>
      </div>

      <div
        className="text-muted-foreground flex justify-between px-0.5 text-[11px] tabular-nums"
        aria-hidden="true"
      >
        <span>00</span>
        <span>06</span>
        <span>12</span>
        <span>18</span>
        <span>24</span>
      </div>
    </figure>
  );
}
