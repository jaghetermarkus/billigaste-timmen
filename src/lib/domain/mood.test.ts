import { describe, expect, it } from "vitest";
import { getMood } from "./mood";

describe("getMood", () => {
  it("is cheap below 80 % of the reference", () =>
    expect(getMood(70, 100)).toBe("billig"));
  it("is normal in between", () => expect(getMood(100, 100)).toBe("vanlig"));
  it("is expensive above 125 % of the reference", () =>
    expect(getMood(130, 100)).toBe("dyr"));
  it("falls back to normal without a reference", () =>
    expect(getMood(50, null)).toBe("vanlig"));
});
