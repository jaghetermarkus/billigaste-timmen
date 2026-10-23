import { z } from "zod";
import { defaultEvSettings, fuelDefaults, type EvSettings } from "./ev";

/** Nyckeln i localStorage */
export const evSettingsKey = "elbil";

const time = /^([01]\d|2[0-3]):[0-5]\d$/;

/** Rimliga gränser. Allt utanför räknas som trasigt och ger standardvärdena. */
export const evSettingsSchema = z.object({
  kwhPerMil: z.number().min(0.5).max(5),
  batteryKwh: z.number().min(10).max(250),
  fromPercent: z.number().min(0).max(100),
  toPercent: z.number().min(1).max(100),
  chargerKw: z.number().min(1).max(50),
  readyBy: z.string().regex(time),
  feeOrePerKwh: z.number().min(0).max(500),
  lossPercent: z.number().min(0).max(40),
  fuel: z.enum(["bensin", "diesel"]),
  litersPerMil: z.number().min(0.1).max(3),
  fuelSekPerLiter: z.number().min(1).max(60),
});

/**
 * Gör om det som ligger i localStorage till inställningar.
 * Saknas något fält används standardvärdet för just det fältet.
 */
export function parseEvSettings(raw: string | null): EvSettings {
  if (!raw) return defaultEvSettings;

  let json: unknown;
  try {
    json = JSON.parse(raw);
  } catch {
    return defaultEvSettings;
  }

  const result = evSettingsSchema.partial().safeParse(json);
  if (!result.success) return defaultEvSettings;

  // Literpris och förbrukning hämtas från rätt bränsle om man inte har egna
  const fuel = result.data.fuel ?? defaultEvSettings.fuel;
  const settings = {
    ...defaultEvSettings,
    ...fuelDefaults[fuel],
    ...result.data,
  };
  if (settings.fromPercent >= settings.toPercent) {
    // Bara de två fälten är fel, så resten får vara kvar
    return {
      ...settings,
      fromPercent: defaultEvSettings.fromPercent,
      toPercent: defaultEvSettings.toPercent,
    };
  }
  return settings;
}

/** Bara det som skiljer sig från standard, så att nya standardvärden slår igenom. */
export function changedEvSettings(settings: EvSettings): Partial<EvSettings> {
  const defaults = { ...defaultEvSettings, ...fuelDefaults[settings.fuel] };
  return Object.fromEntries(
    Object.entries(settings).filter(
      ([key, value]) => defaults[key as keyof EvSettings] !== value,
    ),
  ) as Partial<EvSettings>;
}
