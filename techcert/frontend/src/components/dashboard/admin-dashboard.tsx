"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { AuthForm } from "@/components/dashboard/auth-form";
import { AgentOverview } from "@/components/dashboard/agent-overview";
import { AgentConsole } from "@/components/dashboard/agent-console";
import { StrategiesPanel } from "@/components/dashboard/strategies-panel";
import { ChartPanel } from "@/components/dashboard/chart-panel";
import { TradesPanel } from "@/components/dashboard/trades-panel";
import { SettingsPanel } from "@/components/dashboard/settings-panel";
import {
  DashboardSidebar,
  DashboardMobileNav,
  DashboardTopBar,
  type DashboardTab,
} from "@/components/dashboard/dashboard-sidebar";
import { TabContent } from "@/components/ui/tab-content";
import { ThemeToggle } from "@/components/theme/theme-toggle";
import {
  SignalToastStack,
  useSignalToasts,
} from "@/components/notifications/signal-toast-stack";
import {
  areNotificationsEnabled,
  type SignalNotificationPayload,
} from "@/lib/signal-notifications";
import {
  detectLiveSignalNotifications,
  detectNewSignalNotifications,
  emitSignalNotification,
  snapshotAgentActions,
  snapshotRunIds,
  snapshotTradeIds,
} from "@/lib/signal-watcher";
import { api, type Agent, type Trade, type StrategyRun, type StrategySchedule, type TradingSignal } from "@/lib/api";

const REALTIME_POLL_MS = 5_000;
const FULL_REFRESH_MS = 15_000;

