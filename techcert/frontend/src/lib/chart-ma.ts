import type { BrokerCandle } from "@/components/charts/broker-candlestick-chart";

export function computeSma(closes: number[], period: number): (number | null)[] {
  const result: (number | null)[] = [];
  let sum = 0;

  for (let i = 0; i < closes.length; i += 1) {
    sum += closes[i];
    if (i >= period) {
      sum -= closes[i - period];
    }
    result.push(i >= period - 1 ? sum / period : null);
  }

  return result;
}

export function attachMovingAverages(
  candles: BrokerCandle[],
  fastPeriod = 9,
  slowPeriod = 21,
): BrokerCandle[] {
  if (candles.length === 0) return candles;

  const closes = candles.map((c) => c.close);
  const fast = computeSma(closes, fastPeriod);
  const slow = computeSma(closes, slowPeriod);

  return candles.map((candle, index) => ({
    ...candle,
    fastMa: fast[index],
    slowMa: slow[index],
  }));
}
