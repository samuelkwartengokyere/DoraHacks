"use client";

import { BrokerCandlestickChart, type BrokerCandle, type BrokerMarker } from "./broker-candlestick-chart";

export interface PriceMaPoint {
  time: number;
  open?: number;
  high?: number;
  low?: number;
  close?: number;
  volume?: number;
  price: number;
  fastMa: number | null;
  slowMa: number | null;
}

interface BacktestTrade {
  type: string;
  time: number;
}

interface PriceMaChartProps {
  data: PriceMaPoint[];
  symbol?: string;
  fastPeriod?: number;
  slowPeriod?: number;
  trades?: BacktestTrade[];
}

export function PriceMaChart({
  data,
  symbol = "BNB",
  fastPeriod = 9,
  slowPeriod = 21,
  trades = [],
}: PriceMaChartProps) {
  const candles: BrokerCandle[] = data.map((point) => ({
    time: point.time,
    open: point.open ?? point.price,
    high: point.high ?? point.price,
    low: point.low ?? point.price,
    close: point.close ?? point.price,
    volume: point.volume,
    fastMa: point.fastMa,
    slowMa: point.slowMa,
  }));

  const markers: BrokerMarker[] = trades
    .filter((t) => t.type === "BUY" || t.type === "SELL")
    .map((t) => ({
      time: t.time,
      action: t.type as "BUY" | "SELL",
    }));

  return (
    <BrokerCandlestickChart
      candles={candles}
      symbol={symbol}
      interval="1H"
      fastPeriod={fastPeriod}
      slowPeriod={slowPeriod}
      markers={markers}
    />
  );
}
