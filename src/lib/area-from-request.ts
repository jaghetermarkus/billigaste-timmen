import { cookies } from "next/headers";
import { areaCookie, parseArea } from "@/lib/domain/area";

/** Området från adressen, annars cookien, annars SE4 (reglerna från steg 13). */
export async function areaFromRequest(omrade: string | undefined) {
  const cookieStore = await cookies();
  return parseArea(omrade ?? cookieStore.get(areaCookie)?.value);
}
