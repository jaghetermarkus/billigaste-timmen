export const areas = ["SE1", "SE2", "SE3", "SE4"] as const;

export type Area = (typeof areas)[number];

export const areaCities: Record<Area, string> = {
  SE1: "Luleå",
  SE2: "Sundsvall",
  SE3: "Stockholm",
  SE4: "Malmö",
};

export const defaultArea: Area = "SE4";

/** Gör om ?omrade=se3 till "SE3". Okända värden blir SE4. */
export function parseArea(value: string | undefined): Area {
  const upper = value?.toUpperCase();
  return areas.find((a) => a === upper) ?? defaultArea;
}
