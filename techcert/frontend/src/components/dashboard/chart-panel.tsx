"use client";

import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { XCircle } from "lucide-react";
import type { StrategyRun, Trade } from "@/lib/api";
import { api } from "@/lib/api";
import { isOpenTrade } from "@/lib/trade-utils";
import { intervalLabel, type ChartInterval } from "@/lib/chart-intervals";
import { PriceMaChart } from "@/components/charts/price-ma-chart";
import { TradeTimelineChart } from "@/components/charts/trade-timeline-chart";

type ChartView = "live" | "backtest";

interface ChartPanelProps {
  trades: Trade[];
  runs: StrategyRun[];
  highlightTradeId?: string | null;
  onRefresh: () => Promise<void>;
  onHighlightTrade?: (tradeId: string | null) => void;
}

export function ChartPanel({
  trades,
  runs,
  highlightTradeId = null,
  onRefresh,
  onHighlightTrade,
}: ChartPanelProps) {
  const latest = runs[0] ?? null;
  const output = latest?.skillOutput;
  const hasBacktestChart = Boolean(output?.backtest?.chartSeries?.length);
  const openTrades = trades.filter(isOpenTrade);

  const [view, setView] = useState<ChartView>("live");
  const [interval, setInterval] = useState<ChartInterval>("1h");
  const [cancellingId, setCancellingId] = useState<string | null>(null);
  const [error, setError] = useState("");

  async function handleCancel(tradeId: string) {
    if (!window.confirm("Cancel this open trade? It will be removed from your active chart markers.")) {
      return;
    }

    setCancellingId(tradeId);
    setError("");
    try {
      await api.cancelTrade(tradeId);
      if (highlightTradeId === tradeId) {
        onHighlightTrade?.(null);
      }
      await onRefresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to cancel trade");
    } finally {
      setCancellingId(null);
    }
  }

  return (
    <div className="mx-auto max-w-6xl space-y-4">
      <div className="flex flex-wrap items-center gap-2">
        <Button
          variant={view === "live" ? "default" : "outline"}
          size="sm"
          onClick={() => setView("live")}
          className={cn(view === "live" && "bg-amber-500 hover:bg-amber-600")}
        >
          Live Market
        </Button>
        <Button
          variant={view === "backtest" ? "default" : "outline"}
          size="sm"
          onClick={() => setView("backtest")}
          disabled={!hasBacktestChart}
          className={cn(view === "backtest" && "bg-amber-500 hover:bg-amber-600")}
        >
          Strategy Backtest
        </Button>
      </div>

      {error && (
        <p className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700 dark:border-red-900 dark:bg-red-950 dark:text-red-300">
          {error}
        </p>
      )}

      {view === "live" && openTrades.length > 0 && (
        <Card className="border-amber-200/70 dark:border-amber-900/40">
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Open trades on chart</CardTitle>
            <CardDescription>
              Entry markers and price lines — cancel to close a paper position early
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-2">
            {openTrades.map((trade) => (
              <div
                key={trade._id}
                className={cn(
                  "flex flex-wrap items-center justify-between gap-3 rounded-lg border px-3 py-2",
                  highlightTradeId === trade._id
                    ? "border-amber-400 bg-amber-50/60 dark:border-amber-700 dark:bg-amber-950/30"
                    : "border-gray-100 dark:border-slate-800",
                )}
              >
                <div className="flex flex-wrap items-center gap-2 text-sm">
                  <Badge variant={trade.action === "BUY" ? "success" : "destructive"}>
                    {trade.action}
                  </Badge>
                  <span className="font-medium">{trade.symbol}</span>
                  <span className="text-gray-500">${trade.amountUsd}</span>
                  {trade.priceUsd != null && (
                    <span className="text-gray-500">@ ${trade.priceUsd.toFixed(2)}</span>
                  )}
                  <span className="text-xs text-gray-400">
                    {new Date(trade.createdAt).toLocaleString()}
                  </span>
                </div>
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => onHighlightTrade?.(trade._id)}
                  >
                    Highlight
                  </Button>
                  <Button
                    variant="destructive"
                    size="sm"
                    className="gap-1"
                    disabled={cancellingId === trade._id}
                    onClick={() => handleCancel(trade._id)}
                  >
                    <XCircle className="h-4 w-4" />
                    {cancellingId === trade._id ? "Cancelling…" : "Cancel trade"}
                  </Button>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      {view === "live" && (
        <Card>
          <CardHeader>
            <CardTitle>BNB/USDT · {intervalLabel(interval)}</CardTitle>
            <CardDescription>
              Live Binance candlesticks with volume, MA 9/21, zoom, fullscreen, and trade markers
            </CardDescription>
          </CardHeader>
          <CardContent className="p-0 sm:p-0">
            <TradeTimelineChart
              trades={trades}
              interval={interval}
              onIntervalChange={setInterval}
              highlightTradeId={highlightTradeId}
            />
          </CardContent>
        </Card>
      )}

      {view === "backtest" && hasBacktestChart && output && (
        <Card>
          <CardHeader>
            <CardTitle>
              {output.symbol || latest?.symbol || "BNB"}/USDT · MA Crossover
            </CardTitle>
            <CardDescription>
              Backtest candlesticks with MA overlays and entry/exit markers from the latest strategy run
            </CardDescription>
          </CardHeader>
          <CardContent className="p-0 sm:p-0">
            <PriceMaChart
              data={output.backtest.chartSeries!}
              symbol={output.symbol || latest?.symbol || "BNB"}
              fastPeriod={latest?.params?.fastPeriod as number | undefined}
              slowPeriod={latest?.params?.slowPeriod as number | undefined}
              trades={output.backtest.trades ?? []}
            />
          </CardContent>
        </Card>
      )}

      {view === "backtest" && !hasBacktestChart && (
        <Card>
          <CardContent className="py-10 text-center text-sm text-gray-500 dark:text-slate-400">
            Run a strategy skill backtest to populate the chart.
          </CardContent>
        </Card>
      )}
    </div>
  );
}
