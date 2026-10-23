import { ChevronLeft } from "lucide-react";

import { AreaLink } from "@/components/area-link";
import { EvSettingsForm } from "@/components/ev-settings-form";

export const metadata = {
  title: "Inställningar för elbilen · Billigaste timmen",
};

export default function EvSettingsPage() {
  return (
    <main className="mx-auto w-full max-w-md px-5 pt-2 lg:px-8 lg:pt-6">
      <AreaLink
        href="/maskiner/elbil"
        className="text-muted-foreground -ml-1 flex min-h-11 items-center gap-1"
      >
        <ChevronLeft className="size-4" aria-hidden="true" />
        Elbil
      </AreaLink>
      <h1 className="mb-2 font-serif text-[32px] leading-tight font-semibold">
        Inställningar
      </h1>
      <EvSettingsForm />
    </main>
  );
}
