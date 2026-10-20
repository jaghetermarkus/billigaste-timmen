export type Mood = "billig" | "vanlig" | "dyr";

export const CHEAP_RATIO = 0.8;
export const EXPENSIVE_RATIO = 1.25;

export function getMood(
  dayAverage: number,
  referenceAverage: number | null,
): Mood {
  if (!referenceAverage || referenceAverage <= 0) return "vanlig";

  const ratio = dayAverage / referenceAverage;
  if (ratio < CHEAP_RATIO) return "billig";
  if (ratio > EXPENSIVE_RATIO) return "dyr";
  return "vanlig";
}

export const moodLabels: Record<Mood, string> = {
  billig: "Billig dag",
  vanlig: "Vanlig dag",
  dyr: "Dyr dag",
};
