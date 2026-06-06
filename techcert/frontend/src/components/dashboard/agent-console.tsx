"use client";

import { useEffect, useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Bell,
  Bot,
  ChartCandlestick,
  Check,
  Copy,
  Play,
  Plus,
  RefreshCw,
  Square,
  XCircle,
  Zap,
} from "lucide-react";
import { api, type Agent, type Trade, type TradingSignal } from "@/lib/api";
import { SignalDurationPanel } from "@/components/dashboard/signal-duration-panel";
import { isOpenTrade } from "@/lib/trade-utils";

const POLL_MS = 15_000;
const CREATE_TAB = "__create__";

interface AgentConsoleProps {
  agents: Agent[];
  trades: Trade[];
  onRefresh: () => Promise<void>;
  onTradeExecuted?: (tradeId: string) => void;
}

function tradeAgentId(trade: Trade) {
  const id = trade.agentId as string | { _id?: string };
  return typeof id === "object" && id?._id ? id._id : String(trade.agentId);
}

function actionBadgeVariant(action: string) {
  if (action === "BUY") return "success" as const;
  if (action === "SELL") return "destructive" as const;
  return "outline" as const;
}

function CopyableAgentAddress({ address }: { address: string }) {
  const [copied, setCopied] = useState(false);

  async function handleCopy() {
    try {
      await navigator.clipboard.writeText(address);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 2000);
    } catch {
      setCopied(false);
    }
  }

  return (
    <div className="flex flex-wrap items-center gap-2 rounded-lg border border-gray-100 bg-gray-50/80 px-3 py-2 dark:border-slate-800 dark:bg-slate-900/50">
      <span className="text-xs font-medium text-gray-500 dark:text-slate-400">Agent address</span>
      <code className="min-w-0 flex-1 truncate font-mono text-xs text-gray-900 dark:text-slate-100">
        {address}
      </code>
      <Button
        type="button"
        variant="outline"
        size="sm"
        className="h-7 shrink-0 gap-1.5 px-2 text-xs"
        onClick={handleCopy}
      >
        {copied ? (
          <>
            <Check className="h-3.5 w-3.5" />
            Copied
          </>
        ) : (
          <>
            <Copy className="h-3.5 w-3.5" />
            Copy
          </>
        )}
      </Button>
    </div>
  );
}

interface AgentTabPanelProps {
  agent: Agent;
  openTrades: Trade[];
  fallbackSignal: TradingSignal | null;
  actionId: string | null;
  onCheckSignal: (agentId: string) => void;
  onStartMonitor: (agentId: string) => void;
  onStopMonitor: (agentId: string) => void;
  onExecuteTrade: (agentId: string) => void;
  onCancelTrade: (tradeId: string) => void;
  onViewOnChart: (tradeId: string) => void;
}

