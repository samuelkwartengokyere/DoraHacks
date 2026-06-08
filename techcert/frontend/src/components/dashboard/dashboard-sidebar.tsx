"use client";

import Link from "next/link";
import {
  LayoutDashboard,
  Bot,
  LineChart,
  ChartCandlestick,
  Activity,
  LogOut,
  ExternalLink,
  Menu,
  X,
  Settings,
} from "lucide-react";
import { LogoMark } from "@/components/brand/logo";
import { LiveSignalBadge } from "@/components/dashboard/live-signal-badge";
import { InstallAppButton } from "@/components/pwa/install-app-button";
import { ThemeToggle } from "@/components/theme/theme-toggle";
import { cn } from "@/lib/utils";
import { api, type TradingSignal } from "@/lib/api";

export type DashboardTab = "overview" | "agent" | "strategies" | "chart" | "trades" | "settings";

interface DashboardSidebarProps {
  activeTab: DashboardTab;
  onTabChange: (tab: DashboardTab) => void;
  onLogout: () => void;
  tradeCount: number;
}

const mainNav: { id: DashboardTab; label: string; icon: typeof LayoutDashboard }[] = [
  { id: "overview", label: "Overview", icon: LayoutDashboard },
  { id: "agent", label: "Trading Agent", icon: Bot },
  { id: "strategies", label: "Strategy Skills", icon: LineChart },
  { id: "chart", label: "Chart", icon: ChartCandlestick },
  { id: "trades", label: "Trade Log", icon: Activity },
];

export function DashboardSidebar({
  activeTab,
  onTabChange,
  onLogout,
  tradeCount,
}: DashboardSidebarProps) {
  return (
    <aside className="hidden h-full w-64 shrink-0 flex-col self-stretch border-r border-slate-800/80 bg-slate-950 lg:flex">
      <SidebarContent
        activeTab={activeTab}
        onTabChange={onTabChange}
        onLogout={onLogout}
        tradeCount={tradeCount}
      />
    </aside>
  );
}

export function DashboardMobileNav({
  activeTab,
  onTabChange,
  onLogout,
  tradeCount,
  open,
  onClose,
}: DashboardSidebarProps & { open: boolean; onClose: () => void }) {
  return (
    <div
      className={cn("fixed inset-0 z-50 lg:hidden", !open && "hidden")}
      aria-hidden={!open}
    >
      <div
        className={cn(
          "absolute inset-0 bg-black/60 backdrop-blur-sm transition-opacity duration-300",
          open ? "opacity-100" : "opacity-0"
        )}
        onClick={onClose}
      />
      <aside
        className={cn(
          "absolute left-0 top-0 flex h-full w-[min(18rem,85vw)] flex-col overflow-hidden bg-slate-950 shadow-2xl transition-transform duration-300 ease-out sm:w-72",
          open ? "translate-x-0" : "-translate-x-full"
        )}
      >
        <div className="flex shrink-0 items-center justify-between border-b border-slate-800 px-5 py-4">
          <span className="font-semibold text-white">Menu</span>
          <button onClick={onClose} className="cursor-pointer rounded-lg p-1.5 text-slate-400 hover:bg-slate-800 hover:text-white" aria-label="Close menu">
            <X className="h-5 w-5" />
          </button>
        </div>
        <SidebarContent
          activeTab={activeTab}
          onTabChange={(tab) => { onTabChange(tab); onClose(); }}
          onLogout={onLogout}
          tradeCount={tradeCount}
        />
      </aside>
    </div>
  );
}

function SidebarContent({
  activeTab,
  onTabChange,
  onLogout,
  tradeCount,
}: DashboardSidebarProps) {
  const user = api.getUser();
  const initial = (user?.name?.[0] || user?.email?.[0] || "U").toUpperCase();

  return (
    <div className="flex min-h-0 flex-1 flex-col overflow-hidden">
      <div className="shrink-0 border-b border-slate-800 px-5 py-5">
        <div className="flex items-center gap-3">
          <LogoMark size="md" />
          <div>
            <p className="font-bold text-white">SignalForge AI</p>
            <p className="text-xs text-slate-500">BNB Hack Agent Console</p>
          </div>
        </div>
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto overscroll-y-contain px-4 py-4">
        <p className="mb-2 px-3 text-[10px] font-semibold uppercase tracking-wider text-slate-500">
          Agent Stack
        </p>
        <nav className="space-y-0.5">
          {mainNav.map((item) => (
            <SidebarNavItem
              key={item.id}
              item={item}
              active={activeTab === item.id}
              onClick={() => onTabChange(item.id)}
              badge={item.id === "trades" ? tradeCount : undefined}
            />
          ))}
        </nav>

        <p className="mb-2 mt-6 px-3 text-[10px] font-semibold uppercase tracking-wider text-slate-500">
          Settings
        </p>
        <nav className="space-y-0.5">
          <SidebarNavItem
            item={{ id: "settings", label: "Settings", icon: Settings }}
            active={activeTab === "settings"}
            onClick={() => onTabChange("settings")}
          />
        </nav>
      </div>

      <div className="mt-auto shrink-0 border-t border-slate-800 p-4 pb-[max(1rem,env(safe-area-inset-bottom,0px))]">
        <div className="mb-3 flex items-center gap-3 rounded-lg bg-slate-900 px-3 py-3">
          <div className="flex h-9 w-9 items-center justify-center rounded-full bg-orange-600 text-sm font-bold text-white">
            {initial}
          </div>
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-medium text-white">{user?.name || "Account"}</p>
            <p className="truncate text-xs text-slate-500">{user?.email || "Signed in"}</p>
          </div>
        </div>
        <div className="space-y-0.5">
          <div className="lg:hidden">
            <InstallAppButton
              variant="menu-item"
              className="px-3 py-2 text-slate-400 hover:bg-slate-800 hover:text-white"
            />
          </div>
          <Link
            href="/"
            className="flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium text-slate-400 transition-colors hover:bg-slate-800 hover:text-white"
          >
            <ExternalLink className="h-4 w-4" />
            Public Site
          </Link>
          <button
            onClick={onLogout}
            className="flex w-full items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium text-slate-400 transition-colors hover:bg-slate-800 hover:text-red-400"
          >
            <LogOut className="h-4 w-4" />
            Sign Out
          </button>
        </div>
      </div>
    </div>
  );
}

