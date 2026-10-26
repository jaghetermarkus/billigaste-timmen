"use client";

import { useState, useSyncExternalStore } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";

import { areaCities, areas, type Area } from "@/lib/domain/area";
import {
  energyKinds,
  energyNames,
  productionStory,
  roundPercents,
  summarizePoint,
  type EnergyKind,
  type ProductionPoint,
} from "@/lib/domain/production";

type Props = {
  /** Samma kvart i alla fyra områdena */
  now: Record<Area, ProductionPoint>;
  /** Summan för hela Sverige vid samma kvart */
  sweden: ProductionPoint;
  /** Området i adressen (?visa=), eller null för hela Sverige */
  selected: Area | null;
};

// Kartan är ritad i en ruta som är 350 × 440. Allt nedan är i de enheterna.
const W = 350;
const H = 440;

const outline =
  "M139.6 13.2 L105.8 30.0 L102.9 48.0 L81.8 60.0 L77.6 75.0 L55.0 102.0 L56.4 135.0 L42.3 147.0 L49.4 165.0 L22.6 180.0 L21.1 195.0 L24.0 216.0 L32.4 234.0 L25.4 255.0 L31.0 270.0 L25.4 288.0 L16.9 303.0 L11.3 315.0 L7.0 318.0 L14.1 339.0 L18.3 354.0 L21.1 366.0 L28.2 384.0 L31.0 396.0 L26.8 402.0 L32.4 417.0 L33.8 423.0 L50.8 423.0 L53.6 414.0 L50.8 402.0 L70.5 399.0 L81.8 387.0 L84.6 372.0 L84.6 354.0 L87.4 333.0 L98.7 318.0 L110.0 306.0 L115.6 291.0 L108.6 276.0 L94.5 267.0 L93.1 246.0 L97.3 225.0 L102.9 207.0 L112.8 189.0 L128.3 180.0 L143.8 168.0 L150.9 153.0 L152.3 135.0 L166.4 117.0 L176.3 111.0 L190.4 111.0 L183.3 93.0 L187.5 81.0 L180.5 60.0 L183.3 48.0 L166.4 33.0 L146.6 15.0 Z";

/** Gränserna mellan områdena är raka linjer. Varje område är en fyrhörning som klipps mot landet. */
const zones: Record<Area, string> = {
  SE1: "-20,-10 220,-10 220,146.9 -20,69.6",
  SE2: "-20,69.6 220,146.9 220,319.2 -20,219.4",
  SE3: "-20,219.4 220,319.2 220,348.5 -20,384.9",
  SE4: "-20,384.9 220,348.5 220,450 -20,450",
};

/** Var ikonerna står: område, x, y och hur många sekunder ett varv eller gupp tar. */
const icons: Record<EnergyKind, [Area, number, number, number][]> = {
  vatten: [
    ["SE1", 118, 72, 2.4],
    ["SE1", 100, 98, 3.1],
    ["SE1", 140, 92, 2.7],
    ["SE2", 70, 142, 2.9],
    ["SE2", 98, 178, 2.5],
    ["SE2", 62, 205, 3.3],
  ],
  vind: [
    ["SE1", 165, 100, 4],
    ["SE2", 118, 160, 3.4],
    ["SE2", 44, 182, 4.6],
    ["SE3", 46, 292, 3.8],
    ["SE4", 64, 386, 3.2],
  ],
  karn: [
    ["SE3", 100, 282, 9],
    ["SE3", 80, 348, 9],
    ["SE3", 24, 350, 9],
  ],
  sol: [
    ["SE3", 62, 268, 2.6],
    ["SE4", 46, 412, 2.6],
  ],
  varme: [
    ["SE3", 78, 312, 1.4],
    ["SE4", 38, 398, 1.4],
  ],
};

/** Rutorna till höger: hur högt de står, och var linjen till området börjar. */
const callouts: Record<Area, { top: number; anchor: [number, number] }> = {
  SE1: { top: 52, anchor: [150, 95] },
  SE2: { top: 158, anchor: [105, 190] },
  SE3: { top: 262, anchor: [82, 318] },
  SE4: { top: 362, anchor: [62, 400] },
};
const CALLOUT_X = 214;
const CALLOUT_W = 134;
const CALLOUT_H = 62;

/** Under så här många MW visas inte kraftslagets ikoner i området, till exempel solen på natten. */
const ICON_MIN_MW = 10;

const mw = (v: number) => Math.round(v).toLocaleString("sv-SE");
const color = (kind: EnergyKind) => `var(--energy-${kind})`;
const pct = (v: number, of: number) => `${(v / of) * 100}%`;

