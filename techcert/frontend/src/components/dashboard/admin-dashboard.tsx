"use client";

import { useEffect, useState, useCallback } from "react";
import { LoginForm } from "@/components/dashboard/login-form";
import { AgentOverview } from "@/components/dashboard/agent-overview";
import { AgentConsole } from "@/components/dashboard/agent-console";
import { StrategiesPanel } from "@/components/dashboard/strategies-panel";
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
import { api, type Agent, type Trade, type StrategyRun } from "@/lib/api";

export function AdminDashboard() {
  const [authenticated, setAuthenticated] = useState(false);
  const [agents, setAgents] = useState<Agent[]>([]);
  const [trades, setTrades] = useState<Trade[]>([]);
  const [strategyRuns, setStrategyRuns] = useState<StrategyRun[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<DashboardTab>("overview");
  const [mobileNavOpen, setMobileNavOpen] = useState(false);

  const loadData = useCallback(async () => {
    try {
      const [agentsRes, tradesRes, strategiesRes] = await Promise.all([
        api.getAgents(),
        api.getTrades(),
        api.getStrategyRuns(),
      ]);
      setAgents(agentsRes.agents);
      setTrades(tradesRes.trades);
      setStrategyRuns(strategiesRes.runs);
    } catch {
      setAuthenticated(false);
      api.logout();
    }
  }, []);

  useEffect(() => {
    const token = api.getToken();
    if (token) {
      setAuthenticated(true);
      loadData().finally(() => setLoading(false));
    } else {
      setLoading(false);
    }
  }, [loadData]);

  function handleLogout() {
    api.logout();
    setAuthenticated(false);
    setAgents([]);
    setTrades([]);
    setStrategyRuns([]);
    setActiveTab("overview");
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
          <LoginForm onSuccess={() => { setAuthenticated(true); loadData(); }} />
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen bg-slate-100 dark:bg-slate-900">
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

      <div className="flex min-h-screen flex-1 flex-col overflow-hidden">
        <DashboardTopBar
          activeTab={activeTab}
          onTabChange={setActiveTab}
          onMenuOpen={() => setMobileNavOpen(true)}
          tradeCount={trades.length}
        />

        <main className="flex-1 overflow-y-auto p-4 sm:p-6 lg:p-8">
          {activeTab === "overview" && (
            <TabContent tabKey="overview">
              <AgentOverview agents={agents} trades={trades} onNavigate={setActiveTab} />
            </TabContent>
          )}

          {activeTab === "agent" && (
            <TabContent tabKey="agent">
              <AgentConsole agents={agents} onRefresh={loadData} />
            </TabContent>
          )}

          {activeTab === "strategies" && (
            <TabContent tabKey="strategies">
              <StrategiesPanel runs={strategyRuns} onRefresh={loadData} />
            </TabContent>
          )}

          {activeTab === "trades" && (
            <TabContent tabKey="trades">
              <TradesPanel trades={trades} />
            </TabContent>
          )}

          {activeTab === "settings" && (
            <TabContent tabKey="settings">
              <SettingsPanel />
            </TabContent>
          )}
        </main>
      </div>
    </div>
  );
}