function SidebarNavItem({
  item,
  active,
  onClick,
  badge,
}: {
  item: { id: string; label: string; icon: typeof LayoutDashboard };
  active: boolean;
  onClick: () => void;
  badge?: number;
}) {
  return (
    <button
      onClick={onClick}
      className={cn(
        "relative flex w-full cursor-pointer items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-all",
        active
          ? "bg-orange-600/15 text-orange-400"
          : "text-slate-400 hover:bg-slate-800/60 hover:text-white"
      )}
    >
      {active && (
        <span className="absolute left-0 top-1/2 h-6 w-1 -translate-y-1/2 rounded-r-full bg-orange-500" />
      )}
      <item.icon className={cn("h-4 w-4 shrink-0", active && "text-orange-400")} />
      <span className="flex-1 text-left">{item.label}</span>
      {badge !== undefined && badge > 0 && (
        <span className={cn(
          "rounded-full px-2 py-0.5 text-xs font-medium",
          active ? "bg-orange-600 text-white" : "bg-slate-800 text-slate-400"
        )}>
          {badge}
        </span>
      )}
    </button>
  );
}

export function DashboardTopBar({
  activeTab,
  onTabChange,
  onMenuOpen,
  tradeCount,
  liveSignal,
  monitoring,
}: {
  activeTab: DashboardTab;
  onTabChange: (tab: DashboardTab) => void;
  onMenuOpen: () => void;
  tradeCount: number;
  liveSignal?: TradingSignal | null;
  monitoring?: boolean;
}) {
  const titles: Record<DashboardTab, string> = {
    overview: "Agent Overview",
    agent: "Autonomous Trading Agent",
    strategies: "CMC Strategy Skills",
    chart: "Market Chart",
    trades: "Trade Log",
    settings: "Settings",
  };

  const descriptions: Record<DashboardTab, string> = {
    overview: "Monitor CMC signals, agents, and BSC execution status",
    agent: "Track 1 — live BUY / SELL / HOLD signals, execute when you choose",
    strategies: "Track 2 — backtestable skills powered by CoinMarketCap",
    chart: "Broker-style candlesticks, volume, and trade signal overlays",
    trades: "On-chain and paper trades from your agents",
    settings: "General configuration, integrations, and hackathon stack status",
  };

  const tabItems: { id: DashboardTab; label: string }[] = [
    { id: "overview", label: "Overview" },
    { id: "agent", label: "Agent" },
    { id: "strategies", label: "Strategies" },
    { id: "chart", label: "Chart" },
    { id: "trades", label: "Trades" },
    { id: "settings", label: "Settings" },
  ];

  return (
    <header className="z-10 shrink-0 border-b border-gray-200 bg-white dark:border-slate-800 dark:bg-slate-900">
      <div className="flex items-center gap-4 px-4 py-4 sm:px-6">
        <button
          onClick={onMenuOpen}
          className="cursor-pointer rounded-lg border border-gray-200 p-2 text-gray-600 hover:bg-gray-50 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800 lg:hidden"
          aria-label="Open menu"
        >
          <Menu className="h-5 w-5" />
        </button>
        <div className="min-w-0 flex-1">
          <h1 className="truncate text-lg font-bold text-gray-900 dark:text-slate-100 sm:text-xl">{titles[activeTab]}</h1>
          <p className="hidden truncate text-sm text-gray-500 dark:text-slate-400 sm:block">{descriptions[activeTab]}</p>
        </div>
        <div className="flex shrink-0 items-center gap-2">
          <InstallAppButton variant="compact" className="lg:hidden" />
          <LiveSignalBadge signal={liveSignal ?? null} monitoring={monitoring} />
          <ThemeToggle />
          <span className="hidden rounded-full bg-amber-100 px-2.5 py-1 text-xs font-medium text-amber-800 dark:bg-amber-950 dark:text-amber-300 sm:inline-flex sm:px-3">
            BNB Hack
          </span>
          <span className="rounded-full bg-gray-100 px-2.5 py-1 text-xs font-medium text-gray-600 dark:bg-slate-800 dark:text-slate-300 sm:px-3">
            {tradeCount} trades
          </span>
        </div>
      </div>

      <div className="overflow-x-auto border-t border-gray-100 px-4 scrollbar-thin dark:border-slate-800 sm:px-6">
        <div className="flex min-w-max gap-1 py-2 sm:min-w-0">
          {tabItems.map((tab) => (
            <button
              key={tab.id}
              onClick={() => onTabChange(tab.id)}
              className={cn(
                "shrink-0 cursor-pointer rounded-md px-4 py-2 text-sm font-medium transition-colors",
                activeTab === tab.id
                  ? "bg-orange-50 text-orange-600 dark:bg-orange-950 dark:text-orange-400"
                  : "text-gray-500 hover:bg-gray-50 hover:text-gray-900 dark:text-slate-400 dark:hover:bg-slate-800 dark:hover:text-slate-100"
              )}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>
    </header>
  );
}
