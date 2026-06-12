"use client";

import { useCallback, useEffect, useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  CheckCircle2,
  Circle,
  ExternalLink,
  Loader2,
  RefreshCw,
  Trophy,
  Download,
} from "lucide-react";
import { api, type CompetitionStatus, type StrategyRun } from "@/lib/api";

interface CompetitionPanelProps {
  strategyRuns: StrategyRun[];
  onNavigate: (tab: "agent" | "strategies" | "settings") => void;
}

function CheckItem({
  label,
  done,
  detail,
  action,
  url,
}: {
  label: string;
  done: boolean;
  detail?: string;
  action?: string;
  url?: string;
}) {
  return (
    <li className="flex gap-3 rounded-lg border border-slate-200/80 p-3 dark:border-slate-800">
      {done ? (
        <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0 text-green-600" />
      ) : (
        <Circle className="mt-0.5 h-5 w-5 shrink-0 text-slate-400" />
      )}
      <div className="min-w-0 space-y-1">
        <p className="text-sm font-medium text-slate-900 dark:text-slate-100">{label}</p>
        {detail && <p className="text-xs text-slate-500 dark:text-slate-400">{detail}</p>}
        {action && !done && (
          <p className="text-xs text-amber-700 dark:text-amber-400">{action}</p>
        )}
        {url && (
          <a
            href={url}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1 text-xs text-blue-600 hover:underline dark:text-blue-400"
          >
            Open link <ExternalLink className="h-3 w-3" />
          </a>
        )}
      </div>
    </li>
  );
}

