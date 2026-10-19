import type { getMood } from "@/lib/domain/mood";

type Mood = ReturnType<typeof getMood>;

const labels: Record<Mood, string> = {
  billig: "Billig dag",
  vanlig: "Vanlig dag",
  dyr: "Dyr dag",
};

type Props = {
  mood: Mood;
  dayAverage: number; // SEK/kWh
  referenceAverage: number; // SEK/kWh, 30 dagar
};

export function MoodLine({ mood, dayAverage, referenceAverage }: Props) {
  const diff = Math.round((dayAverage / referenceAverage - 1) * 100);
  const comparison =
    diff === 0
      ? "som snittet"
      : `${Math.abs(diff)} % ${diff < 0 ? "under" : "över"} snittet`;

  return (
    <div className="mt-8">
      <p className="flex items-center gap-2.5 text-xs font-bold uppercase tracking-[0.34em] text-(--mood-accent)">
        <span
          aria-hidden="true"
          className="size-2 rounded-full bg-(--mood-accent) shadow-[0_0_12px_var(--mood-accent)]"
        />
        {labels[mood]}
      </p>
      <p className="mt-1.5 text-sm text-muted-foreground">
        Snitt {(dayAverage * 100).toFixed(1)} öre · {comparison}
      </p>
    </div>
  );
}
