import type { Price } from "../prices/schema";
import { findCheapestWindow, type PriceWindow } from "./cheapest-window";
import { findChargeWindow } from "./ev";

export type Machine = {
  id: string;
  name: string;
  /** Hur länge den går, i kvartar */
  quarters: number;
  /** Förbrukning per gång */
  kwh: number;
  /** Klar senast "HH:mm", eller null för när som helst de närmaste 24 timmarna */
  readyBy: string | null;
};

export const defaultMachines: Machine[] = [
  { id: "disk", name: "Diskmaskin", quarters: 8, kwh: 1.1, readyBy: null },
  { id: "tvatt", name: "Tvättmaskin", quarters: 6, kwh: 0.9, readyBy: null },
  { id: "tork", name: "Torktumlare", quarters: 4, kwh: 2.4, readyBy: "07:00" },
];

export type MachinePlan = {
  window: PriceWindow;
  /** Snittpriset om man startar nu, spot i kr/kWh */
  nowAverage: number;
  /** Vad man sparar på att vänta, i kronor med moms */
  savingSek: number;
};

const VAT = 1.25;

/** Billigaste starten för en maskin, eller null om den inte hinner bli klar. */
export function planMachine(
  prices: Price[],
  m: Machine,
  now: Date,
): MachinePlan | null {
  const first = prices.findIndex(
    (p) => new Date(p.time_end).getTime() > now.getTime(),
  );
  if (first < 0) return null;

  let window: PriceWindow | null;
  if (m.readyBy) {
    window = findChargeWindow(prices, {
      now,
      readyBy: m.readyBy,
      quarters: m.quarters,
    });
  } else {
    // Inom de närmaste 24 timmarna
    const found = findCheapestWindow(
      prices.slice(first, first + 96),
      m.quarters,
    );
    window = found && { ...found, startIndex: found.startIndex + first };
  }
  if (!window) return null;

  const nowSlice = prices.slice(first, first + m.quarters);
  const nowAverage =
    nowSlice.reduce((sum, p) => sum + p.SEK_per_kWh, 0) / nowSlice.length;

  return {
    window,
    nowAverage,
    // Skatt och nätavgift kostar lika mycket oavsett när, så bara spotpriset (med moms) skiljer
    savingSek: Math.max(0, (nowAverage - window.average) * m.kwh * VAT),
  };
}

/** "2 h", "1,5 h", "45 min" */
export function formatDuration(quarters: number) {
  if (quarters < 4) return `${quarters * 15} min`;
  return `${String(quarters / 4).replace(".", ",")} h`;
}