export function AdminDashboard() {
  const [authenticated, setAuthenticated] = useState(false);
  const [agents, setAgents] = useState<Agent[]>([]);
  const [trades, setTrades] = useState<Trade[]>([]);
  const [strategyRuns, setStrategyRuns] = useState<StrategyRun[]>([]);
  const [strategySchedule, setStrategySchedule] = useState<StrategySchedule | null>(null);
  const [liveMarketSignal, setLiveMarketSignal] = useState<TradingSignal | null>(null);
  const [highlightTradeId, setHighlightTradeId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<DashboardTab>("overview");
  const [mobileNavOpen, setMobileNavOpen] = useState(false);
  const [dataReady, setDataReady] = useState(false);

  const { toasts, pushToast, dismissToast } = useSignalToasts();
  const tradeIdsRef = useRef<Set<string>>(new Set());
  const runIdsRef = useRef<Set<string>>(new Set());
  const agentActionsRef = useRef<Map<string, string>>(new Map());
  const scheduleActionRef = useRef<string | null>(null);
  const marketActionRef = useRef<string | null>(null);
  const bootstrappedRef = useRef(false);

  const notifySignals = useCallback(
    (notifications: SignalNotificationPayload[]) => {
      if (!areNotificationsEnabled()) return;
      for (const payload of notifications) {
        emitSignalNotification(payload);
        pushToast(payload);
      }
    },
    [pushToast],
  );

  const syncSignalSnapshots = useCallback(
    (nextAgents: Agent[], schedule: StrategySchedule | null, marketSignal: TradingSignal | null) => {
      agentActionsRef.current = snapshotAgentActions(nextAgents);
      scheduleActionRef.current = schedule?.lastSignal?.action ?? null;
      marketActionRef.current = marketSignal?.action ?? null;
    },
    [],
  );

  const loadData = useCallback(async () => {
    try {
      const [agentsRes, tradesRes, strategiesRes] = await Promise.all([
        api.getAgents(),
        api.getTrades(),
        api.getStrategyRuns(),
      ]);

      const notifications = detectNewSignalNotifications(
        tradeIdsRef.current,
        tradesRes.trades,
        runIdsRef.current,
        strategiesRes.runs,
        bootstrappedRef.current,
      );
      notifySignals(notifications);

      tradeIdsRef.current = snapshotTradeIds(tradesRes.trades);
      runIdsRef.current = snapshotRunIds(strategiesRes.runs);

      if (!bootstrappedRef.current) {
        syncSignalSnapshots(agentsRes.agents, strategiesRes.schedule, null);
        bootstrappedRef.current = true;
      }

      setDataReady(true);
      setAgents(agentsRes.agents);
      setTrades(tradesRes.trades);
      setStrategyRuns(strategiesRes.runs);
      setStrategySchedule(strategiesRes.schedule);
    } catch {
      setAuthenticated(false);
      api.logout();
    }
  }, [notifySignals, syncSignalSnapshots]);

  const pollLiveStatus = useCallback(async () => {
    try {
      const live = await api.getLiveStatus();

      const notifications = detectLiveSignalNotifications(
        agentActionsRef.current,
        live.agents,
        scheduleActionRef.current,
        live.schedule,
        marketActionRef.current,
        live.marketSignal,
        bootstrappedRef.current,
      );
      notifySignals(notifications);

      syncSignalSnapshots(live.agents, live.schedule, live.marketSignal);

      setAgents(live.agents);
      setStrategySchedule(live.schedule);
      setLiveMarketSignal(live.marketSignal);
      setDataReady(true);
      if (!bootstrappedRef.current) {
        bootstrappedRef.current = true;
      }
    } catch {
      // keep polling — auth errors handled by full refresh
    }
  }, [notifySignals, syncSignalSnapshots]);

  useEffect(() => {
    const token = api.getToken();
    if (token) {
      setAuthenticated(true);
      loadData()
        .then(() => pollLiveStatus())
        .finally(() => setLoading(false));
    } else {
      setLoading(false);
    }
  }, [loadData, pollLiveStatus]);

  useEffect(() => {
    if (!authenticated || !dataReady) return;

    pollLiveStatus();
    const timer = window.setInterval(() => {
      pollLiveStatus().catch(() => {});
    }, REALTIME_POLL_MS);

    return () => window.clearInterval(timer);
  }, [authenticated, dataReady, pollLiveStatus]);

  useEffect(() => {
    if (!authenticated || !dataReady) return;

    const timer = window.setInterval(() => {
      loadData().catch(() => {});
    }, FULL_REFRESH_MS);

    return () => window.clearInterval(timer);
  }, [authenticated, dataReady, loadData]);

  function handleLogout() {
    api.logout();
    setAuthenticated(false);
    setAgents([]);
    setTrades([]);
    setStrategyRuns([]);
    setStrategySchedule(null);
    setActiveTab("overview");
    bootstrappedRef.current = false;
    tradeIdsRef.current = new Set();
    runIdsRef.current = new Set();
    agentActionsRef.current = new Map();
    scheduleActionRef.current = null;
    marketActionRef.current = null;
    setLiveMarketSignal(null);
    setHighlightTradeId(null);
    setDataReady(false);
  }

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-950">
        <div className="motion-safe:animate-fade-in text-center">
          <div className="mx-auto h-10 w-10 animate-spin rounded-full border-4 border-blue-500 border-t-transparent" />
          <p className="mt-4 text-sm text-slate-400">Loading agent console...</p>
        </div>
      </div>
    );
  }

  if (!authenticated) {
    return (
      <div className="relative flex min-h-screen items-center justify-center bg-gradient-to-br from-slate-100 via-white to-blue-50 px-4 py-8 dark:from-slate-950 dark:via-slate-900 dark:to-blue-950">
        <div className="absolute right-4 top-4 sm:right-6 sm:top-6">
          <ThemeToggle />
        </div>
        <div className="motion-safe:animate-scale-in w-full max-w-md animate-fill-both">
          <AuthForm onSuccess={() => { setAuthenticated(true); loadData(); }} />
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-screen overflow-hidden bg-slate-100 dark:bg-slate-900">
      <DashboardSidebar
        activeTab={activeTab}
        onTabChange={setActiveTab}
        onLogout={handleLogout}
        tradeCount={trades.length}
      />
      <DashboardMobileNav
        activeTab={activeTab}
        onTabChange={setActiveTab}
        onLogout={handleLogout}
        tradeCount={trades.length}
        open={mobileNavOpen}
        onClose={() => setMobileNavOpen(false)}
      />

      <div className="flex min-h-0 flex-1 flex-col overflow-hidden">
        <DashboardTopBar
          activeTab={activeTab}
          onTabChange={setActiveTab}
          onMenuOpen={() => setMobileNavOpen(true)}
          tradeCount={trades.length}
          liveSignal={liveMarketSignal}
          monitoring={Boolean(strategySchedule?.isAutomated || agents.some((a) => a.isAutomated))}
        />

        <main className="min-h-0 flex-1 overflow-y-auto overscroll-contain p-4 sm:p-6 lg:p-8">
          {activeTab === "overview" && (
            <TabContent tabKey="overview">
              <AgentOverview agents={agents} trades={trades} onNavigate={setActiveTab} />
            </TabContent>
          )}

          {activeTab === "agent" && (
            <TabContent tabKey="agent">
              <AgentConsole
                agents={agents}
                trades={trades}
                onRefresh={loadData}
                onTradeExecuted={(tradeId) => {
                  setHighlightTradeId(tradeId);
                  setActiveTab("chart");
                }}
              />
            </TabContent>
          )}

          {activeTab === "strategies" && (
            <TabContent tabKey="strategies">
              <StrategiesPanel
                runs={strategyRuns}
                schedule={strategySchedule}
                onRefresh={loadData}
              />
            </TabContent>
          )}

          {activeTab === "chart" && (
            <TabContent tabKey="chart">
              <ChartPanel
                trades={trades}
                runs={strategyRuns}
                highlightTradeId={highlightTradeId}
                onHighlightTrade={setHighlightTradeId}
                onRefresh={loadData}
              />
            </TabContent>
          )}

          {activeTab === "trades" && (
            <TabContent tabKey="trades">
              <TradesPanel
                trades={trades}
                onRefresh={loadData}
                onViewOnChart={(tradeId) => {
                  setHighlightTradeId(tradeId);
                  setActiveTab("chart");
                }}
              />
            </TabContent>
          )}

          {activeTab === "settings" && (
            <TabContent tabKey="settings">
              <SettingsPanel onTestNotification={notifySignals} />
            </TabContent>
          )}
        </main>
      </div>

      <SignalToastStack toasts={toasts} onDismiss={dismissToast} />
    </div>
  );
}
