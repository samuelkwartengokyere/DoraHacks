"use client";

import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { LineChart, Play } from "lucide-react";
import { api, type StrategyRun } from "@/lib/api";

interface StrategiesPanelProps {
  runs: StrategyRun[];
  onRefresh: () => Promise<void>;
}

export function StrategiesPanel({ runs, onRefresh }: StrategiesPanelProps) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [latest, setLatest] = useState<StrategyRun | null>(null);
  const [initialUsd, setInitialUsd] = useState("1000");

  async function handleBacktest() {
    setLoading(true);
    setError("");
    try {
      const result = await api.runStrategyBacktest({
        symbol: "BNB",
        name: "CMC Momentum MA Crossover",
        initialUsd: Number(initialUsd),
      });
      setLatest(result.run);
      await onRefresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Backtest failed");
    } finally {
      setLoading(false);
    }
  }

  const output = latest?.skillOutput;

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <LineChart className="h-5 w-5" />
            CMC Strategy Skill (Track 2)
          </CardTitle>
          <CardDescription>
            CoinMarketCap signal pipeline + backtestable MA crossover on BNB hourly data
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="max-w-xs space-y-2">
            <Label htmlFor="initialUsd">Backtest capital (USD)</Label>
            <Input
              id="initialUsd"
              type="number"
              min="100"
              value={initialUsd}
              onChange={(e) => setInitialUsd(e.target.value)}
            />
          </div>
          <Button onClick={handleBacktest} disabled={loading} className="gap-2">
            <Play className="h-4 w-4" />
            {loading ? "Running skill..." : "Run CMC Strategy Skill"}
          </Button>
        </CardContent>
      </Card>

      {error && (
        <p className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700 dark:border-red-900 dark:bg-red-950 dark:text-red-300">
          {error}
        </p>
      )}

      {output && (
        <Card>
          <CardHeader>
            <CardTitle>Skill Output</CardTitle>
            <CardDescription>{output.skill} · {output.track}</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex flex-wrap gap-2">
              <Badge variant="success">{output.cmcSignal.action}</Badge>
              <Badge variant="outline">{output.cmcSignal.regime}</Badge>
              <Badge variant="outline">
                Confidence {(output.cmcSignal.confidence * 100).toFixed(0)}%
              </Badge>
              <Badge variant={output.backtest.pnlPercent >= 0 ? "success" : "destructive"}>
                Backtest {output.backtest.pnlPercent.toFixed(2)}%
              </Badge>
            </div>
            <p className="text-sm text-gray-600 dark:text-slate-400">
              {output.recommendation.rationale}
            </p>
            <div className="grid gap-3 sm:grid-cols-3">
              <Metric label="Final equity" value={`$${output.backtest.finalEquityUsd.toFixed(2)}`} />
              <Metric label="Trades" value={String(output.backtest.tradeCount)} />
              <Metric label="Win rate" value={`${output.backtest.winRate.toFixed(1)}%`} />
            </div>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader>
          <CardTitle>Previous Runs</CardTitle>
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
                    <p className="text-xs text-gray-500">{run.symbol} · {run.strategyType}</p>
                  </div>
                  <Badge variant={run.pnlPercent >= 0 ? "success" : "destructive"}>
                    {run.pnlPercent?.toFixed(2)}%
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

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg bg-gray-50 px-3 py-2 dark:bg-slate-800">
      <p className="text-xs text-gray-500">{label}</p>
      <p className="text-lg font-semibold">{value}</p>
    </div>
  );
}