function AgentTabPanel({
  agent,
  openTrades,
  fallbackSignal,
  actionId,
  onCheckSignal,
  onStartMonitor,
  onStopMonitor,
  onExecuteTrade,
  onCancelTrade,
  onViewOnChart,
}: AgentTabPanelProps) {
  const signal = agent.lastSignal ?? fallbackSignal;
  const busy = actionId === agent._id;

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-2 text-sm text-gray-500 dark:text-slate-400">
        <span>{agent.symbol}</span>
        <span>·</span>
        <span>max ${agent.maxTradeUsd}</span>
        <span>·</span>
        <span>min conf {(agent.minConfidence * 100).toFixed(0)}%</span>
        {agent.lastRunAt && (
          <>
            <span>·</span>
            <span>last check {new Date(agent.lastRunAt).toLocaleTimeString()}</span>
          </>
        )}
        {agent.isAutomated && (
          <Badge variant="success" className="animate-pulse gap-1">
            <Bell className="h-3 w-3" />
            Monitoring · {agent.signalPollSeconds || 30}s
          </Badge>
        )}
      </div>

      {signal ? (
        <Card className="border-amber-200/70 bg-amber-50/40 dark:border-amber-900/50 dark:bg-amber-950/20">
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2 text-base">
              <Zap className="h-4 w-4 text-amber-500" />
              Current recommendation
            </CardTitle>
            <CardDescription>BUY / SELL / HOLD from CMC + MA crossover</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap items-center gap-3">
              <Badge variant={actionBadgeVariant(signal.action)} className="px-3 py-1 text-sm">
                {signal.action}
              </Badge>
              <span className="text-sm text-gray-600 dark:text-slate-300">
                {Math.round(signal.confidence * 100)}% confidence
              </span>
              <Badge variant="outline">{signal.regime}</Badge>
            </div>
            <p className="mt-2 text-sm text-gray-600 dark:text-slate-400">
              {signal.reasons.join(" · ")}
            </p>
            <SignalDurationPanel signal={signal} />
          </CardContent>
        </Card>
      ) : (
        <p className="text-sm text-gray-500 dark:text-slate-400">
          No signal yet — click Check signal now.
        </p>
      )}

      <div className="flex flex-wrap gap-2">
        <Button
          variant="outline"
          size="sm"
          onClick={() => onCheckSignal(agent._id)}
          disabled={busy}
          className="gap-2"
        >
          <Zap className="h-4 w-4" />
          {busy ? "Checking..." : "Check signal now"}
        </Button>
        {agent.isAutomated ? (
          <Button
            variant="destructive"
            size="sm"
            onClick={() => onStopMonitor(agent._id)}
            disabled={busy}
            className="gap-2"
          >
            <Square className="h-4 w-4" />
            Stop monitor
          </Button>
        ) : (
          <Button
            size="sm"
            onClick={() => onStartMonitor(agent._id)}
            disabled={busy}
            className="gap-2 bg-amber-500 hover:bg-amber-600"
          >
            <Bell className="h-4 w-4" />
            Start monitor
          </Button>
        )}
        <Button
          variant="outline"
          size="sm"
          onClick={() => onExecuteTrade(agent._id)}
          disabled={busy}
          className="gap-2"
        >
          <Play className="h-4 w-4" />
          Execute trade
        </Button>
      </div>

      {openTrades.length > 0 && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Open on chart</CardTitle>
            <CardDescription>
              Active paper trades — view on the Chart tab or cancel to close early
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-2">
            {openTrades.map((trade) => (
              <div
                key={trade._id}
                className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-gray-100 px-3 py-2 dark:border-slate-800"
              >
                <div className="flex flex-wrap items-center gap-2 text-sm">
                  <Badge variant={trade.action === "BUY" ? "success" : "destructive"}>
                    {trade.action}
                  </Badge>
                  <span>${trade.amountUsd}</span>
                  {trade.priceUsd != null && <span>@ ${trade.priceUsd.toFixed(2)}</span>}
                </div>
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    className="gap-1"
                    onClick={() => onViewOnChart(trade._id)}
                  >
                    <ChartCandlestick className="h-4 w-4" />
                    View chart
                  </Button>
                  <Button
                    variant="destructive"
                    size="sm"
                    className="gap-1"
                    disabled={busy}
                    onClick={() => onCancelTrade(trade._id)}
                  >
                    <XCircle className="h-4 w-4" />
                    Cancel
                  </Button>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      )}
    </div>
  );
}

export function AgentConsole({ agents, trades, onRefresh, onTradeExecuted }: AgentConsoleProps) {
  const [name, setName] = useState("BNB Momentum Agent");
  const [maxTradeUsd, setMaxTradeUsd] = useState("50");
  const [minConfidence, setMinConfidence] = useState("0.6");
  const [loading, setLoading] = useState(false);
  const [actionId, setActionId] = useState<string | null>(null);
  const [error, setError] = useState("");
  const [lastResult, setLastResult] = useState("");
  const [liveSignal, setLiveSignal] = useState<TradingSignal | null>(null);
  const [agentAddress, setAgentAddress] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState(CREATE_TAB);

  const hasMonitoredAgent = agents.some((agent) => agent.isAutomated);

  useEffect(() => {
    if (agents.length === 0) {
      setActiveTab(CREATE_TAB);
      return;
    }
    if (activeTab === CREATE_TAB) return;
    if (!agents.some((agent) => agent._id === activeTab)) {
      setActiveTab(agents[0]._id);
    }
  }, [agents, activeTab]);

  useEffect(() => {
    if (!hasMonitoredAgent) return;

    const timer = window.setInterval(() => {
      onRefresh().catch(() => {});
    }, POLL_MS);

    return () => window.clearInterval(timer);
  }, [hasMonitoredAgent, onRefresh]);

  useEffect(() => {
    api.getPublicSignal("BNB").then((res) => setLiveSignal(res.signal)).catch(() => {});
  }, [agents]);

  useEffect(() => {
    api
      .getPlatformStatus(false)
      .then((status) => setAgentAddress(status.integrations.agentWallet?.address ?? null))
      .catch(() => {});
  }, []);

  async function handleCreate() {
    setLoading(true);
    setError("");
    try {
      const result = await api.createAgent({
        name,
        symbol: "BNB",
        maxTradeUsd: Number(maxTradeUsd),
        minConfidence: Number(minConfidence),
      });
      setActiveTab(result.agent._id);
      await onRefresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to create agent");
    } finally {
      setLoading(false);
    }
  }

  async function handleCheckSignal(agentId: string) {
    setActionId(agentId);
    setError("");
    setLastResult("");
    try {
      const result = await api.adviseAgent(agentId);
      const { signal } = result;
      const durationText = signal.duration?.beginnerGuide || signal.duration?.summary || signal.duration?.advice;
      setLastResult(
        `Current recommendation: ${signal.action} (${Math.round(signal.confidence * 100)}% confidence).${durationText ? ` ${durationText}` : ""}`
      );
      await onRefresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to check signal");
    } finally {
      setActionId(null);
    }
  }

  async function handleStartMonitor(agentId: string) {
    setActionId(agentId);
    setError("");
    setLastResult("");
    try {
      const result = await api.startAgentAutomation(agentId, 30);
      setLastResult(
        `Signal monitor started — notified when BUY, SELL, or HOLD changes (every ${result.agent.signalPollSeconds || 30}s).`
      );
      await onRefresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to start monitor");
    } finally {
      setActionId(null);
    }
  }

  async function handleStopMonitor(agentId: string) {
    setActionId(agentId);
    setError("");
    try {
      await api.stopAgentAutomation(agentId);
      setLastResult("Signal monitor stopped.");
      await onRefresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to stop monitor");
    } finally {
      setActionId(null);
    }
  }

  async function handleExecuteTrade(agentId: string) {
    setActionId(agentId);
    setError("");
    setLastResult("");
    try {
      const result = await api.runAgent(agentId);
      if (result.executed && result.trade.status === "open") {
        setLastResult(
          `${result.signal.action} opened on chart (${result.trade.executionMode}) — view Chart tab to cancel or track entry.`
        );
        onTradeExecuted?.(result.trade._id);
      } else {
        setLastResult(
          result.executed
            ? `${result.signal.action} executed (${result.trade.executionMode}).`
            : `${result.signal.action} not executed — ${result.trade.reasoning}`
        );
      }
      await onRefresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to execute trade");
    } finally {
      setActionId(null);
    }
  }

  async function handleCancelTrade(tradeId: string) {
    if (!window.confirm("Cancel this open trade?")) return;
    setActionId(tradeId);
    setError("");
    try {
      await api.cancelTrade(tradeId);
      setLastResult("Trade cancelled — removed from chart.");
      await onRefresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to cancel trade");
    } finally {
      setActionId(null);
    }
  }

  return (
    <div className="mx-auto max-w-4xl space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="flex items-center gap-2 text-lg font-semibold text-gray-900 dark:text-slate-100">
            <Bot className="h-5 w-5" />
            Trading Agent
          </h2>
          <p className="text-sm text-gray-500 dark:text-slate-400">
            Each created agent has its own tab — signals, duration, and controls
          </p>
        </div>
        <Button variant="outline" size="sm" onClick={onRefresh} className="gap-2">
          <RefreshCw className="h-4 w-4" />
          Refresh
        </Button>
      </div>

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

      {agentAddress ? (
        <CopyableAgentAddress address={agentAddress} />
      ) : (
        <p className="rounded-lg border border-dashed border-gray-200 px-3 py-2 text-xs text-gray-500 dark:border-slate-700 dark:text-slate-400">
          Agent address not configured — set PRIVATE_KEY or AGENT_WALLET_ADDRESS in backend/.env
        </p>
      )}

      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="h-auto w-full flex-wrap justify-start gap-1 p-1">
          <TabsTrigger value={CREATE_TAB} className="gap-1.5">
            <Plus className="h-3.5 w-3.5" />
            New Agent
          </TabsTrigger>
          {agents.map((agent) => (
            <TabsTrigger
              key={agent._id}
              value={agent._id}
              className="max-w-[11rem] gap-1.5 truncate"
            >
              <span className="truncate">{agent.name}</span>
              {agent.lastSignal && (
                <Badge
                  variant={actionBadgeVariant(agent.lastSignal.action)}
                  className="shrink-0 px-1.5 py-0 text-[10px]"
                >
                  {agent.lastSignal.action}
                </Badge>
              )}
              {agent.isAutomated && (
                <span className="h-1.5 w-1.5 shrink-0 animate-pulse rounded-full bg-green-500" />
              )}
            </TabsTrigger>
          ))}
        </TabsList>

        <TabsContent value={CREATE_TAB}>
          <Card>
            <CardHeader>
              <CardTitle>Create Agent</CardTitle>
              <CardDescription>
                Set up a new signal agent — then switch to its tab to check BUY / SELL / HOLD
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="agentName">Agent name</Label>
                  <Input id="agentName" value={name} onChange={(e) => setName(e.target.value)} />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="maxTrade">Max trade (USD, when executing)</Label>
                  <Input
                    id="maxTrade"
                    type="number"
                    min="1"
                    value={maxTradeUsd}
                    onChange={(e) => setMaxTradeUsd(e.target.value)}
                  />
                </div>
                <div className="space-y-2 sm:col-span-2">
                  <Label htmlFor="confidence">Min confidence to execute (0–1)</Label>
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
                {loading ? "Creating..." : "Create Agent"}
              </Button>
            </CardContent>
          </Card>
        </TabsContent>

        {agents.map((agent) => (
          <TabsContent key={agent._id} value={agent._id}>
            <Card>
              <CardHeader>
                <CardTitle>{agent.name}</CardTitle>
                <CardDescription>
                  Signal monitor and trade controls for this agent
                </CardDescription>
              </CardHeader>
              <CardContent>
                <AgentTabPanel
                  agent={agent}
                  openTrades={trades.filter(
                    (t) => isOpenTrade(t) && tradeAgentId(t) === agent._id,
                  )}
                  fallbackSignal={liveSignal}
                  actionId={actionId}
                  onCheckSignal={handleCheckSignal}
                  onStartMonitor={handleStartMonitor}
                  onStopMonitor={handleStopMonitor}
                  onExecuteTrade={handleExecuteTrade}
                  onCancelTrade={handleCancelTrade}
                  onViewOnChart={(tradeId) => onTradeExecuted?.(tradeId)}
                />
              </CardContent>
            </Card>
          </TabsContent>
        ))}
      </Tabs>
    </div>
  );
}
