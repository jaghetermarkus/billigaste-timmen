"use client";

import { useState } from "react";
import { defaultEvSettings, type EvSettings } from "@/lib/domain/ev";

/** Elbilens inställningar. Än så länge bara i minnet; i steg 21 sparas de i localStorage. */
export function useEvSettings() {
  const [settings, setSettings] = useState<EvSettings>(defaultEvSettings);

  const update = (changes: Partial<EvSettings>) =>
    setSettings((current) => ({ ...current, ...changes }));

  return [settings, update] as const;
}
