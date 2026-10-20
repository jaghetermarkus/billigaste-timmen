"use client";

import { areaCities, areas, type Area } from "@/lib/domain/area";
import { moodLabels } from "@/lib/domain/mood";
import type { AreaOverview } from "@/lib/prices/fetch-area-overview";
import { ChevronDown } from "lucide-react";
import { useRouter } from "next/navigation";
import { hrefFor, type Day } from "./day-tabs";
import { useId, useRef, useState, useTransition } from "react";
import Link, { useLinkStatus } from "next/link";

// Förenklad Sverigekarta från designen (viewBox 0 0 200 432)
const SWEDEN =
  "M139.6 13.2 L105.8 30.0 L102.9 48.0 L81.8 60.0 L77.6 75.0 L55.0 102.0 L56.4 135.0 L42.3 147.0 L49.4 165.0 L22.6 180.0 L21.1 195.0 L24.0 216.0 L32.4 234.0 L25.4 255.0 L31.0 270.0 L25.4 288.0 L16.9 303.0 L11.3 315.0 L7.0 318.0 L14.1 339.0 L18.3 354.0 L21.1 366.0 L28.2 384.0 L31.0 396.0 L26.8 402.0 L32.4 417.0 L33.8 423.0 L50.8 423.0 L53.6 414.0 L50.8 402.0 L70.5 399.0 L81.8 387.0 L84.6 372.0 L84.6 354.0 L87.4 333.0 L98.7 318.0 L110.0 306.0 L115.6 291.0 L108.6 276.0 L94.5 267.0 L93.1 246.0 L97.3 225.0 L102.9 207.0 L112.8 189.0 L128.3 180.0 L143.8 168.0 L150.9 153.0 L152.3 135.0 L166.4 117.0 L176.3 111.0 L190.4 111.0 L183.3 93.0 L187.5 81.0 L180.5 60.0 L183.3 48.0 L166.4 33.0 L146.6 15.0 Z";

// Varje område är ett band mellan två sneda gränslinjer, och etikettens position
const zones: Record<Area, { band: string; label: [number, number] }> = {
  SE1: { band: "-20,-10 220,-10 220,146.9 -20,69.6", label: [142, 64] },
  SE2: { band: "-20,69.6 220,146.9 220,319.2 -20,219.4", label: [84, 176] },
  SE3: { band: "-20,219.4 220,319.2 220,348.5 -20,384.9", label: [62, 300] },
  SE4: { band: "-20,384.9 220,348.5 220,450 -20,450", label: [56, 398] },
};

const ore = (sek: number | null) =>
  sek === null ? "–" : `${Math.round(sek * 100)} öre`;

type Props = {
  area: Area;
  day: Day;
  overview: AreaOverview[];
};

