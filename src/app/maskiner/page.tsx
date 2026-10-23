import { AreaLink } from "@/components/area-link";

export const metadata = { title: "Maskiner · Billigaste timmen" };

export default function MachinesPage() {
  return (
    <main className="mx-auto w-full max-w-md px-5 pt-2 lg:max-w-6xl lg:px-8 lg:pt-6">
      <h1 className="font-serif text-[34px] font-semibold">Maskiner</h1>
      <p className="text-muted-foreground mt-1 text-sm">
        Bästa start de kommande 24 timmarna.
      </p>

      <AreaLink
        href="/maskiner/elbil"
        className="glass mt-6 block rounded-[20px] px-4 py-3.5 font-semibold"
      >
        Elbil
      </AreaLink>
    </main>
  );
}
