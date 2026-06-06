export type ChartInterval = "15m" | "1h" | "2h" | "4h" | "1d";

export const CHART_INTERVALS: { id: ChartInterval; label: string }[] = [
  { id: "15m", label: "15m" },
  { id: "1h", label: "1H" },
  { id: "2h", label: "2H" },
  { id: "4h", label: "4H" },
  { id: "1d", label: "1D" },
];

const INTERVAL_MS: Record<ChartInterval, number> = {
  "15m": 15 * 60_000,
  "1h": 60 * 60_000,
  "2h": 2 * 60 * 60_000,
  "4h": 4 * 60 * 60_000,
  "1d": 24 * 60 * 60_000,
};

export function intervalLabel(interval: ChartInterval): string {
  return CHART_INTERVALS.find((item) => item.id === interval)?.label ?? interval;
}

/** ~7 days of history, capped at Binance kline limit (500). */
export function candleLimitForInterval(interval: ChartInterval): number {
  const sevenDays = 7 * 24 * 60 * 60_000;
  return Math.min(500, Math.ceil(sevenDays / INTERVAL_MS[interval]));
}

export function isChartInterval(value: string): value is ChartInterval {
  return CHART_INTERVALS.some((item) => item.id === value);
}
