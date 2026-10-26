"use client";

import { useState } from "react";

import type { EnergyKind } from "@/lib/domain/production";

export type MixItem = {
  kind: EnergyKind;
  name: string;
  mw: number;
  percent: number;
};

const R = 62; // tårtans radie
const C = 2 * Math.PI * R; // omkretsen

const mw = (v: number) => Math.round(v).toLocaleString("sv-SE");
const color = (kind: EnergyKind) => `var(--energy-${kind})`;

/** Kraftslagen som lista eller tårta. Valet sparas bara så länge sidan är öppen. */
export function ProductionMix({
  items,
  total,
}: {
  items: MixItem[];
  total: number;
}) {
  const [view, setView] = useState<"lista" | "tarta">("lista");
  const label = items.map((i) => `${i.name} ${i.percent} %`).join(", ");

  return (
    <section
      className="glass flex flex-col gap-2.5 rounded-[22px] px-3.5 pt-3 pb-1.5"
      aria-labelledby="kraftslag"
    >
      <div className="flex items-center justify-between">
        <h2
          id="kraftslag"
          className="text-muted-foreground text-[11px] font-semibold tracking-[0.14em] uppercase"
        >
          Kraftslag
        </h2>
        <div
          role="group"
          aria-label="Visa som"
          className="bg-foreground/5 border-foreground/10 flex rounded-full border p-0.5"
        >
          {(["lista", "tarta"] as const).map((v) => (
            <button
              key={v}
              type="button"
              aria-pressed={view === v}
              onClick={() => setView(v)}
              className={`min-h-7 rounded-full px-2.5 text-xs font-semibold ${view === v ? "bg-foreground text-background" : "text-muted-foreground"}`}
            >
              {v === "lista" ? "Lista" : "Tårta"}
            </button>
          ))}
        </div>
      </div>

      {view === "lista" ? (
        <div className="flex flex-col gap-2.5">
          <div
            role="img"
            aria-label={label}
            className="flex h-3 gap-0.5 overflow-hidden rounded-full"
          >
            {items.map((i) => (
              <span
                key={i.kind}
                className="min-w-1"
                style={{ flex: `${i.mw} 0 0`, background: color(i.kind) }}
              />
            ))}
          </div>
          <ul className="flex flex-col">
            {items.map((i) => (
              <li
                key={i.kind}
                className="border-foreground/10 flex items-center gap-2.5 border-t px-0.5 py-2.5 tabular-nums"
              >
                <span
                  className="size-2.5 shrink-0 rounded-[3px]"
                  style={{ background: color(i.kind) }}
                />
                <span className="flex-1">{i.name}</span>
                <span>
                  {mw(i.mw)}{" "}
                  <span className="text-muted-foreground text-xs">MW</span>
                </span>
                <span className="text-muted-foreground w-11 text-right text-[13px]">
                  {i.percent} %
                </span>
              </li>
            ))}
          </ul>
        </div>
      ) : (
        <div className="flex items-center gap-4 pt-1 pb-2.5">
          <div className="relative size-[150px] shrink-0">
            <svg
              viewBox="0 0 160 160"
              className="block size-full"
              role="img"
              aria-label={label}
            >
              <circle
                cx={80}
                cy={80}
                r={R}
                fill="none"
                stroke="currentColor"
                strokeOpacity={0.06}
                strokeWidth={26}
              />
              {pieSegments(items).map((s) => (
                <circle
                  key={s.kind}
                  cx={80}
                  cy={80}
                  r={R}
                  fill="none"
                  strokeWidth={26}
                  strokeDasharray={`${s.length} ${C}`}
                  strokeDashoffset={-s.start}
                  transform="rotate(-90 80 80)"
                  style={{ stroke: color(s.kind) }}
                />
              ))}
            </svg>
            <span
              className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center"
              aria-hidden="true"
            >
              <span className="text-[21px] leading-tight font-light tabular-nums">
                {mw(total)}
              </span>
              <span className="text-muted-foreground text-[11px]">MW</span>
            </span>
          </div>
          <ul className="flex min-w-0 flex-1 flex-col gap-2 text-[13px]">
            {items.map((i) => (
              <li key={i.kind} className="flex items-center gap-2">
                <span
                  className="size-[9px] shrink-0 rounded-[3px]"
                  style={{ background: color(i.kind) }}
                />
                <span className="min-w-0 flex-1">{i.name}</span>
                <span className="font-semibold tabular-nums">
                  {i.percent} %
                </span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </section>
  );
}

/**
 * Varje bit i tårtan är en cirkel med en streckad kant: ett streck så långt som andelen,
 * och sedan ett mellanrum resten av varvet. stroke-dashoffset flyttar fram strecket dit
 * förra biten slutade. Två enheter dras av så att det blir en liten glipa mellan bitarna.
 */
function pieSegments(items: MixItem[]) {
  const sum = items.reduce((s, i) => s + i.mw, 0) || 1;
  let start = 0;
  return items.map((i) => {
    const full = (i.mw / sum) * C;
    const segment = { kind: i.kind, start, length: Math.max(0.5, full - 2) };
    start += full;
    return segment;
  });
}
