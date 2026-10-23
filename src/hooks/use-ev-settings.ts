"use client";

import { useCallback, useMemo, useSyncExternalStore } from "react";

import { defaultEvSettings, type EvSettings } from "@/lib/domain/ev";
import {
  changedEvSettings,
  evSettingsKey,
  parseEvSettings,
} from "@/lib/domain/ev-settings";

// localStorage meddelar bara andra flikar när något ändras, så vi skickar en egen händelse i samma flik
const changeEvent = "ev-settings-change";

function subscribe(onChange: () => void) {
  window.addEventListener("storage", onChange);
  window.addEventListener(changeEvent, onChange);
  return () => {
    window.removeEventListener("storage", onChange);
    window.removeEventListener(changeEvent, onChange);
  };
}

function read(): string | null {
  try {
    return localStorage.getItem(evSettingsKey);
  } catch {
    return null; // t.ex. privat läge i vissa webbläsare
  }
}

function write(settings: EvSettings) {
  try {
    localStorage.setItem(
      evSettingsKey,
      JSON.stringify(changedEvSettings(settings)),
    );
  } catch {
    // Går det inte att spara gäller ändringen ändå inte. Inget mer att göra.
  }
  window.dispatchEvent(new Event(changeEvent));
}

/** Elbilens inställningar, sparade i webbläsaren och delade mellan sidor och flikar. */
export function useEvSettings() {
  const raw = useSyncExternalStore(subscribe, read, () => null);
  const settings = useMemo(() => parseEvSettings(raw), [raw]);

  const update = useCallback((changes: Partial<EvSettings>) => {
    write({ ...parseEvSettings(read()), ...changes });
  }, []);

  const reset = useCallback(() => write(defaultEvSettings), []);

  return [settings, update, reset] as const;
}
