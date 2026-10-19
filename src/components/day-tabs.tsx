import Link from "next/link";

export type Day = "idag" | "imorgon" | "2dagar";

const tabs = [
  { id: "idag", label: "Idag", href: "/" },
  { id: "imorgon", label: "Imorgon", href: "/?dag=imorgon" },
  { id: "2dagar", label: "2 dagar", href: "/?dag=2dagar" },
] as const;

export function DayTabs({ day }: { day: Day }) {
  return (
    <nav
      aria-label="Välj dag"
      className="inline-flex gap-1 rounded-full border p-1"
    >
      {tabs.map((tab) => (
        <Link
          key={tab.id}
          href={tab.href}
          aria-current={day === tab.id ? "page" : undefined}
          className={`rounded-full px-4 py-1.5 text-sm font-medium ${
            day === tab.id ? "bg-foreground/10" : "text-muted-foreground"
          }`}
        >
          {tab.label}
        </Link>
      ))}
    </nav>
  );
}
