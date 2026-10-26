import { XMLParser } from "fast-xml-parser";
import { z } from "zod";

import { expandPeriod, type GenerationSeries } from "../domain/production";

const pointSchema = z.object({
  position: z.coerce.number(),
  quantity: z.coerce.number(),
});

const periodSchema = z.object({
  timeInterval: z.object({ start: z.string(), end: z.string() }),
  resolution: z.string(),
  Point: z.array(pointSchema),
});

const seriesSchema = z.object({
  "inBiddingZone_Domain.mRID": z.string().optional(),
  "outBiddingZone_Domain.mRID": z.string().optional(),
  MktPSRType: z.object({ psrType: z.string() }).optional(),
  Period: z.array(periodSchema),
});

// När det inte finns någon data skickar ENTSO-E ett Acknowledgement_MarketDocument i stället,
// så GL_MarketDocument är valfritt och tolkas då som "inga serier".
const documentSchema = z.object({
  GL_MarketDocument: z
    .object({ TimeSeries: z.array(seriesSchema).default([]) })
    .optional(),
});

type Series = z.infer<typeof seriesSchema>;

const parser = new XMLParser({
  // Vi behöver inga attribut (som codingScheme="A01") och vill ha all text som strängar,
  // så att zod får bestämma vad som är tal.
  ignoreAttributes: true,
  parseTagValue: false,
  // Dessa ska alltid bli listor, även när det bara finns en
  isArray: (name) => ["TimeSeries", "Period", "Point"].includes(name),
});

function parseSeries(xml: string): Series[] {
  return (
    documentSchema.parse(parser.parse(xml)).GL_MarketDocument?.TimeSeries ?? []
  );
}

/** Alla perioder i en serie som ett värde per kvart. */
function seriesValues(series: Series): Map<number, number> {
  const values = new Map<number, number>();
  for (const period of series.Period) {
    const expanded = expandPeriod({
      ...period.timeInterval,
      resolution: period.resolution,
      points: period.Point,
    });
    for (const [time, mw] of expanded) values.set(time, mw);
  }
  return values;
}

/**
 * Produktion per kraftslag (A75). Serier med outBiddingZone är el som kraftverken förbrukar,
 * t.ex. när pumpkraftverk pumpar upp vatten, och ska inte räknas som produktion.
 */
export function parseGeneration(xml: string): GenerationSeries[] {
  return parseSeries(xml)
    .filter((s) => s["inBiddingZone_Domain.mRID"] && s.MktPSRType)
    .map((s) => ({ psrType: s.MktPSRType!.psrType, values: seriesValues(s) }));
}

/** Förbrukning (A65). Svaret har normalt en serie. */
export function parseConsumption(xml: string): Map<number, number> {
  const values = new Map<number, number>();
  for (const series of parseSeries(xml))
    for (const [time, mw] of seriesValues(series)) values.set(time, mw);
  return values;
}
