"use client";

import { useEffect, useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Bell, Download, LineChart as LineChartIcon, Play, Square } from "lucide-react";
import { api, type StrategyRun, type StrategySchedule, type TradingSignal } from "@/lib/api";
import { exportTrack2Bundle, exportTrack2Json, exportTrack2Writeup } from "@/lib/track2-export";
import { EligibleTokenSelect } from "@/components/dashboard/eligible-token-select";
import { SignalDurationPanel } from "@/components/dashboard/signal-duration-panel";

const POLL_MS = 15_000;

interface StrategiesPanelProps {
  runs: StrategyRun[];
  schedule: StrategySchedule | null;
  onRefresh: () => Promise<void>;
}

function actionBadgeVariant(action: string) {
  if (action === "BUY") return "success" as const;
  if (action === "SELL") return "destructive" as const;
  return "outline" as const;
}

export function StrategiesPanel({ runs, schedule, onRefresh }: StrategiesPanelProps) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [initialUsd, setInitialUsd] = useState("1000");
  const [symbol, setSymbol] = useState("BNB");
  const [exportingId, setExportingId] = useState<string | null>(null);
  const [exportMode, setExportMode] = useState<"json" | "writeup" | "bundle" | null>(null);

  const isAutomated = Boolean(schedule?.isAutomated);
  const pollSeconds = schedule?.signalPollSeconds ?? 30;
  const backtestMinutes = schedule?.backtestIntervalMinutes ?? schedule?.runIntervalMinutes ?? 10;
  const liveSignal = schedule?.lastSignal ?? runs[0]?.skillOutput?.cmcSignal ?? null;
  const latestBacktest = runs.find((r) => r.skillOutput?.backtest?.chartSeries?.length) ?? runs[0] ?? null;
  const output = latestBacktest?.skillOutput;

  useEffect(() => {
    if (!isAutomated) return;

    const timer = window.setInterval(() => {
      onRefresh().catch(() => {});
    }, POLL_MS);

    return () => window.clearInterval(timer);
  }, [isAutomated, onRefresh]);

  async function handleStart() {
    setLoading(true);
    setError("");
    setMessage("");
    try {
      const result = await api.startStrategyAutomation({
        symbol,
        name: "CMC Momentum MA Crossover",
        initialUsd: Number(initialUsd),
        pollSeconds: 30,
        backtestIntervalMinutes: 10,
      });
      const secs = result.schedule.signalPollSeconds ?? 30;
      const btMin = result.schedule.backtestIntervalMinutes ?? 10;
      setMessage(
        `Strategy skill monitoring — live CMC signals every ${secs}s, backtest every ${btMin}m. Agents sync automatically.`
      );
      await onRefresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to start strategy skill");
    } finally {
      setLoading(false);
    }
  }

  async function handleStop() {
    setLoading(true);
    setError("");
    try {
      await api.stopStrategyAutomation();
      setMessage("Strategy skill monitor stopped.");
      await onRefresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to stop strategy skill");
    } finally {
      setLoading(false);
    }
  }

  async function handleBacktestOnce() {
    setLoading(true);
    setError("");
    setMessage("");
    try {
      await api.runStrategyBacktest({
        symbol,
        name: "CMC Momentum MA Crossover",
        initialUsd: Number(initialUsd),
      });
      setMessage("One-time backtest complete.");
      await onRefresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Backtest failed");
    } finally {
      setLoading(false);
    }
  }

  async function handleExport(
    runId: string,
    mode: "json" | "writeup" | "bundle" = "json",
  ) {
    setExportingId(runId);
    setExportMode(mode);
    setError("");
    try {
      if (mode === "writeup") {
        await exportTrack2Writeup(runId);
        setMessage("Track 2 strategy write-up downloaded.");
      } else if (mode === "bundle") {
        await exportTrack2Bundle(runId);
        setMessage("Track 2 JSON + write-up downloaded for DoraHacks.");
      } else {
        await exportTrack2Json(runId);
        setMessage("Track 2 DoraHacks JSON downloaded.");
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Export failed");
    } finally {
      setExportingId(null);
      setExportMode(null);
    }
  }

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <LineChartIcon className="h-5 w-5" />
            CMC Strategy Skill (Track 2)
          </CardTitle>
          <CardDescription>
            Monitors live CMC + MA crossover signals every 30s (same as agents) and pushes updates to your
            trading agents. Full backtest runs every 10 minutes.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {isAutomated && (
            <div className="flex flex-wrap items-center gap-2">
              <Badge variant="success" className="animate-pulse gap-1">
                <Bell className="h-3 w-3" />
                Monitoring · every {pollSeconds}s
              </Badge>
              <Badge variant="outline">Backtest · every {backtestMinutes}m</Badge>
              {schedule?.lastRunAt && (
                <span className="text-xs text-gray-500">
                  Last signal {new Date(schedule.lastRunAt).toLocaleTimeString()}
                </span>
              )}
            </div>
          )}
          <EligibleTokenSelect
            id="strategySymbol"
            value={symbol}
            onChange={setSymbol}
            className="max-w-xs space-y-2"
          />
          <div className="max-w-xs space-y-2">
            <Label htmlFor="initialUsd">Backtest capital (USD)</Label>
            <Input
              id="initialUsd"
              type="number"
              min="100"
              value={initialUsd}
              onChange={(e) => setInitialUsd(e.target.value)}
              disabled={isAutomated}
            />
          </div>
          <div className="flex flex-wrap gap-2">
            {isAutomated ? (
              <Button variant="destructive" onClick={handleStop} disabled={loading} className="gap-2">
                <Square className="h-4 w-4" />
                {loading ? "Stopping..." : "Stop Monitor"}
              </Button>
            ) : (
              <>
                <Button
                  onClick={handleStart}
                  disabled={loading}
                  className="gap-2 bg-amber-500 hover:bg-amber-600"
                >
                  <Play className="h-4 w-4" />
                  {loading ? "Starting..." : "Start Signal Monitor"}
                </Button>
                <Button variant="outline" onClick={handleBacktestOnce} disabled={loading} className="gap-2">
                  <Play className="h-4 w-4" />
                  Run backtest once
                </Button>
              </>
            )}
          </div>
        </CardContent>
      </Card>

      {error && (
        <p className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700 dark:border-red-900 dark:bg-red-950 dark:text-red-300">
          {error}
        </p>
      )}
      {message && (
        <p className="rounded-lg border border-green-200 bg-green-50 px-4 py-3 text-sm text-green-800 dark:border-green-900 dark:bg-green-950 dark:text-green-300">
          {message}
        </p>
      )}

      {liveSignal && (
        <LiveSignalCard signal={liveSignal} isAutomated={isAutomated} />
      )}

      {output?.backtest && (
        <Card>
          <CardHeader>
            <CardTitle>Latest Backtest</CardTitle>
            <CardDescription>
              {output.skill} · {output.track} · data via{" "}
              {(output as { dorahacksSubmission?: { dataSource?: string } }).dorahacksSubmission
                ?.dataSource || "cmc-agent-hub"}
              {schedule?.lastBacktestAt && (
                <> · {new Date(schedule.lastBacktestAt).toLocaleString()}</>
              )}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex flex-wrap gap-2">
              <Badge variant={actionBadgeVariant(output.cmcSignal.action)}>
                {output.cmcSignal.action}
              </Badge>
              <Badge variant="outline">{output.cmcSignal.regime}</Badge>
              <Badge variant="outline">
                Confidence {(output.cmcSignal.confidence * 100).toFixed(0)}%
              </Badge>
              {output.mcpIndicators?.globalSentiment?.fearGreedIndex != null && (
                <Badge variant="outline">
                  F&amp;G {output.mcpIndicators.globalSentiment.fearGreedIndex}
                </Badge>
              )}
              {output.mcpIndicators?.technical?.rsi?.rsi14 != null && (
                <Badge variant="outline">
                  RSI {output.mcpIndicators.technical.rsi.rsi14.toFixed(1)}
                </Badge>
              )}
              <Badge variant={output.backtest.pnlPercent >= 0 ? "success" : "destructive"}>
                Backtest {output.backtest.pnlPercent.toFixed(2)}%
              </Badge>
              {output.backtest.maxDrawdownPercent != null && (
                <Badge variant={output.backtest.disqualified ? "destructive" : "outline"}>
                  Max DD {output.backtest.maxDrawdownPercent.toFixed(1)}%
                </Badge>
              )}
            </div>
            <p className="text-sm text-gray-600 dark:text-slate-400">
              {output.recommendation.rationale}
            </p>
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
              <Metric label="Final equity" value={`$${output.backtest.finalEquityUsd.toFixed(2)}`} />
              <Metric label="Trades" value={String(output.backtest.tradeCount)} />
              <Metric label="Win rate" value={`${output.backtest.winRate.toFixed(1)}%`} />
              <Metric
                label="Max drawdown"
                value={`${(output.backtest.maxDrawdownPercent ?? 0).toFixed(1)}%`}
              />
            </div>
            {output.backtest.totalFeesUsd != null && (
              <p className="text-xs text-gray-500 dark:text-slate-400">
                Simulated costs: ${output.backtest.totalFeesUsd.toFixed(2)} fees+slippage
                {output.backtest.feeBps != null && output.backtest.slippageBps != null
                  ? ` (${output.backtest.feeBps}bps fee, ${output.backtest.slippageBps}bps slippage)`
                  : ""}
                {output.backtest.disqualified ? " · Would fail drawdown cap" : ""}
              </p>
            )}
            {latestBacktest?._id && (
              <div className="flex flex-wrap gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  className="gap-2"
                  disabled={exportingId === latestBacktest._id}
                  onClick={() => handleExport(latestBacktest._id, "json")}
                >
                  <Download className="h-4 w-4" />
                  {exportingId === latestBacktest._id && exportMode === "json"
                    ? "Exporting..."
                    : "Export JSON"}
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  className="gap-2"
                  disabled={exportingId === latestBacktest._id}
                  onClick={() => handleExport(latestBacktest._id, "writeup")}
                >
                  <Download className="h-4 w-4" />
                  {exportingId === latestBacktest._id && exportMode === "writeup"
                    ? "Exporting..."
                    : "Export Write-up"}
                </Button>
                <Button
                  size="sm"
                  className="gap-2 bg-amber-500 hover:bg-amber-600"
                  disabled={exportingId === latestBacktest._id}
                  onClick={() => handleExport(latestBacktest._id, "bundle")}
                >
                  <Download className="h-4 w-4" />
                  {exportingId === latestBacktest._id && exportMode === "bundle"
                    ? "Exporting..."
                    : "Download Both"}
                </Button>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader>
          <CardTitle>Run History</CardTitle>
          <CardDescription>
            Signal snapshots on action change plus scheduled backtest results
          </CardDescription>
        </CardHeader>
        <CardContent>
          {runs.length === 0 ? (
            <p className="text-sm text-gray-500">No strategy runs yet.</p>
          ) : (
            <ul className="space-y-2">
              {runs.map((run) => (
                <li
                  key={run._id}
                  className="flex items-center justify-between rounded-lg border border-gray-100 px-3 py-2 dark:border-slate-800"
                >
                  <div>
                    <p className="text-sm font-medium">{run.name}</p>
                    <p className="text-xs text-gray-500">
                      {run.symbol} · {run.skillOutput?.cmcSignal?.action ?? "—"} ·{" "}
                      {new Date(run.createdAt).toLocaleString()}
                    </p>
                  </div>
                  <Badge variant={(run.pnlPercent ?? 0) >= 0 ? "success" : "destructive"}>
                    {run.pnlPercent?.toFixed(2) ?? "0.00"}%
                  </Badge>
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

function McpIndicatorBadges({ signal }: { signal: TradingSignal }) {
  const indicators = signal.mcpIndicators;
  const rsi = indicators?.technical?.rsi?.rsi14 ?? signal.metrics?.rsi14;
  const macd = indicators?.technical?.macd?.histogram ?? signal.metrics?.macdHistogram;
  const fearGreed =
    indicators?.globalSentiment?.fearGreedIndex ?? signal.metrics?.fearGreedIndex;
  const fearLabel = indicators?.globalSentiment?.fearGreedLabel;

  if (rsi == null && macd == null && fearGreed == null) return null;

  return (
    <div className="mt-3 flex flex-wrap gap-2">
      {rsi != null && (
        <Badge variant="outline">RSI(14) {Number(rsi).toFixed(1)}</Badge>
      )}
      {macd != null && (
        <Badge variant={Number(macd) >= 0 ? "success" : "destructive"}>
          MACD hist {Number(macd).toFixed(2)}
        </Badge>
      )}
      {fearGreed != null && (
        <Badge variant="outline">
          F&amp;G {Number(fearGreed).toFixed(0)}
          {fearLabel ? ` · ${fearLabel}` : ""}
        </Badge>
      )}
      {indicators?.mock && <Badge variant="outline">MCP mock</Badge>}
    </div>
  );
}

function LiveSignalCard({ signal, isAutomated }: { signal: TradingSignal; isAutomated: boolean }) {
  return (
    <Card className="border-amber-200/60 dark:border-amber-900/40">
      <CardHeader className="pb-2">
        <CardTitle className="text-base">Live CMC Signal</CardTitle>
        <CardDescription>
          {isAutomated
            ? "Refreshed by the strategy monitor — synced to all BNB agents on change"
            : "Latest signal from the most recent run"}
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="flex flex-wrap items-center gap-2">
          <Badge variant={actionBadgeVariant(signal.action)} className="text-sm">
            {signal.action}
          </Badge>
          <Badge variant="outline">{signal.regime}</Badge>
          <Badge variant="outline">{(signal.confidence * 100).toFixed(0)}% confidence</Badge>
          {signal.metrics?.priceUsd != null && (
            <Badge variant="outline">${signal.metrics.priceUsd.toFixed(2)}</Badge>
          )}
        </div>
        {signal.reasons?.length > 0 && (
          <ul className="mt-3 space-y-1 text-sm text-gray-600 dark:text-slate-400">
            {signal.reasons.map((reason) => (
              <li key={reason}>· {reason}</li>
            ))}
          </ul>
        )}
        <McpIndicatorBadges signal={signal} />
        {signal.duration && <SignalDurationPanel signal={signal} />}
      </CardContent>
    </Card>
  );
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg bg-gray-50 px-3 py-2 dark:bg-slate-800">
      <p className="text-xs text-gray-500">{label}</p>
      <p className="text-lg font-semibold">{value}</p>
    </div>
  );
}
