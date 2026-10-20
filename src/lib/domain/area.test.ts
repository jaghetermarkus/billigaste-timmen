import { describe, expect, it } from "vitest";
import { parseArea } from "./area";

describe("parseArea", () => {
  it("godtar giltiga områden oavsett skiftläge", () => {
    expect(parseArea("SE1")).toBe("SE1");
    expect(parseArea("se3")).toBe("SE3");
  });

  it("faller tillbaka på SE4", () => {
    expect(parseArea(undefined)).toBe("SE4");
    expect(parseArea("SE9")).toBe("SE4");
    expect(parseArea("")).toBe("SE4");
  });
});
