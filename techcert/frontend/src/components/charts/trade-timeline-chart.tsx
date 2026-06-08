"use client";

import { useMemo } from "react";
import type { Trade } from "@/lib/api";
import { isExecutedChartTrade } from "@/lib/trade-utils";
import { intervalLabel, type ChartInterval } from "@/lib/chart-intervals";
import { useLiveCandles } from "@/hooks/use-live-candles";
import {
  BrokerCandlestickChart,
  type BrokerMarker,
} from "./broker-candlestick-chart";

interface TradeTimelineChartProps {
  trades: Trade[];
  symbol?: string;
  interval: ChartInterval;
  onIntervalChange: (interval: ChartInterval) => void;
  highlightTradeId?: string | null;
}

export function TradeTimelineChart({
  trades,
  symbol = "BNB",
  interval,
  onIntervalChange,
  highlightTradeId = null,
}: TradeTimelineChartProps) {
  const {
    candles,
    loading,
    loadingMore,
    error,
    connected,
    ticker,
    loadMoreHistory,
    fastMaPeriod,
    slowMaPeriod,
  } = useLiveCandles(symbol, interval);

  const executedTrades = useMemo(
    () => trades.filter(isExecutedChartTrade),
    [trades],
  );

  const candleTimes = useMemo(() => candles.map((c) => c.time), [candles]);

  const markers: BrokerMarker[] = useMemo(() => {
    function snapToNearestCandle(timeMs: number) {
      if (candleTimes.length === 0) return timeMs;
      let nearest = candleTimes[0];
      let minDiff = Math.abs(timeMs - nearest);
      for (const t of candleTimes) {
        const diff = Math.abs(timeMs - t);
        if (diff < minDiff) {
          minDiff = diff;
          nearest = t;
        }
      }
      return nearest;
    }

    return executedTrades.map((trade) => ({
      time: snapToNearestCandle(new Date(trade.createdAt).getTime()),
      action: trade.action,
      tradeId: trade._id,
      status: trade.status as BrokerMarker["status"],
      priceUsd: trade.priceUsd,
      highlighted: highlightTradeId === trade._id,
    }));
  }, [executedTrades, candleTimes, highlightTradeId]);

  if (loading) {
    return <p className="text-sm text-gray-500 dark:text-slate-400">Loading {intervalLabel(interval)} chart…</p>;
  }

  if (error) {
    return <p className="text-sm text-red-500">{error}</p>;
  }

  if (candles.length === 0) {
    return (
      <p className="text-sm text-gray-500 dark:text-slate-400">
        Waiting for live market data…
      </p>
    );
  }

  return (
    <BrokerCandlestickChart
      candles={candles}
      symbol={symbol}
      interval={intervalLabel(interval)}
      activeInterval={interval}
      onIntervalChange={onIntervalChange}
      fastPeriod={fastMaPeriod}
      slowPeriod={slowMaPeriod}
      markers={markers}
      highlightTradeId={highlightTradeId}
      live
      connected={connected}
      ticker={ticker}
      showMa
      loadingMore={loadingMore}
      onNeedMoreHistory={loadMoreHistory}
      height={480}
    />
  );
}
