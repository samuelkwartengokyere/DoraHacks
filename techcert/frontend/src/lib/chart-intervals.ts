export type ChartInterval = "1m" | "5m" | "15m" | "1h" | "2h" | "4h" | "1d";

export const CHART_INTERVALS: { id: ChartInterval; label: string }[] = [
  { id: "1m", label: "1m" },
  { id: "5m", label: "5m" },
  { id: "15m", label: "15m" },
  { id: "1h", label: "1H" },
  { id: "2h", label: "2H" },
  { id: "4h", label: "4H" },
  { id: "1d", label: "1D" },
];

const INTERVAL_MS: Record<ChartInterval, number> = {
  "1m": 60_000,
  "5m": 5 * 60_000,
  "15m": 15 * 60_000,
  "1h": 60 * 60_000,
  "2h": 2 * 60 * 60_000,
  "4h": 4 * 60 * 60_000,
  "1d": 24 * 60 * 60_000,
};

export function intervalLabel(interval: ChartInterval): string {
  return CHART_INTERVALS.find((item) => item.id === interval)?.label ?? interval;
}

export function intervalMs(interval: ChartInterval): number {
  return INTERVAL_MS[interval];
}

/** History depth per interval (capped at Binance kline limit of 500). */
export function candleLimitForInterval(interval: ChartInterval): number {
  const sevenDays = 7 * 24 * 60 * 60_000;
  return Math.min(500, Math.ceil(sevenDays / INTERVAL_MS[interval]));
}

export function isShortInterval(interval: ChartInterval): boolean {
  return interval === "1m" || interval === "5m";
}

export function isChartInterval(value: string): value is ChartInterval {
  return CHART_INTERVALS.some((item) => item.id === value);
}
