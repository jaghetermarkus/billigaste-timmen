import Link from "next/link";
import { defaultArea, type Area } from "@/lib/domain/area";

export type Day = "idag" | "imorgon" | "2dagar";

const tabs = [
  { id: "idag", label: "I dag" },
  { id: "imorgon", label: "I morgon" },
  { id: "2dagar", label: "2 dagar" },
] as const;

/** Bygger t.ex. "/?dag=imorgon&omrade=SE3". Standardvärden utelämnas. */
export function hrefFor(day: Day, area: Area) {
  const params = new URLSearchParams();
  if (day !== "idag") params.set("dag", day);
  if (area !== defaultArea) params.set("omrade", area);
  const query = params.toString();
  return query ? `/?${query}` : "/";
}

type Props = {
  day: Day;
  area?: Area;
  /** false före ca 13:00, då morgondagens priser inte är publicerade */
  tomorrowAvailable?: boolean;
};

export function DayTabs({
  day,
  area = defaultArea,
  tomorrowAvailable = true,
}: Props) {
  return (
    <nav
      aria-label="Välj dag"
      className="glass inline-flex gap-0.5 rounded-full p-1"
    >
      {tabs.map((tab) => {
        const active = day === tab.id;
        const base =
          "rounded-full px-3.5 py-1.5 text-[13px] font-medium transition-colors";

        if (tab.id === "imorgon" && !tomorrowAvailable && !active) {
          return (
            <span
              key={tab.id}
              aria-disabled="true"
              title="Morgondagens priser kommer runt 13:00"
              className={`${base} cursor-not-allowed text-muted-foreground opacity-40`}
            >
              {tab.label}
            </span>
          );
        }

        return (
          <Link
            key={tab.id}
            href={hrefFor(tab.id, area)}
            aria-current={active ? "page" : undefined}
            className={`${base} ${
              active
                ? "bg-foreground/10 text-foreground"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            {tab.label}
          </Link>
        );
      })}
    </nav>
  );
}