export function ProductionMap({ now, sweden, selected }: Props) {
  const [area, setArea] = useState<Area | null>(selected);
  const [focus, setFocus] = useState<EnergyKind | null>(null);
  const reducedMotion = usePrefersReducedMotion();
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const totals = Object.fromEntries(
    areas.map((a) => [a, summarizePoint(now[a]).total]),
  ) as Record<Area, number>;
  const swedenSummary = summarizePoint(sweden);
  const chipPercents = roundPercents(
    energyKinds.map((k) => (sweden.mix[k] / (swedenSummary.total || 1)) * 100),
  );

  /** Byter område direkt på skärmen, och sedan i adressen så att Översikt visar samma område. */
  function pick(next: Area) {
    const value = area === next ? null : next;
    setArea(value);
    const params = new URLSearchParams(searchParams.toString());
    if (value) params.set("visa", value);
    else params.delete("visa");
    router.replace(`${pathname}?${params.toString()}`, { scroll: false });
  }

  const card = area ? now[area] : sweden;
  const cardSummary = summarizePoint(card);

  return (
    <div className="flex flex-col gap-3">
      <div
        className="relative mx-auto w-full max-w-[400px]"
        style={{ aspectRatio: `${W} / ${H}` }}
      >
        <svg
          viewBox={`0 0 ${W} ${H}`}
          className="block size-full overflow-visible"
          role="img"
          aria-label={mapLabel(totals)}
        >
          <defs>
            <clipPath id="karta-land">
              <path d={outline} />
              {/* Öland och Gotland */}
              <ellipse cx="111.4" cy="361.5" rx="6" ry="13" />
              <ellipse cx="84.6" cy="384" rx="2.6" ry="13" />
            </clipPath>
            {areas.map((a) => (
              <clipPath key={a} id={`karta-${a}`}>
                <polygon points={zones[a]} />
              </clipPath>
            ))}
          </defs>

          <g clipPath="url(#karta-land)">
            {areas.map((a) => (
              <rect
                key={a}
                x="-20"
                y="-10"
                width="240"
                height="460"
                clipPath={`url(#karta-${a})`}
                className="cursor-pointer transition-[fill-opacity] duration-200"
                style={{ fill: "var(--energy-vatten)" }}
                fillOpacity={zoneOpacity(a, area, focus, now, sweden)}
                onClick={() => pick(a)}
              />
            ))}
            <path
              d="M-20 69.6 L220 146.9 M-20 219.4 L220 319.2 M-20 384.9 L220 348.5"
              stroke="var(--background)"
              strokeWidth={2}
              fill="none"
              pointerEvents="none"
            />
          </g>
          <path
            d={outline}
            fill="none"
            stroke="currentColor"
            strokeOpacity={0.22}
            strokeLinejoin="round"
            pointerEvents="none"
          />

          <g pointerEvents="none">
            {energyKinds.map((kind) => (
              <g
                key={kind}
                className="transition-opacity duration-300"
                opacity={focus === null || focus === kind ? 1 : 0.12}
              >
                {icons[kind]
                  .filter(([a]) => now[a].mix[kind] >= ICON_MIN_MW)
                  .map(([a, x, y, seconds], i) => (
                    <g key={`${a}-${i}`} transform={`translate(${x} ${y})`}>
                      <EnergyIcon
                        kind={kind}
                        seconds={seconds}
                        still={reducedMotion}
                      />
                    </g>
                  ))}
              </g>
            ))}
          </g>

          {areas.map((a) => {
            const [x, y] = callouts[a].anchor;
            return (
              <path
                key={a}
                d={`M${x} ${y} L${CALLOUT_X} ${callouts[a].top + CALLOUT_H / 2}`}
                stroke="currentColor"
                strokeOpacity={0.25}
                strokeDasharray="2 3"
                fill="none"
              />
            );
          })}
        </svg>

        {/* Text och knappar ligger i HTML ovanpå kartan. Procent av rutan gör att de följer med när kartan skalas. */}
        <span
          className="text-muted-foreground absolute text-[10px] font-semibold tracking-[0.14em] whitespace-nowrap uppercase"
          style={{ left: pct(CALLOUT_X + 2, W), top: pct(30, H) }}
        >
          {focus ? energyNames[focus].name : "Produktion"}
        </span>
        {areas.map((a) => (
          <AreaCallout
            key={a}
            area={a}
            point={now[a]}
            total={totals[a]}
            focus={focus}
            active={area === a}
            onPick={() => pick(a)}
          />
        ))}
      </div>

      <div
        role="group"
        aria-label="Kraftslag"
        className="flex flex-wrap gap-1.5"
      >
        {energyKinds.map((kind, i) => {
          const on = focus === kind;
          return (
            <button
              key={kind}
              type="button"
              aria-pressed={on}
              onClick={() => setFocus(on ? null : kind)}
              className={`flex min-h-[34px] items-center gap-1.5 rounded-full border py-1.5 pr-3 pl-2.5 text-[13px] font-semibold transition-opacity ${
                on ? "bg-foreground/15" : "glass border-foreground/10"
              } ${focus === null || on ? "" : "opacity-60"}`}
              style={on ? { borderColor: color(kind) } : undefined}
            >
              <span
                className="size-[9px] rounded-full"
                style={{
                  background: color(kind),
                  boxShadow: `0 0 8px ${color(kind)}`,
                }}
              />
              {energyNames[kind].name}
              <span className="text-muted-foreground font-normal tabular-nums">
                {chipPercents[i]} %
              </span>
            </button>
          );
        })}
      </div>

      <section
        className="glass flex flex-col gap-2.5 rounded-[22px] px-4 py-3.5"
        aria-live="polite"
      >
        <div className="flex items-baseline justify-between gap-2">
          <h2 className="font-serif text-xl font-semibold">
            {area ? `${area} · ${areaCities[area]}` : "Hela Sverige"}
          </h2>
          {cardSummary.net !== null && (
            <span
              className={`text-[13px] font-bold ${cardSummary.net >= 0 ? "text-(--scale-0)" : "text-(--scale-3)"}`}
            >
              {cardSummary.net >= 0 ? "Export" : "Import"}{" "}
              {mw(Math.abs(cardSummary.net))} MW
            </span>
          )}
        </div>
        <p className="text-foreground/80 text-sm leading-relaxed">
          {productionStory(cardSummary)}
        </p>
        <MixBar point={card} className="h-2.5 gap-0.5 rounded-full" />
      </section>
    </div>
  );
}

