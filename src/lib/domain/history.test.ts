import { describe, expect, it } from "vitest";
import { TZDate } from "@date-fns/tz";

import {
  combinePoints,
  dayKeys,
  daysOfMonth,
  historyLabel,
  hourRange,
  monthKeys,
  oneYearEarlier,
  summarizeDay,
  summarizeHistory,
  type HistoryPoint,
} from "./history";

const at = (hour: string, sek: number) => ({
  time_start: `2026-10-23T${hour}:00:00+02:00`,
  SEK_per_kWh: sek,
});
const point = (
  key: string,
  average: number,
  hourly: (number | null)[] = Array(24).fill(average),
): HistoryPoint => ({
  key,
  average,
  hourly,
});

describe("summarizeDay", () => {
  it("räknar snitt och timmar i öre", () => {
    const day = summarizeDay("2026-10-23", [
      at("00", 0.5),
      at("00", 0.7),
      at("01", 1.2),
    ]);
    expect(day.average).toBeCloseTo(80);
    expect(day.hourly[0]).toBeCloseTo(60);
    expect(day.hourly[1]).toBeCloseTo(120);
    expect(day.hourly[2]).toBeNull();
  });
});

describe("combinePoints", () => {
  it("tar snittet av dygnen och hoppar över saknade timmar", () => {
    const hourly = Array(24).fill(40);
    hourly[2] = null;
    const month = combinePoints("2026-03", [
      point("a", 40, hourly),
      point("b", 80),
    ]);
    expect(month?.average).toBe(60);
    expect(month?.hourly[0]).toBe(60);
    expect(month?.hourly[2]).toBe(80);
  });

  it("ger null utan dygn", () => {
    expect(combinePoints("2026-03", [])).toBeNull();
  });
});

describe("datum", () => {
  const today = new TZDate(2026, 9, 23, 22, 0, "Europe/Stockholm");

  it("ger 30 dygn som slutar i dag", () => {
    const keys = dayKeys(today, 30);
    expect(keys).toHaveLength(30);
    expect(keys[0]).toBe("2026-09-24");
    expect(keys[29]).toBe("2026-10-23");
  });

  it("räknar dygnet i svensk tid strax efter midnatt", () => {
    const night = new TZDate(2026, 9, 24, 0, 30, "Europe/Stockholm");
    expect(dayKeys(night, 30).at(-1)).toBe("2026-10-24");
  });

  it("ger 12 månader som slutar denna månad", () => {
    expect(monthKeys(today, 12)).toEqual([
      "2025-11",
      "2025-12",
      "2026-01",
      "2026-02",
      "2026-03",
      "2026-04",
      "2026-05",
      "2026-06",
      "2026-07",
      "2026-08",
      "2026-09",
      "2026-10",
    ]);
  });

  it("ger dygnen i en månad fram till i dag", () => {
    expect(daysOfMonth("2026-02", "2026-12-31")).toHaveLength(28);
    expect(daysOfMonth("2026-10", "2026-10-23").at(-1)).toBe("2026-10-23");
  });

  it("hoppar över dygn innan historiken börjar", () => {
    expect(daysOfMonth("2022-10", "2026-10-23")).toEqual([]);
  });

  it("går ett år bakåt, även från skottdagen", () => {
    expect(oneYearEarlier("2026-10-23")).toBe("2025-10-23");
    expect(oneYearEarlier("2028-02-29")).toBe("2027-02-28");
    expect(oneYearEarlier("2026-01")).toBe("2025-01");
  });

  it("skriver dygn och månader på svenska", () => {
    expect(historyLabel("2026-10-23")).toBe("fre 23 okt");
    expect(historyLabel("2026-05")).toBe("maj");
    expect(historyLabel("2026-05", true)).toBe("maj 2026");
    expect(hourRange(3)).toBe("03–04");
  });
});

describe("summarizeHistory", () => {
  const profile = (cheap: number, dear: number) =>
    Array.from({ length: 24 }, (_, h) =>
      h === cheap ? 10 : h === dear ? 200 : 100,
    );

  const rows = [
    {
      point: point("2026-10-21", 60, profile(3, 18)),
      previous: point("2025-10-21", 100),
    },
    {
      point: point("2026-10-22", 140, profile(3, 18)),
      previous: point("2025-10-22", 100),
    },
    { point: point("2026-10-23", 70, profile(3, 18)), previous: null },
  ];

  it("räknar snitt, billigast och dyrast", () => {
    const s = summarizeHistory(rows);
    expect(s.average).toBeCloseTo(90);
    expect(s.cheapest.key).toBe("2026-10-21");
    expect(s.dearest.key).toBe("2026-10-22");
    expect(s.underOneKrona).toBe(2);
  });

  it("jämför med året innan", () => {
    expect(summarizeHistory(rows).change).toBe(-10);
  });

  it("ger ingen jämförelse när året innan saknas", () => {
    expect(
      summarizeHistory(rows.map((r) => ({ ...r, previous: null }))).change,
    ).toBeNull();
  });

  it("hittar billigaste och dyraste timmen i snittdygnet", () => {
    const s = summarizeHistory(rows);
    expect(s.cheapestHour).toBe(3);
    expect(s.dearestHour).toBe(18);
  });
});
