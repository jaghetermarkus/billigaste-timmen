import { Suspense } from "react";

import { areas } from "@/lib/domain/area";
import {
  energyNames,
  latestPoint,
  summarizePoint,
  type ProductionPoint,
} from "@/lib/domain/production";
import { fetchProductionToday } from "@/lib/production/fetch-production";

export const metadata = { title: "Produktion" };

// Tillfällig sida för att se att hämtningen fungerar. Den byts ut i steg 32.
export default function ProductionPage() {
  return (
    <main className="mx-auto w-full max-w-md px-5 pt-6">
      <Suspense fallback={<p>Hämtar produktion…</p>}>
        <ProductionDebug />
      </Suspense>
    </main>
  );
}

async function ProductionDebug() {
  const day = await fetchProductionToday();
  if (!day) return <p>Kunde inte hämta produktionen.</p>;

  const rows: [string, ProductionPoint[]][] = [
    ["Sverige", day.sweden],
    ...areas.map((a) => [a, day.byArea[a]] as [string, ProductionPoint[]]),
  ];
  return (
    <div className="flex flex-col gap-4 text-sm tabular-nums">
      {rows.map(([name, points]) => {
        const latest = latestPoint(points);
        if (!latest) return <p key={name}>{name}: ingen data</p>;
        const s = summarizePoint(latest);
        const time = new Date(latest.time).toLocaleTimeString("sv-SE", {
          timeZone: "Europe/Stockholm",
          hour: "2-digit",
          minute: "2-digit",
        });
        return (
          <section key={name}>
            <h2 className="font-semibold">
              {name} kl {time}: {Math.round(s.total)} MW
            </h2>
            <p>
              {s.shares
                .map(
                  (x) =>
                    `${energyNames[x.kind].name} ${Math.round(x.percent)} %`,
                )
                .join(" · ")}
            </p>
            <p>
              Fossilfritt {Math.round(s.fossilFree)} % ·{" "}
              {s.net === null
                ? "förbrukning saknas"
                : s.net >= 0
                  ? `export ${Math.round(s.net)} MW`
                  : `import ${Math.round(-s.net)} MW`}{" "}
              · {points.length} kvartar
            </p>
          </section>
        );
      })}
    </div>
  );
}
