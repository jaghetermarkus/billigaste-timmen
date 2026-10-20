"use client";

import { useLinkStatus } from "next/link";

type Props = {
  active: boolean;
  children: React.ReactNode;
};

export function TabLabel({ active, children }: Props) {
  const { pending } = useLinkStatus();
  const selected = active || pending;

  return (
    <span
      className={`block rounded-full px-3.5 py-1.5 transition-colors ${
        selected
          ? "bg-foreground/10 text-foreground"
          : "text-muted-foreground group-hover:text-foreground"
      } ${pending ? "animate-pulse" : ""}`}
    >
      {children}
    </span>
  );
}
