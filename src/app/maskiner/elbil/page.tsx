import { AreaLink } from "@/components/area-link";
import { EvPlanner } from "@/components/ev-planner";
import { areaCities, areaCookie, parseArea } from "@/lib/domain/area";
import { getDayStats } from "@/lib/domain/day-stats";
import { getMood } from "@/lib/domain/mood";
import { fetchPrices } from "@/lib/prices/fetch-prices";
import { fetchReferenceAverage } from "@/lib/prices/fetch-reference-average";
import { TZDate } from "@date-fns/tz";
import { addDays, format } from "date-fns";
import { ChevronLeft, SlidersHorizontal } from "lucide-react";
import { cookies } from "next/headers";
import { connection } from "next/server";
import { Suspense } from "react";

export const metadata = { title: "Elbil · Billigaste timmen" };

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
  const cookieStore = await cookies();
  const area = parseArea(omrade ?? cookieStore.get(areaCookie)?.value);

  await connection();
  const now = new TZDate(new Date(), "Europe/Stockholm");
  const get = (date: Date) =>
    fetchPrices(format(date, "yyyy/MM-dd"), area).catch(() => null);

  const [today, tomorrow] = await Promise.all([get(now), get(addDays(now, 1))]);
  if (!today) return <p className="mt-2">Kunde inte hämta priserna just nu.</p>;

  const reference = await fetchReferenceAverage(
    format(now, "yyyy/MM-dd"),
    area,
  );
  const mood = getMood(getDayStats(today).average, reference);

  return (
    <div data-mood={mood} data-page-mood={mood}>
      <EvPlanner prices={[...today, ...(tomorrow ?? [])]} />
      <p className="text-muted-foreground mt-4 text-xs">
        Spotpris för {area} · {areaCities[area]}
      </p>
    </div>
  );
}
