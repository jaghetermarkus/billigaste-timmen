"use client";

import {
  ChartColumn,
  Clock,
  WashingMachine,
  Wind,
  type LucideIcon,
} from "lucide-react";
import { usePathname } from "next/navigation";
import { AreaLink } from "./area-link";

type NavItem = { href: string; label: string; icon: LucideIcon };

/** Flikarna i menyn. En ny flik är en ny rad här. */
const items: NavItem[] = [
  { href: "/", label: "I dag", icon: ChartColumn },
  { href: "/maskiner", label: "Maskiner", icon: WashingMachine },
  { href: "/produktion", label: "Produktion", icon: Wind },
  { href: "/historik", label: "Historik", icon: Clock },
];

/** "/maskiner/elbil" ska markera Maskiner, men "/" ska bara markera sig själv. */
function isActive(href: string, pathname: string) {
  return href === "/"
    ? pathname === "/"
    : pathname === href || pathname.startsWith(`${href}/`);
}

export function AppNav() {
  const pathname = usePathname();

  return (
    <nav
      aria-label="Huvudmeny"
      className="glass fixed bottom-[max(1.5rem,env(safe-area-inset-bottom))] left-1/2 z-20 flex -translate-x-1/2 gap-0.5 rounded-full p-1.5 backdrop-blur-xl"
    >
      {items.map(({ href, label, icon: Icon }) => {
        const active = isActive(href, pathname);
        return (
          <AreaLink
            key={href}
            href={href}
            aria-current={active ? "page" : undefined}
            className={`flex min-w-16 flex-col items-center gap-0.5 rounded-full px-3 py-1.5 text-[11px] font-semibold ${
              active
                ? "bg-foreground/10 text-foreground"
                : "text-muted-foreground"
            }`}
          >
            <Icon className="size-5" aria-hidden="true" />
            {label}
          </AreaLink>
        );
      })}
    </nav>
  );
}
