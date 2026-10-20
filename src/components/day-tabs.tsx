import Link from "next/link";

export type Day = "idag" | "imorgon" | "2dagar";

const tabs = [
  { id: "idag", label: "I dag", href: "/" },
  { id: "imorgon", label: "I morgon", href: "/?dag=imorgon" },
  { id: "2dagar", label: "2 dagar", href: "/?dag=2dagar" },
] as const;

type Props = {
  day: Day;
  /** false före ca 13:00, då morgondagens priser inte är publicerade */
  tomorrowAvailable?: boolean;
};

export function DayTabs({ day, tomorrowAvailable = true }: Props) {
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
            href={tab.href}
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
