import { AreaLink } from "@/components/area-link";
import { EvPlanner } from "@/components/ev-planner";
import { areaCities } from "@/lib/domain/area";
import { ChevronLeft, SlidersHorizontal } from "lucide-react";
import { Suspense } from "react";

import { areaFromRequest } from "@/lib/area-from-request";
import { fetchUpcoming } from "@/lib/prices/fetch-upcoming";

export const metadata = { title: "Elbil – kostnad per mil just nu" };

type SearchParams = Promise<{ omrade?: string }>;

export default function EvPage({
  searchParams,
}: {
  searchParams: SearchParams;
}) {
  return (
    <main className="mx-auto w-full max-w-md px-5 pt-2 lg:max-w-6xl lg:px-8 lg:pt-6">
      <AreaLink
        href="/maskiner"
        className="text-muted-foreground -ml-1 flex min-h-11 items-center gap-1"
      >
        <ChevronLeft className="size-4" aria-hidden="true" />
        Maskiner
      </AreaLink>
      <div className="flex items-center justify-between">
        <h1 className="font-serif text-[32px] leading-tight font-semibold">
          Elbil
        </h1>
        <AreaLink
          href="/maskiner/elbil/installningar"
          aria-label="Inställningar för elbilen"
          className="glass grid size-10 place-items-center rounded-full"
        >
          <SlidersHorizontal className="size-4" aria-hidden="true" />
        </AreaLink>
      </div>

      <Suspense
        fallback={<p className="text-muted-foreground mt-2">Hämtar priser…</p>}
      >
        <EvPrices searchParams={searchParams} />
      </Suspense>
    </main>
  );
}

async function EvPrices({ searchParams }: { searchParams: SearchParams }) {
  const { omrade } = await searchParams;
  const area = await areaFromRequest(omrade);
  const upcoming = await fetchUpcoming(area);
  if (!upcoming)
    return <p className="mt-2">Kunde inte hämta priserna just nu.</p>;

  return (
    <div data-mood={upcoming.mood} data-page-mood={upcoming.mood}>
      <EvPlanner prices={upcoming.prices} />
      <p className="text-muted-foreground mt-4 text-xs">
        Spotpris för {area} · {areaCities[area]}
      </p>
    </div>
  );
}