function AreaCallout({
  area,
  point,
  total,
  focus,
  active,
  onPick,
}: {
  area: Area;
  point: ProductionPoint;
  total: number;
  focus: EnergyKind | null;
  active: boolean;
  onPick: () => void;
}) {
  const value = focus ? point.mix[focus] : total;
  const net = point.consumption === null ? null : total - point.consumption;
  return (
    <button
      type="button"
      aria-pressed={active}
      onClick={onPick}
      className={`absolute flex flex-col justify-center gap-[3px] rounded-[14px] border px-[11px] text-left transition-colors ${
        active
          ? "border-(--energy-vatten)/70 bg-(--energy-vatten)/15"
          : "glass border-foreground/10"
      }`}
      style={{
        left: pct(CALLOUT_X, W),
        top: pct(callouts[area].top, H),
        width: pct(CALLOUT_W, W),
        height: pct(CALLOUT_H, H),
      }}
    >
      <span className="flex w-full items-baseline justify-between gap-1.5 text-xs leading-tight font-bold whitespace-nowrap">
        <span className="truncate">
          {area}{" "}
          <span className="text-muted-foreground font-normal">
            {areaCities[area]}
          </span>
        </span>
        {net !== null && (
          <span className={net >= 0 ? "text-(--scale-0)" : "text-(--scale-3)"}>
            <span aria-hidden="true">{net >= 0 ? "↑" : "↓"}</span>
            <span className="sr-only">
              {net >= 0 ? "exporterar" : "importerar"}
            </span>
          </span>
        )}
      </span>
      <span className="text-[17px] leading-tight font-light whitespace-nowrap tabular-nums">
        {mw(value)}{" "}
        <span className="text-muted-foreground text-[10px]">MW</span>
      </span>
      <MixBar
        point={point}
        className="mt-0.5 h-[7px] gap-[1.5px] rounded-[2px]"
      />
    </button>
  );
}

/** En stapel med kraftslagen i proportion, störst först. */
function MixBar({
  point,
  className,
}: {
  point: ProductionPoint;
  className: string;
}) {
  const kinds = energyKinds
    .filter((k) => point.mix[k] > 0)
    .sort((a, b) => point.mix[b] - point.mix[a]);
  return (
    <span
      className={`flex w-full overflow-hidden ${className}`}
      aria-hidden="true"
    >
      {kinds.map((k) => (
        <span
          key={k}
          style={{ flex: `${point.mix[k]} 0 0`, background: color(k) }}
        />
      ))}
    </span>
  );
}

/**
 * Hur starkt ett område är färgat. Utan valt kraftslag är alla lika ljusa. Med ett kraftslag valt
 * blir områden som står för en stor del av det kraftslaget ljusare. Valt område lyser mest.
 */
