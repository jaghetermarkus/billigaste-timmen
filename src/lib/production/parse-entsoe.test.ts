import { describe, expect, it } from "vitest";

import { parseConsumption, parseGeneration } from "./parse-entsoe";

// Förkortat svar från ENTSO-E (SE4, 26 oktober 2026)
const generationXml = `<?xml version="1.0" encoding="utf-8"?>
<GL_MarketDocument xmlns="urn:iec62325.351:tc57wg16:451-6:generationloaddocument:3:0">
  <type>A75</type>
  <TimeSeries>
    <mRID>1</mRID>
    <inBiddingZone_Domain.mRID codingScheme="A01">10Y1001A1001A47J</inBiddingZone_Domain.mRID>
    <curveType>A03</curveType>
    <MktPSRType><psrType>B04</psrType></MktPSRType>
    <Period>
      <timeInterval><start>2026-10-25T23:00Z</start><end>2026-10-26T00:00Z</end></timeInterval>
      <resolution>PT15M</resolution>
      <Point><position>1</position><quantity>0.4</quantity></Point>
      <Point><position>3</position><quantity>0</quantity></Point>
    </Period>
  </TimeSeries>
  <TimeSeries>
    <mRID>2</mRID>
    <inBiddingZone_Domain.mRID codingScheme="A01">10Y1001A1001A47J</inBiddingZone_Domain.mRID>
    <MktPSRType><psrType>B19</psrType></MktPSRType>
    <Period>
      <timeInterval><start>2026-10-25T23:00Z</start><end>2026-10-26T00:00Z</end></timeInterval>
      <resolution>PT60M</resolution>
      <Point><position>1</position><quantity>512</quantity></Point>
    </Period>
  </TimeSeries>
  <TimeSeries>
    <mRID>3</mRID>
    <outBiddingZone_Domain.mRID codingScheme="A01">10Y1001A1001A47J</outBiddingZone_Domain.mRID>
    <MktPSRType><psrType>B10</psrType></MktPSRType>
    <Period>
      <timeInterval><start>2026-10-25T23:00Z</start><end>2026-10-26T00:00Z</end></timeInterval>
      <resolution>PT60M</resolution>
      <Point><position>1</position><quantity>40</quantity></Point>
    </Period>
  </TimeSeries>
</GL_MarketDocument>`;

const consumptionXml = `<?xml version="1.0" encoding="utf-8"?>
<GL_MarketDocument xmlns="urn:iec62325.351:tc57wg16:451-6:generationloaddocument:3:0">
  <type>A65</type>
  <TimeSeries>
    <outBiddingZone_Domain.mRID codingScheme="A01">10Y1001A1001A47J</outBiddingZone_Domain.mRID>
    <Period>
      <timeInterval><start>2026-10-25T23:00Z</start><end>2026-10-25T23:30Z</end></timeInterval>
      <resolution>PT15M</resolution>
      <Point><position>1</position><quantity>2900</quantity></Point>
      <Point><position>2</position><quantity>2875</quantity></Point>
    </Period>
  </TimeSeries>
</GL_MarketDocument>`;

const noDataXml = `<?xml version="1.0" encoding="utf-8"?>
<Acknowledgement_MarketDocument xmlns="urn:iec62325.351:tc57wg16:451-1:acknowledgementdocument:7:0">
  <Reason><code>999</code><text>No matching data found</text></Reason>
</Acknowledgement_MarketDocument>`;

const t0 = Date.parse("2026-10-25T23:00Z");
const q = 15 * 60 * 1000;

describe("parseGeneration", () => {
  it("läser kraftslag, kvartar och fyller hål", () => {
    const series = parseGeneration(generationXml);
    expect(series.map((s) => s.psrType)).toEqual(["B04", "B19"]);
    expect([...series[0].values.values()]).toEqual([0.4, 0.4, 0, 0]);
    expect([...series[1].values]).toEqual([
      [t0, 512],
      [t0 + q, 512],
      [t0 + 2 * q, 512],
      [t0 + 3 * q, 512],
    ]);
  });

  it("hoppar över pumpkraftens förbrukning", () => {
    expect(
      parseGeneration(generationXml).some((s) => s.psrType === "B10"),
    ).toBe(false);
  });

  it("ger en tom lista när det inte finns data", () => {
    expect(parseGeneration(noDataXml)).toEqual([]);
  });
});

describe("parseConsumption", () => {
  it("läser förbrukningen per kvart", () => {
    expect([...parseConsumption(consumptionXml)]).toEqual([
      [t0, 2900],
      [t0 + q, 2875],
    ]);
  });

  it("ger en tom map när det inte finns data", () => {
    expect(parseConsumption(noDataXml).size).toBe(0);
  });
});
