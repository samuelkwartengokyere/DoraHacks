"use client";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { AlertTriangle, Shield, Trophy } from "lucide-react";
import type { AgentEvaluation, EvaluationConfig, LeaderboardEntry } from "@/lib/api";

function statusBadge(status: string) {
  if (status === "ranked") return "success" as const;
  if (status === "disqualified") return "destructive" as const;
  return "outline" as const;
}

function formatPercent(value: number) {
  const sign = value > 0 ? "+" : "";
  return `${sign}${value.toFixed(2)}%`;
}

export function EvaluationTrackPanel({
  config,
  agents,
  leaderboard,
}: {
  config: EvaluationConfig | null;
  agents: Array<{ _id: string; name: string; evaluation?: AgentEvaluation }>;
  leaderboard: LeaderboardEntry[];
}) {
  const primary = agents[0]?.evaluation;

  return (
    <div className="space-y-4">
      <Card className="border-blue-200/70 dark:border-blue-900/50">
        <CardHeader className="pb-2">
          <CardTitle className="flex items-center gap-2 text-base">
            <Shield className="h-4 w-4 text-blue-600" />
            Track 1 — Live Evaluation
          </CardTitle>
          <CardDescription>
            Ranked by total return · max drawdown cap {config?.maxDrawdownPercent ?? 30}% · min{" "}
            {config?.minTradeCount ?? 5} trades · simulated fees & slippage
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          {config?.windowStart && (
            <p className="text-xs text-gray-500 dark:text-slate-400">
              Held-out window: {new Date(config.windowStart).toLocaleString()}
              {config.windowEnd ? ` → ${new Date(config.windowEnd).toLocaleString()}` : " → open"}
            </p>
          )}

          {primary ? (
            <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
              <Metric label="Live return" value={formatPercent(primary.totalReturnPercent)} />
              <Metric label="Max drawdown" value={`${primary.maxDrawdownPercent.toFixed(2)}%`} />
              <Metric label="Equity" value={`$${primary.equityUsd.toFixed(2)}`} />
              <Metric
                label="Executed trades"
                value={`${primary.executedTradeCount} / ${config?.minTradeCount ?? 5} min`}
              />
            </div>
          ) : (
            <p className="text-sm text-gray-500 dark:text-slate-400">
              Create an agent and start monitor to begin live evaluation.
            </p>
          )}

          {primary?.isDisqualified && (
            <div className="flex items-start gap-2 rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-800 dark:border-red-900 dark:bg-red-950/30 dark:text-red-200">
              <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
              <span>{primary.disqualificationReason || "Disqualified — drawdown cap exceeded"}</span>
            </div>
          )}

          {primary && !primary.isDisqualified && primary.eligibility.status === "pending_min_trades" && (
            <p className="text-sm text-amber-700 dark:text-amber-300">{primary.eligibility.reason}</p>
          )}
        </CardContent>
      </Card>

      {leaderboard.length > 0 && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2 text-base">
              <Trophy className="h-4 w-4 text-amber-500" />
              Leaderboard
            </CardTitle>
            <CardDescription>Sorted by total return — disqualified agents ranked last</CardDescription>
          </CardHeader>
          <CardContent>
            <ul className="space-y-2">
              {leaderboard.slice(0, 5).map((entry) => (
                <li
                  key={entry.agentId}
                  className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-gray-100 px-3 py-2 dark:border-slate-800"
                >
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-semibold text-gray-400">#{entry.rank}</span>
                    <span className="text-sm font-medium">{entry.agentName}</span>
                    <Badge variant={statusBadge(entry.status)}>{entry.status.replace(/_/g, " ")}</Badge>
                  </div>
                  <div className="text-sm tabular-nums">
                    <span className={entry.totalReturnPercent >= 0 ? "text-green-600" : "text-red-600"}>
                      {formatPercent(entry.totalReturnPercent)}
                    </span>
                    <span className="ml-2 text-gray-500 dark:text-slate-400">
                      DD {entry.maxDrawdownPercent.toFixed(1)}%
                    </span>
                  </div>
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg bg-gray-50 p-3 dark:bg-slate-900/50">
      <p className="text-xs text-gray-500 dark:text-slate-400">{label}</p>
      <p className="mt-1 text-lg font-semibold text-gray-900 dark:text-slate-100">{value}</p>
    </div>
  );
}

export function AgentEvaluationBadge({ evaluation }: { evaluation?: AgentEvaluation }) {
  if (!evaluation) return null;

  if (evaluation.isDisqualified) {
    return (
      <Badge variant="destructive" className="gap-1">
        <AlertTriangle className="h-3 w-3" />
        Disqualified
      </Badge>
    );
  }

  return (
    <Badge variant={evaluation.totalReturnPercent >= 0 ? "success" : "destructive"}>
      {evaluation.totalReturnPercent >= 0 ? "+" : ""}
      {evaluation.totalReturnPercent.toFixed(2)}% live
    </Badge>
  );
}
