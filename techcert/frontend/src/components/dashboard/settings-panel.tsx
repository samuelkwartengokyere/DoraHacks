"use client";

import { useCallback, useEffect, useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Database, Cloud, Link2, Shield, Sliders, RefreshCw, Bell } from "lucide-react";
import { api, type PlatformStatus } from "@/lib/api";
import {
  areBrowserNotificationsPreferred,
  areNotificationsEnabled,
  getBrowserNotificationPermission,
  requestBrowserNotificationPermission,
  setBrowserNotificationsPreferred,
  setNotificationsEnabled,
  type SignalNotificationPayload,
} from "@/lib/signal-notifications";

function modeBadgeVariant(mode: PlatformStatus["mode"]) {
  if (mode === "live") return "success" as const;
  if (mode === "partial") return "outline" as const;
  return "destructive" as const;
}

export function SettingsPanel({
  onTestNotification,
}: {
  onTestNotification?: (payloads: SignalNotificationPayload[]) => void;
}) {
  const [status, setStatus] = useState<PlatformStatus | null>(null);
  const [loadingStatus, setLoadingStatus] = useState(true);
  const [statusError, setStatusError] = useState("");
  const [notificationsEnabled, setNotificationsEnabledState] = useState(true);
  const [browserNotifications, setBrowserNotificationsState] = useState(true);
  const [browserPermission, setBrowserPermission] = useState<
    NotificationPermission | "unsupported"
  >("default");

  const loadStatus = useCallback(async () => {
    setLoadingStatus(true);
    setStatusError("");
    try {
      const data = await api.getPlatformStatus(true);
      setStatus(data);
    } catch (err) {
      setStatusError(err instanceof Error ? err.message : "Failed to load platform status");
    } finally {
      setLoadingStatus(false);
    }
  }, []);

  useEffect(() => {
    loadStatus();
    setNotificationsEnabledState(areNotificationsEnabled());
    setBrowserNotificationsState(areBrowserNotificationsPreferred());
    setBrowserPermission(getBrowserNotificationPermission());
  }, [loadStatus]);

  async function handleEnableBrowserNotifications() {
    const permission = await requestBrowserNotificationPermission();
    setBrowserPermission(permission);
    if (permission === "granted") {
      setBrowserNotificationsPreferred(true);
      setBrowserNotificationsState(true);
    }
  }

  function toggleNotifications(enabled: boolean) {
    setNotificationsEnabled(enabled);
    setNotificationsEnabledState(enabled);
  }

  function toggleBrowserNotifications(enabled: boolean) {
    setBrowserNotificationsPreferred(enabled);
    setBrowserNotificationsState(enabled);
  }

  function handleTestNotification() {
    onTestNotification?.([
      {
        action: "BUY",
        symbol: "BNB",
        confidence: 0.72,
        source: "Test notification",
        message: "Example buy signal — notifications are working.",
      },
    ]);
  }

  const services = status
    ? [
        {
          name: "CoinMarketCap Agent Hub",
          icon: Cloud,
          ok: status.integrations.cmc?.status === "live",
          status:
            status.integrations.cmc?.status === "live"
              ? "Live"
              : status.integrations.cmc?.configured
                ? "Auth Failed"
                : "Mock Signals",
          detail: status.integrations.cmc?.message,
        },
        {
          name: "Trust Wallet Agent Kit",
          icon: Link2,
          ok: Boolean(status.integrations.twak?.ok),
          status: status.integrations.twak?.status || "paper",
          detail: status.integrations.twak?.message,
        },
        {
          name: "BNB Chain Testnet",
          icon: Shield,
          ok: status.integrations.blockchain?.status === "live",
          status:
            status.integrations.blockchain?.status === "live" ? "Live" : "Mock / Paper",
          detail: status.integrations.blockchain?.message,
        },
        {
          name: "MongoDB",
          icon: Database,
          ok: status.integrations.mongodb.status === "connected",
          status:
            status.integrations.mongodb.status === "connected" ? "Connected" : "Disconnected",
        },
      ]
    : [];

  return (
    <div className="mx-auto w-full max-w-4xl space-y-6">
      <Tabs defaultValue="general">
        <TabsList className="w-full justify-start">
          <TabsTrigger value="general" className="shrink-0 gap-2">
            <Sliders className="h-4 w-4" />
            General
          </TabsTrigger>
          <TabsTrigger value="integrations" className="shrink-0 gap-2">
            <Cloud className="h-4 w-4" />
            Integrations
          </TabsTrigger>
        </TabsList>

        <TabsContent value="general">
          <Card>
            <CardHeader className="flex flex-row items-start justify-between gap-4">
              <div>
                <CardTitle>General Settings</CardTitle>
                <CardDescription>Agent platform configuration and deployment mode</CardDescription>
              </div>
              <Button size="sm" variant="outline" onClick={loadStatus} disabled={loadingStatus}>
                <RefreshCw className={`mr-2 h-4 w-4 ${loadingStatus ? "animate-spin" : ""}`} />
                Refresh
              </Button>
            </CardHeader>
            <CardContent>
              {statusError && (
                <div className="mb-4 rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-600 dark:border-red-900 dark:bg-red-950/40 dark:text-red-300">
                  {statusError}
                </div>
              )}

              <dl className="grid gap-6 sm:grid-cols-2">
                <div>
                  <dt className="text-sm text-gray-500 dark:text-slate-400">Frontend URL</dt>
                  <dd className="font-medium text-gray-900 dark:text-slate-100">
                    {status?.urls.frontend || "—"}
                  </dd>
                </div>
                <div>
                  <dt className="text-sm text-gray-500 dark:text-slate-400">API URL</dt>
                  <dd className="font-medium text-gray-900 dark:text-slate-100">
                    {status?.urls.api || "—"}
                  </dd>
                </div>
                <div>
                  <dt className="text-sm text-gray-500 dark:text-slate-400">Integration Mode</dt>
                  <dd className="mt-1">
                    <Badge variant={status ? modeBadgeVariant(status.mode) : "outline"}>
                      {status?.mode.toUpperCase() || "LOADING"}
                    </Badge>
                  </dd>
                </div>
                <div>
                  <dt className="text-sm text-gray-500 dark:text-slate-400">Hackathon Ready</dt>
                  <dd className="mt-1">
                    <Badge variant={status?.readyForProduction ? "success" : "outline"}>
                      {status?.readyForProduction ? "Yes" : "No"}
                    </Badge>
                  </dd>
                </div>
                <div>
                  <dt className="text-sm text-gray-500 dark:text-slate-400">Agent Wallet</dt>
                  <dd className="font-medium text-gray-900 dark:text-slate-100">
                    {status?.integrations.agentWallet?.addressMasked || "Not configured"}
                  </dd>
                </div>
                <div>
                  <dt className="text-sm text-gray-500 dark:text-slate-400">Execution Mode</dt>
                  <dd className="mt-1">
                    <Badge variant="outline">
                      {status?.integrations.twak?.executionMode || "paper"}
                    </Badge>
                  </dd>
                </div>
              </dl>

              {status && !status.readyForProduction && (
                <div className="mt-6 rounded-lg border border-amber-200 bg-amber-50 p-4 dark:border-amber-900 dark:bg-amber-950/30">
                  <p className="text-sm font-medium text-amber-900 dark:text-amber-200">
                    Live stack incomplete
                  </p>
                  <p className="mt-1 text-sm text-amber-800 dark:text-amber-300">
                    Add your CMC Pro API key and TWAK credentials in backend/.env. Paper mode works out of the box for demos.
                  </p>
                </div>
              )}
            </CardContent>
          </Card>

          <Card className="mt-6">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Bell className="h-5 w-5" />
                Signal Notifications
              </CardTitle>
              <CardDescription>
                Automatic BUY and SELL alerts every 5 seconds while you are signed in. Monitoring
                starts automatically — no need to press Start Monitor.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <label className="flex cursor-pointer items-center justify-between gap-4 rounded-lg border border-gray-100 px-4 py-3 dark:border-slate-800">
                <div>
                  <p className="text-sm font-medium text-gray-900 dark:text-slate-100">
                    In-app alerts
                  </p>
                  <p className="text-xs text-gray-500 dark:text-slate-400">
                    Toast pop-ups and sound when a BUY or SELL signal appears or changes
                  </p>
                </div>
                <input
                  type="checkbox"
                  checked={notificationsEnabled}
                  onChange={(e) => toggleNotifications(e.target.checked)}
                  className="h-4 w-4 accent-orange-500"
                />
              </label>

              <label className="flex cursor-pointer items-center justify-between gap-4 rounded-lg border border-gray-100 px-4 py-3 dark:border-slate-800">
                <div>
                  <p className="text-sm font-medium text-gray-900 dark:text-slate-100">
                    Browser notifications
                  </p>
                  <p className="text-xs text-gray-500 dark:text-slate-400">
                    Desktop alerts for BUY and SELL signals (including while this tab is open)
                  </p>
                </div>
                <input
                  type="checkbox"
                  checked={browserNotifications}
                  onChange={(e) => toggleBrowserNotifications(e.target.checked)}
                  disabled={browserPermission === "unsupported"}
                  className="h-4 w-4 accent-orange-500"
                />
              </label>

              <div className="flex flex-wrap items-center gap-2">
                <Badge variant="outline">
                  Browser permission: {browserPermission}
                </Badge>
                {browserPermission !== "granted" && browserPermission !== "unsupported" && (
                  <Button size="sm" variant="outline" onClick={handleEnableBrowserNotifications}>
                    Enable browser alerts
                  </Button>
                )}
                <Button size="sm" variant="outline" onClick={handleTestNotification}>
                  Test notification
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="integrations">
          <Card>
            <CardHeader className="flex flex-row items-start justify-between gap-4">
              <div>
                <CardTitle>Integration Status</CardTitle>
                <CardDescription>CMC, TWAK, and BNB Chain connectivity</CardDescription>
              </div>
              <Button size="sm" variant="outline" onClick={loadStatus} disabled={loadingStatus}>
                <RefreshCw className={`mr-2 h-4 w-4 ${loadingStatus ? "animate-spin" : ""}`} />
                Refresh
              </Button>
            </CardHeader>
            <CardContent className="space-y-3">
              {loadingStatus && !status ? (
                <p className="py-8 text-center text-sm text-gray-500 dark:text-slate-400">
                  Checking integrations...
                </p>
              ) : (
                services.map((service) => (
                  <div
                    key={service.name}
                    className="flex flex-col gap-3 rounded-lg border border-gray-100 px-4 py-3 transition-shadow duration-300 hover:shadow-sm dark:border-slate-800 sm:flex-row sm:items-center sm:justify-between"
                  >
                    <div className="min-w-0">
                      <div className="flex items-center gap-3">
                        <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-gray-100 dark:bg-slate-800">
                          <service.icon className="h-4 w-4 text-gray-600 dark:text-slate-400" />
                        </div>
                        <span className="font-medium text-gray-900 dark:text-slate-100">
                          {service.name}
                        </span>
                      </div>
                      {"detail" in service && service.detail && (
                        <p className="mt-2 pl-12 text-xs text-gray-500 dark:text-slate-400">
                          {service.detail}
                        </p>
                      )}
                    </div>
                    <Badge variant={service.ok ? "success" : "destructive"}>{service.status}</Badge>
                  </div>
                ))
              )}

              {status && (
                <div className="mt-4 space-y-2 border-t border-gray-100 pt-4 dark:border-slate-800">
                  <p className="text-sm font-medium text-gray-900 dark:text-slate-100">Setup checklist</p>
                  {status.checklist.map((item) => (
                    <div key={item.id} className="flex items-center justify-between text-sm">
                      <span className="text-gray-600 dark:text-slate-400">{item.label}</span>
                      <Badge variant={item.done ? "success" : "outline"}>
                        {item.done ? "Done" : "Pending"}
                      </Badge>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