export function AreaPicker({ area, day, overview }: Props) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const router = useRouter();
  const id = useId().replace(/[^a-zA-Z0-9_-]/g, "");

  const open = () => dialogRef.current?.showModal();
  const close = () => dialogRef.current?.close();
  const [isPending, startTransition] = useTransition();
  const [pendingArea, setPendingArea] = useState<Area | null>(null);

  const pick = (a: Area) => {
    setPendingArea(a);
    startTransition(() => router.push(hrefFor(day, a), { scroll: false }));
  };
  const loadingArea = isPending ? pendingArea : null;

  return (
    <>
      <button
        type="button"
        onClick={open}
        aria-haspopup="dialog"
        className="glass flex items-center gap-1.5 rounded-full py-1.5 pr-2.5 pl-3 text-[13px] font-semibold transition-transform duration-100 active:scale-95"
      >
        {area}
        <ChevronDown
          className="size-3.5"
          strokeWidth={2.6}
          aria-hidden="true"
        />
      </button>

      <dialog
        ref={dialogRef}
        aria-label="Välj elområde"
        onClick={(e) => e.target === e.currentTarget && close()}
        className="mx-auto mt-auto mb-0 w-full max-w-md rounded-t-[28px] border-t border-foreground/10 bg-background text-foreground backdrop:bg-black/50"
      >
        <div className="flex flex-col gap-4 px-5 pt-2.5 pb-8">
          <MoodDot />

          <div className="flex items-start justify-between gap-4">
            <div>
              <h2 className="font-serif text-2xl font-semibold">
                Välj elområde
              </h2>
              <p className="mt-0.5 text-[13px] text-muted-foreground">
                Området står på din elräkning, oftast SE3 eller SE4.
              </p>
            </div>
            <button
              type="button"
              onClick={close}
              className="rounded-full bg-foreground/10 px-3.5 py-2 text-sm font-semibold transition-transform duration-100 active:scale-95"
            >
              Klar
            </button>
          </div>

          <div className="flex items-center gap-3.5">
            <svg
              viewBox="0 0 200 432"
              className="w-[130px] shrink-0"
              aria-hidden="true"
            >
              <defs>
                <clipPath id={`${id}-land`}>
                  <path d={SWEDEN} />
                  <ellipse cx="111.4" cy="361.5" rx="6" ry="13" />
                  <ellipse cx="84.6" cy="384" rx="2.6" ry="13" />
                </clipPath>
                {areas.map((a) => (
                  <clipPath key={a} id={`${id}-${a}`}>
                    <polygon points={zones[a].band} />
                  </clipPath>
                ))}
              </defs>

              <g clipPath={`url(#${id}-land)`}>
                {overview.map((o) => (
                  <rect
                    key={o.area}
                    data-mood={o.mood ?? "vanlig"}
                    x={-20}
                    y={-10}
                    width={240}
                    height={460}
                    clipPath={`url(#${id}-${o.area})`}
                    onClick={() => pick(o.area)}
                    className={`cursor-pointer fill-(--mood-accent) transition-opacity hover:opacity-60 ${
                      o.area === area || o.area === loadingArea
                        ? "opacity-75"
                        : "opacity-20"
                    } ${o.area === loadingArea ? "animate-pulse" : ""}`}
                  />
                ))}
                <path
                  d="M-20 69.6 L220 146.9 M-20 219.4 L220 319.2 M-20 384.9 L220 348.5"
                  className="stroke-background"
                  strokeWidth={1.6}
                  fill="none"
                  pointerEvents="none"
                />
              </g>
              <path
                d={SWEDEN}
                className="stroke-background"
                strokeWidth={1.2}
                strokeLinejoin="round"
                fill="none"
                pointerEvents="none"
              />

              <g pointerEvents="none" textAnchor="middle">
                {overview.map((o) => {
                  const [x, y] = zones[o.area].label;
                  return (
                    <g key={o.area}>
                      <text
                        x={x}
                        y={y}
                        fontSize={15}
                        fontWeight={700}
                        className="fill-foreground"
                      >
                        {o.area}
                      </text>
                      <text
                        x={x}
                        y={y + 16}
                        fontSize={12}
                        className="fill-muted-foreground"
                      >
                        {ore(o.price)}
                      </text>
                    </g>
                  );
                })}
              </g>
            </svg>

            <ul className="flex min-w-0 flex-1 flex-col gap-1.5">
              {overview.map((o) => {
                const selected = o.area === area;
                return (
                  <li key={o.area} data-mood={o.mood ?? "vanlig"}>
                    <Link
                      href={hrefFor(day, o.area)}
                      scroll={false}
                      aria-current={selected ? "true" : undefined}
                      className={`transition-transform duration-100 active:scale-[0.98] flex min-h-14 items-center gap-2.5 rounded-[14px] px-3 py-2 ${
                        selected
                          ? "border border-(--mood-accent) bg-foreground/10"
                          : "glass"
                      }`}
                    >
                      <MoodDot />
                      <span className="flex min-w-0 flex-1 flex-col">
                        <span className="text-sm font-bold">
                          {o.area}{" "}
                          <span className="font-normal text-muted-foreground">
                            · {areaCities[o.area]}
                          </span>
                        </span>
                        <span className="text-xs text-muted-foreground">
                          {o.mood ? moodLabels[o.mood] : "–"}
                        </span>
                      </span>
                      <span className="text-[15px] font-light whitespace-nowrap tabular-nums">
                        {ore(o.price)}
                      </span>
                    </Link>
                  </li>
                );
              })}
            </ul>
          </div>

          <p className="text-[11px] text-muted-foreground">
            {day === "imorgon" ? "Snittpris i morgon" : "Pris just nu"} i
            öre/kWh. Tryck på kartan eller i listan.
          </p>
        </div>
      </dialog>
    </>
  );
}

/** Stämningspricken i en rad. Pulserar medan raden laddar. */
function MoodDot() {
  const { pending } = useLinkStatus();
  return (
    <span
      aria-hidden="true"
      className={`size-2 shrink-0 rounded-full bg-(--mood-accent) shadow-[0_0_8px_var(--mood-accent)] ${
        pending ? "animate-ping" : ""
      }`}
    />
  );
}