function zoneOpacity(
  a: Area,
  area: Area | null,
  focus: EnergyKind | null,
  now: Record<Area, ProductionPoint>,
  sweden: ProductionPoint,
) {
  if (area === a) return 0.42;
  const share =
    focus === null ? 0.4 : now[a].mix[focus] / Math.max(1, sweden.mix[focus]);
  return 0.1 + Math.min(0.22, share * 0.25);
}

function mapLabel(totals: Record<Area, number>) {
  return `Karta över Sveriges elproduktion per elområde. ${areas.map((a) => `${a} ${mw(totals[a])} megawatt`).join(", ")}.`;
}

/** Små animerade ikoner. Med "minska rörelse" i systemet står de still. */
function EnergyIcon({
  kind,
  seconds,
  still,
}: {
  kind: EnergyKind;
  seconds: number;
  still: boolean;
}) {
  const dur = `${seconds}s`;
  switch (kind) {
    case "vatten":
      return (
        <g>
          {!still && (
            <animateTransform
              attributeName="transform"
              type="translate"
              values="0 0;0 -2;0 0"
              dur={dur}
              repeatCount="indefinite"
            />
          )}
          <path
            d="M0 -8 C4 -3 6 0 6 3 A6 6 0 0 1 -6 3 C-6 0 -4 -3 0 -8 Z"
            style={{ fill: color(kind) }}
          />
          <path
            d="M-2.5 2.5 A3 3 0 0 0 0 5.5"
            stroke="white"
            strokeOpacity={0.7}
            strokeWidth={1.2}
            fill="none"
            strokeLinecap="round"
          />
        </g>
      );
    case "vind":
      return (
        <g style={{ fill: color(kind), stroke: color(kind) }}>
          <line
            x1="0"
            y1="0"
            x2="0"
            y2="14"
            strokeWidth={1.6}
            strokeLinecap="round"
          />
          <g stroke="none">
            {!still && (
              <animateTransform
                attributeName="transform"
                type="rotate"
                from="0"
                to="360"
                dur={dur}
                repeatCount="indefinite"
              />
            )}
            {[0, 120, 240].map((r) => (
              <path
                key={r}
                d="M0 0 L-1.4 -9 Q0 -11 1.4 -9 Z"
                transform={`rotate(${r})`}
              />
            ))}
          </g>
          <circle r="1.8" fill="white" stroke="none" />
        </g>
      );
    case "karn":
      return (
        <g style={{ stroke: color(kind) }} fill="none">
          <circle
            r="9"
            style={{ fill: color(kind) }}
            stroke="none"
            opacity={0.25}
          />
          <g strokeWidth={1.2}>
            {!still && (
              <animateTransform
                attributeName="transform"
                type="rotate"
                from="0"
                to="360"
                dur={dur}
                repeatCount="indefinite"
              />
            )}
            {[0, 60, 120].map((r) => (
              <ellipse key={r} rx="8" ry="3" transform={`rotate(${r})`} />
            ))}
          </g>
          <circle r="2" fill="white" stroke="none" />
        </g>
      );
    case "sol":
      return (
        <g>
          <g
            style={{ stroke: color(kind) }}
            strokeWidth={1.4}
            strokeLinecap="round"
          >
            {!still && (
              <animate
                attributeName="opacity"
                values="1;0.35;1"
                dur={dur}
                repeatCount="indefinite"
              />
            )}
            <path d="M0 -9V-7 M0 7V9 M-9 0H-7 M7 0H9 M-6.4 -6.4L-5 -5 M5 5L6.4 6.4 M-6.4 6.4L-5 5 M5 -5L6.4 -6.4" />
          </g>
          <circle r="4.6" style={{ fill: color(kind) }} />
        </g>
      );
    case "varme":
      return (
        <path
          d="M0 -8 C3 -4 5 -2 5 2 A5 5 0 0 1 -5 2 C-5 -1 -3 -2 -2 -5 C-1 -3 0 -3 0 -8 Z"
          style={{ fill: color(kind) }}
        >
          {!still && (
            <animateTransform
              attributeName="transform"
              type="scale"
              values="1 1;1 1.08;1 1"
              dur={dur}
              repeatCount="indefinite"
            />
          )}
        </path>
      );
  }
}

const motionQuery = "(prefers-reduced-motion: reduce)";

/** true om användaren har valt "minska rörelse". På servern antar vi att rörelse är okej. */
function usePrefersReducedMotion() {
  return useSyncExternalStore(
    (onChange) => {
      const media = window.matchMedia(motionQuery);
      media.addEventListener("change", onChange);
      return () => media.removeEventListener("change", onChange);
    },
    () => window.matchMedia(motionQuery).matches,
    () => false,
  );
}
