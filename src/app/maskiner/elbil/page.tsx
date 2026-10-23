import { AreaLink } from "@/components/area-link";
import { ChevronLeft } from "lucide-react";

export const metadata = { title: "Elbil · Billigaste timmen" };

export default function EvPage() {
  return (
    <main className="mx-auto w-full max-w-md px-5 pt-2 lg:max-w-6xl lg:px-8 lg:pt-6">
      <AreaLink
        href="/maskiner"
        className="text-muted-foreground -ml-1 flex min-h-11 items-center gap-1"
      >
        <ChevronLeft className="size-4" aria-hidden="true" />
        Maskiner
      </AreaLink>
      <h1 className="font-heading text-[32px] font-semibold">Elbil</h1>
    </main>
  );
}
