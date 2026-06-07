"use client";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Bot, TrendingUp, Zap } from "lucide-react";
import { EvaluationTrackPanel } from "@/components/dashboard/evaluation-track-panel";
import type { Agent, Trade, EvaluationConfig, LeaderboardEntry } from "@/lib/api";

interface AgentOverviewProps {
  agents: Agent[];
  trades: Trade[];
  evaluationConfig: EvaluationConfig | null;
  leaderboard: LeaderboardEntry[];
  onNavigate: (tab: "agent" | "strategies" | "chart" | "trades" | "settings") => void;
}

export function AgentOverview({ agents, trades, evaluationConfig, leaderboard, onNavigate }: AgentOverviewProps) {
  const completedTrades = trades.filter((t) => t.status === "completed" || t.status === "open");
  const lastSignal = agents.find((a) => a.lastSignal)?.lastSignal;
  const topEvaluation = agents[0]?.evaluation;
  const liveReturn = topEvaluation?.totalReturnPercent;

  return (
    <div className="space-y-6">
      <EvaluationTrackPanel config={evaluationConfig} agents={agents} leaderboard={leaderboard} />

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard
          title="Live Return"
          value={liveReturn != null ? `${liveReturn >= 0 ? "+" : ""}${liveReturn.toFixed(2)}%` : "—"}
          description="Track 1 total return (after costs)"
          icon={TrendingUp}
        />
        <StatCard
          title="Active Agents"
          value={String(agents.length)}
          description="Autonomous trading agents"
          icon={Bot}
        />
        <StatCard
          title="Trades Logged"
          value={String(trades.length)}
          description={`${completedTrades.length} executed`}
          icon={TrendingUp}
        />
        <StatCard
          title="Latest Signal"
          value={lastSignal?.action || "—"}
          description={lastSignal?.regime ? `${lastSignal.regime} regime` : "Run an agent to fetch CMC data"}
          icon={Zap}
        />
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>BNB Hack — AI Trading Agent Edition</CardTitle>
            <CardDescription>
              Read CMC signals → decide → execute on BSC via Trust Wallet Agent Kit
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex flex-wrap gap-2">
              <Badge variant="outline">Track 1: Autonomous Agents</Badge>
              <Badge variant="outline">Track 2: Strategy Skills</Badge>
              <Badge variant="success">CMC Agent Hub</Badge>
              <Badge variant="outline">Trust Wallet Agent Kit</Badge>
              <Badge variant="outline">BNB Chain</Badge>
            </div>
            <p className="text-sm text-gray-600 dark:text-slate-400">
              SignalForge connects CoinMarketCap market intelligence to rule-based and backtested
              strategies, then routes execution through TWAK on BNB Smart Chain testnet.
            </p>
            <div className="flex flex-wrap gap-2">
              <Button onClick={() => onNavigate("agent")}>Configure Agent</Button>
              <Button variant="outline" onClick={() => onNavigate("strategies")}>
                Run Strategy Skill
              </Button>
              <Button variant="outline" onClick={() => onNavigate("chart")}>
                Open Chart
              </Button>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Recent Activity</CardTitle>
            <CardDescription>Latest agent decisions and executions</CardDescription>
          </CardHeader>
          <CardContent>
            {trades.length === 0 ? (
              <p className="text-sm text-gray-500 dark:text-slate-400">
                No trades yet. Create an agent and run it to pull live CMC signals.
              </p>
            ) : (
              <ul className="space-y-3">
                {trades.slice(0, 5).map((trade) => (
                  <li
                    key={trade._id}
                    className="flex items-center justify-between rounded-lg border border-gray-100 px-3 py-2 dark:border-slate-800"
                  >
                    <div>
                      <p className="text-sm font-medium">
                        {trade.action} {trade.symbol}
                      </p>
                      <p className="text-xs text-gray-500 dark:text-slate-400">
                        {trade.executionMode} · {trade.status}
                      </p>
                    </div>
                    <Badge
                      variant={
                        trade.action === "BUY"
                          ? "success"
                          : trade.action === "SELL"
                            ? "destructive"
                            : "outline"
                      }
                    >
                      {trade.confidence ? `${Math.round(trade.confidence * 100)}%` : trade.action}
                    </Badge>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

function StatCard({
  title,
  value,
  description,
  icon: Icon,
}: {
  title: string;
  value: string;
  description: string;
  icon: typeof Bot;
}) {
  return (
    <Card>
      <CardContent className="flex items-start gap-4 p-5">
        <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-blue-50 dark:bg-blue-950">
          <Icon className="h-5 w-5 text-blue-600 dark:text-blue-400" />
        </div>
        <div>
          <p className="text-sm text-gray-500 dark:text-slate-400">{title}</p>
          <p className="text-2xl font-bold text-gray-900 dark:text-slate-100">{value}</p>
          <p className="text-xs text-gray-500 dark:text-slate-500">{description}</p>
        </div>
      </CardContent>
    </Card>
  );
}
