"use client";

import { Suspense, type ComponentProps } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";

type Props = Omit<ComponentProps<typeof Link>, "href"> & { href: string };

/** Som Link, men tar med ?omrade= från adressen om det finns. */
export function AreaLink(props: Props) {
  return (
    <Suspense fallback={<Link {...props} />}>
      <LinkWithArea {...props} />
    </Suspense>
  );
}

function LinkWithArea({ href, ...rest }: Props) {
  const area = useSearchParams().get("omrade");
  return <Link href={area ? withArea(href, area) : href} {...rest} />;
}

/** "/maskiner" + "SE1" blir "/maskiner?omrade=SE1". Behåller annat som redan står i href. */
export function withArea(href: string, area: string) {
  const [path, query = ""] = href.split("?");
  const params = new URLSearchParams(query);
  params.set("omrade", area);
  return `${path}?${params.toString()}`;
}
