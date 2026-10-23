import { describe, expect, it } from "vitest";

import { defaultEvSettings, fuelDefaults, fuelDefaults } from "./ev";
import { changedEvSettings, parseEvSettings } from "./ev-settings";

describe("parseEvSettings", () => {
  it("ger standardvärden när inget är sparat", () => {
    expect(parseEvSettings(null)).toEqual(defaultEvSettings);
  });

  it("ger standardvärden för trasig JSON", () => {
    expect(parseEvSettings("{inte json")).toEqual(defaultEvSettings);
  });

  it("fyller i fält som saknas", () => {
    const s = parseEvSettings(JSON.stringify({ kwhPerMil: 2.1 }));
    expect(s.kwhPerMil).toBe(2.1);
    expect(s.batteryKwh).toBe(defaultEvSettings.batteryKwh);
  });

  it("ger standardvärden för orimliga värden", () => {
    expect(parseEvSettings(JSON.stringify({ kwhPerMil: -3 }))).toEqual(
      defaultEvSettings,
    );
    expect(parseEvSettings(JSON.stringify({ readyBy: "25:00" }))).toEqual(
      defaultEvSettings,
    );
    expect(parseEvSettings(JSON.stringify({ fuel: "el" }))).toEqual(
      defaultEvSettings,
    );
  });

  it("kräver att man laddar till mer än man laddar från", () => {
    const s = parseEvSettings(
      JSON.stringify({ fromPercent: 80, toPercent: 20, kwhPerMil: 2 }),
    );
    expect(s.fromPercent).toBe(defaultEvSettings.fromPercent);
    expect(s.toPercent).toBe(defaultEvSettings.toPercent);
    expect(s.kwhPerMil).toBe(2); // resten är kvar
  });
});

describe("changedEvSettings", () => {
  it("sparar ingenting när allt är standard", () => {
    expect(changedEvSettings(defaultEvSettings)).toEqual({});
  });

  it("sparar bara det som har ändrats", () => {
    expect(changedEvSettings({ ...defaultEvSettings, kwhPerMil: 2.1 })).toEqual(
      { kwhPerMil: 2.1 },
    );
  });

  it("räknar dieselns standardpris som standard när man valt diesel", () => {
    const diesel = {
      ...defaultEvSettings,
      fuel: "diesel" as const,
      ...fuelDefaults.diesel,
    };
    expect(changedEvSettings(diesel)).toEqual({ fuel: "diesel" });
  });
});

describe("parseEvSettings och bränsle", () => {
  it("ger dieselns standardpris när bara diesel är sparat", () => {
    const s = parseEvSettings(JSON.stringify({ fuel: "diesel" }));
    expect(s.fuelSekPerLiter).toBe(fuelDefaults.diesel.fuelSekPerLiter);
  });

  it("behåller ett eget literpris", () => {
    const s = parseEvSettings(
      JSON.stringify({ fuel: "diesel", fuelSekPerLiter: 21 }),
    );
    expect(s.fuelSekPerLiter).toBe(21);
  });
});
