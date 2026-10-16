import { z } from "zod";

export const priceSchema = z.object({
  SEK_per_kWh: z.number(),
  EUR_per_kWh: z.number(),
  EXR: z.number(),
  time_start: z.string(),
  time_end: z.string(),
});

export const pricesSchema = z.array(priceSchema);
export type Price = z.infer<typeof priceSchema>;
export type Prices = z.infer<typeof pricesSchema>;