export function CompetitionPanel({ strategyRuns, onNavigate }: CompetitionPanelProps) {
  const [status, setStatus] = useState<CompetitionStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [registering, setRegistering] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [exportingId, setExportingId] = useState<string | null>(null);

  const load = useCallback(async (options?: { clearFeedback?: boolean }) => {
    setLoading(true);
    if (options?.clearFeedback !== false) {
      setError("");
    }
    try {
      const data = await api.getCompetitionStatus();
      setStatus(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load competition status");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  async function handleRegister() {
    setRegistering(true);
    setMessage("");
    setError("");
    try {
      const result = await api.registerCompetitionOnChain();
      await load({ clearFeedback: false });
      if (result.ok) {
        setMessage(
          result.txHash
            ? `Registered on-chain — tx ${result.txHash}`
            : result.message || "Registration submitted via TWAK sidecar",
        );
      } else {
        const detail = [result.message, result.hint].filter(Boolean).join(" — ");
        setError(detail || "Registration failed");
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Registration failed");
    } finally {
      setRegistering(false);
    }
  }

  async function handleExport(runId: string) {
    setExportingId(runId);
    setError("");
    try {
      const result = await api.exportTrack2Submission(runId);
      const blob = new Blob([JSON.stringify(result.submission, null, 2)], {
        type: "application/json",
      });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `signalforge-track2-${runId}.json`;
      a.click();
      URL.revokeObjectURL(url);
      setMessage("Track 2 skill JSON downloaded — attach to your DoraHacks submission.");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Export failed");
    } finally {
      setExportingId(null);
    }
  }

  const track1 = status?.track1;
  const track2 = status?.track2;
  const latestRun = strategyRuns[0];

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="flex items-center gap-2 text-lg font-semibold text-slate-900 dark:text-slate-100">
            <Trophy className="h-5 w-5" />
            BNB Hack — Dual Track
          </h2>
          <p className="text-sm text-slate-500 dark:text-slate-400">
            Track 1 live agent (Jun 22–28) + Track 2 strategy skill (submit by Jun 21)
          </p>
        </div>
        <Button variant="outline" size="sm" onClick={() => void load()} disabled={loading} className="gap-2">
          <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
          Refresh
        </Button>
      </div>

      {registering && (
        <p className="rounded-lg border border-blue-200 bg-blue-50 px-4 py-3 text-sm text-blue-800 dark:border-blue-900 dark:bg-blue-950 dark:text-blue-200">
          Submitting on-chain registration via TWAK… this can take up to a minute.
        </p>
      )}
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

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Track 1 — Autonomous Agent</CardTitle>
            <CardDescription>
              Mainnet · TWAK sidecar · ≥7 trades · ≥1/day Jun 22–28
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {track1 && (
              <>
                <div className="flex flex-wrap gap-2">
                  <Badge variant="outline">{track1.chain.networkName}</Badge>
                  <Badge variant={track1.inTradingWindow ? "success" : "outline"}>
                    {track1.inTradingWindow ? "Trading window open" : "Pre-competition"}
                  </Badge>
                  {track1.walletAddress && (
                    <Badge variant="outline" className="font-mono text-[10px]">
                      {track1.walletAddress.slice(0, 6)}…{track1.walletAddress.slice(-4)}
                    </Badge>
                  )}
                </div>
                {track1.dailyProgress && (
                  <p className="text-xs text-slate-600 dark:text-slate-400">
                    Trades: {track1.dailyProgress.totalExecuted}/{track1.dailyProgress.minTotalTrades}{" "}
                    · Days covered: {track1.dailyProgress.daysWithTrades}/
                    {track1.dailyProgress.tradingDaysRequired}
                    {track1.dailyProgress.reason ? ` — ${track1.dailyProgress.reason}` : ""}
                  </p>
                )}
                <ul className="space-y-2">
                  {track1.checklist.map((item) => (
                    <CheckItem key={item.id} {...item} />
                  ))}
                </ul>
              </>
            )}
            <div className="flex flex-wrap gap-2">
              <Button size="sm" onClick={handleRegister} disabled={registering} className="gap-2">
                {registering ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
                Register on-chain (TWAK)
              </Button>
              <Button size="sm" variant="outline" onClick={() => onNavigate("agent")}>
                Open Agent
              </Button>
              <Button size="sm" variant="outline" onClick={() => onNavigate("settings")}>
                Env / Integrations
              </Button>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Track 2 — Strategy Skill</CardTitle>
            <CardDescription>CMC Agent Hub MCP · backtestable spec · DoraHacks JSON</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {track2 && (
              <ul className="space-y-2">
                {track2.checklist.map((item) => (
                  <CheckItem key={item.id} {...item} />
                ))}
              </ul>
            )}
            {latestRun ? (
              <div className="rounded-lg border border-slate-200 p-3 dark:border-slate-800">
                <p className="text-sm font-medium">{latestRun.name}</p>
                <p className="text-xs text-slate-500">
                  {latestRun.symbol} · PnL {latestRun.pnlPercent?.toFixed(2)}% ·{" "}
                  {latestRun.tradeCount} trades
                </p>
                <Button
                  size="sm"
                  variant="outline"
                  className="mt-2 gap-2"
                  disabled={exportingId === latestRun._id}
                  onClick={() => handleExport(latestRun._id)}
                >
                  {exportingId === latestRun._id ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Download className="h-4 w-4" />
                  )}
                  Export DoraHacks JSON
                </Button>
              </div>
            ) : (
              <p className="text-sm text-slate-500">Run a strategy skill first to generate export JSON.</p>
            )}
            <Button size="sm" onClick={() => onNavigate("strategies")}>
              Run CMC Strategy Skill
            </Button>
          </CardContent>
        </Card>
      </div>

      {status?.specialPrizes && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Special Prizes ($2,000 each)</CardTitle>
            <CardDescription>{status.stackRecommendation}</CardDescription>
          </CardHeader>
          <CardContent>
            <ul className="grid gap-2 sm:grid-cols-3">
              {status.specialPrizes.map((prize) => (
                <li
                  key={prize.name}
                  className="rounded-lg border border-slate-200 p-3 text-sm dark:border-slate-800"
                >
                  <p className="font-medium">{prize.name}</p>
                  <p className="text-xs text-slate-500">${prize.amountUsd.toLocaleString()} · {prize.track}</p>
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
