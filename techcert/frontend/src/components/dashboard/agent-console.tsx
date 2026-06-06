"use client";

import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Bot, Play, Plus, RefreshCw } from "lucide-react";
import { api, type Agent } from "@/lib/api";

interface AgentConsoleProps {
  agents: Agent[];
  onRefresh: () => Promise<void>;
}

export function AgentConsole({ agents, onRefresh }: AgentConsoleProps) {
  const [name, setName] = useState("BNB Momentum Agent");
  const [maxTradeUsd, setMaxTradeUsd] = useState("50");
  const [minConfidence, setMinConfidence] = useState("0.6");
  const [loading, setLoading] = useState(false);
  const [runningId, setRunningId] = useState<string | null>(null);
  const [error, setError] = useState("");
  const [lastResult, setLastResult] = useState<string>("");

  async function handleCreate() {
    setLoading(true);
    setError("");
    try {
      await api.createAgent({
        name,
        symbol: "BNB",
        maxTradeUsd: Number(maxTradeUsd),
        minConfidence: Number(minConfidence),
      });
      await onRefresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to create agent");
    } finally {
      setLoading(false);
    }
  }

  async function handleRun(agentId: string) {
    setRunningId(agentId);
    setError("");
    setLastResult("");
    try {
      const result = await api.runAgent(agentId);
      setLastResult(
        result.executed
          ? `${result.signal.action} executed (${result.trade.executionMode})`
          : `Signal: ${result.signal.action} — ${result.trade.reasoning}`
      );
      await onRefresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Agent run failed");
    } finally {
      setRunningId(null);
    }
  }

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Bot className="h-5 w-5" />
            Autonomous Trading Agent
          </CardTitle>
          <CardDescription>
            Track 1 — reads CoinMarketCap signals, decides, executes via Trust Wallet Agent Kit on BSC testnet
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="agentName">Agent name</Label>
              <Input id="agentName" value={name} onChange={(e) => setName(e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="maxTrade">Max trade (USD)</Label>
              <Input
                id="maxTrade"
                type="number"
                min="1"
                value={maxTradeUsd}
                onChange={(e) => setMaxTradeUsd(e.target.value)}
              />
            </div>
            <div className="space-y-2 sm:col-span-2">
              <Label htmlFor="confidence">Min confidence (0–1)</Label>
              <Input
                id="confidence"
                type="number"
                min="0"
                max="1"
                step="0.05"
                value={minConfidence}
                onChange={(e) => setMinConfidence(e.target.value)}
              />
            </div>
          </div>
          <Button onClick={handleCreate} disabled={loading} className="gap-2">
            <Plus className="h-4 w-4" />
            Create Agent
          </Button>
        </CardContent>
      </Card>

      {error && (
        <p className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700 dark:border-red-900 dark:bg-red-950 dark:text-red-300">
          {error}
        </p>
      )}
      {lastResult && (
        <p className="rounded-lg border border-green-200 bg-green-50 px-4 py-3 text-sm text-green-800 dark:border-green-900 dark:bg-green-950 dark:text-green-300">
          {lastResult}
        </p>
      )}

      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle>Your Agents</CardTitle>
            <CardDescription>Run manually or integrate with TWAK for autonomous mode</CardDescription>
          </div>
          <Button variant="outline" size="sm" onClick={onRefresh} className="gap-2">
            <RefreshCw className="h-4 w-4" />
            Refresh
          </Button>
        </CardHeader>
        <CardContent className="space-y-3">
          {agents.length === 0 ? (
            <p className="text-sm text-gray-500">No agents yet. Create one above.</p>
          ) : (
            agents.map((agent) => (
              <div
                key={agent._id}
                className="flex flex-col gap-3 rounded-lg border border-gray-100 p-4 sm:flex-row sm:items-center sm:justify-between dark:border-slate-800"
              >
                <div>
                  <p className="font-medium">{agent.name}</p>
                  <p className="text-sm text-gray-500 dark:text-slate-400">
                    {agent.symbol} · max ${agent.maxTradeUsd} · min conf {(agent.minConfidence * 100).toFixed(0)}%
                  </p>
                  {agent.lastSignal && (
                    <div className="mt-2 flex flex-wrap gap-2">
                      <Badge variant="outline">{agent.lastSignal.regime}</Badge>
                      <Badge variant="success">{agent.lastSignal.action}</Badge>
                    </div>
                  )}
                </div>
                <Button
                  onClick={() => handleRun(agent._id)}
                  disabled={runningId === agent._id}
                  className="gap-2"
                >
                  <Play className="h-4 w-4" />
                  {runningId === agent._id ? "Running..." : "Run Agent"}
                </Button>
              </div>
            ))
          )}
        </CardContent>
      </Card>
    </div>
  );
}
