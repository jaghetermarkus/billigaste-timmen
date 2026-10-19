import { describe, expect, it } from "vitest";
import type { Price } from "../prices/schema";
import { findCheapestWindow } from "./cheapest-window";

const prices = (values: number[]): Price[] =>
  values.map((sek, i) => ({
    SEK_per_kWh: sek,
    EUR_per_kWh: 0,
    EXR: 0,
    time_start: `q${i}`,
    time_end: `q${i + 1}`,
  }));

describe("findCheapestWindow", () => {
  it("finds the cheapest consecutive window", () => {
    const result = findCheapestWindow(prices([5, 1, 9, 2, 2, 8]), 2);
    expect(result).toEqual({ startIndex: 3, length: 2, average: 2 });
  });

  it("prefers the earliest window on a tie", () => {
    expect(findCheapestWindow(prices([1, 1, 5, 1, 1]), 2)?.startIndex).toBe(0);
  });

  it("handles negative prices", () => {
    expect(findCheapestWindow(prices([3, -1, -2, 4]), 2)?.startIndex).toBe(1);
  });

  it("returns null when the window is longer than the day", () => {
    expect(findCheapestWindow(prices([1, 2]), 4)).toBeNull();
  });
});
