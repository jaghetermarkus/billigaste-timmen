import { EvCard } from "@/components/ev-card";
import { MachineList } from "@/components/machine-list";
import { areaFromRequest } from "@/lib/area-from-request";
import { fetchUpcoming } from "@/lib/prices/fetch-upcoming";
import { Suspense } from "react";

export const metadata = { title: "Maskiner" };

type SearchParams = Promise<{ omrade?: string }>;

export default function MachinesPage({
  searchParams,
}: {
  searchParams: SearchParams;
}) {
  return (
    <main className="mx-auto w-full max-w-md px-5 pt-2 lg:max-w-2xl lg:px-8 lg:pt-6">
      <h1 className="font-serif text-[34px] leading-tight font-semibold">
        Maskiner
      </h1>
      <p className="text-muted-foreground mt-1 text-[13px]">
        Bästa start de kommande 24 timmarna, uträknat på kvartspriser.
      </p>

      <Suspense
        fallback={<div className="mt-6 h-[118px]" aria-hidden="true" />}
      >
        <Machines searchParams={searchParams} />
      </Suspense>
    </main>
  );
}

async function Machines({ searchParams }: { searchParams: SearchParams }) {
  const { omrade } = await searchParams;
  const upcoming = await fetchUpcoming(await areaFromRequest(omrade));
  if (!upcoming)
    return <p className="mt-6">Kunde inte hämta priserna just nu.</p>;

  return (
    <div
      data-mood={upcoming.mood}
      data-page-mood={upcoming.mood}
      className="mt-6 flex flex-col gap-2.5"
    >
      <EvCard prices={upcoming.prices} />
      <MachineList prices={upcoming.prices} />
      <p className="text-muted-foreground px-1 pt-1 text-xs leading-relaxed">
        Besparingen räknas på maskinens förbrukning per gång och spotpriset med
        moms. Skatt och nätavgift kostar lika mycket oavsett när du kör.
      </p>
    </div>
  );
}
