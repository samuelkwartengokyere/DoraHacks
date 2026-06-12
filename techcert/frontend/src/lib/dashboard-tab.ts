import type { DashboardTab } from "@/components/dashboard/dashboard-sidebar";

const DASHBOARD_TABS: DashboardTab[] = [
  "overview",
  "competition",
  "agent",
  "strategies",
  "chart",
  "trades",
  "settings",
];

export function isDashboardTab(value: string | null | undefined): value is DashboardTab {
  return Boolean(value && DASHBOARD_TABS.includes(value as DashboardTab));
}

export function parseDashboardTab(value: string | null | undefined): DashboardTab {
  return isDashboardTab(value) ? value : "overview";
}

export function readDashboardTabFromLocation(): DashboardTab {
  if (typeof window === "undefined") return "overview";
  return parseDashboardTab(new URLSearchParams(window.location.search).get("tab"));
}

export function writeDashboardTabToLocation(tab: DashboardTab) {
  if (typeof window === "undefined") return;

  const url = new URL(window.location.href);
  if (tab === "overview") {
    url.searchParams.delete("tab");
  } else {
    url.searchParams.set("tab", tab);
  }

  const next = `${url.pathname}${url.search}${url.hash}`;
  const current = `${window.location.pathname}${window.location.search}${window.location.hash}`;
  if (next !== current) {
    window.history.replaceState(window.history.state, "", next);
  }
}
