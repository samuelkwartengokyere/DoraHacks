export type SignalAction = "BUY" | "SELL" | "HOLD";

export interface SignalNotificationPayload {
  action: SignalAction;
  symbol: string;
  confidence?: number;
  source: string;
  message?: string;
  status?: string;
  durationAdvice?: string;
}

export interface SignalToast extends SignalNotificationPayload {
  id: string;
  createdAt: number;
}

const ENABLED_KEY = "signalforge_notifications_enabled";
const BROWSER_KEY = "signalforge_browser_notifications";

export function areNotificationsEnabled(): boolean {
  if (typeof window === "undefined") return true;
  const raw = localStorage.getItem(ENABLED_KEY);
  return raw !== "false";
}

export function setNotificationsEnabled(enabled: boolean) {
  if (typeof window === "undefined") return;
  localStorage.setItem(ENABLED_KEY, enabled ? "true" : "false");
}

export function areBrowserNotificationsPreferred(): boolean {
  if (typeof window === "undefined") return true;
  const raw = localStorage.getItem(BROWSER_KEY);
  return raw !== "false";
}

export function setBrowserNotificationsPreferred(enabled: boolean) {
  if (typeof window === "undefined") return;
  localStorage.setItem(BROWSER_KEY, enabled ? "true" : "false");
}

export function getBrowserNotificationPermission(): NotificationPermission | "unsupported" {
  if (typeof window === "undefined" || !("Notification" in window)) {
    return "unsupported";
  }
  return Notification.permission;
}

export async function requestBrowserNotificationPermission(): Promise<NotificationPermission | "unsupported"> {
  if (typeof window === "undefined" || !("Notification" in window)) {
    return "unsupported";
  }
  if (Notification.permission === "granted") return "granted";
  if (Notification.permission === "denied") return "denied";
  return Notification.requestPermission();
}

function actionTitle(action: SignalAction) {
  if (action === "BUY") return "Buy signal";
  if (action === "SELL") return "Sell signal";
  return "Hold signal";
}

function actionEmoji(action: SignalAction) {
  if (action === "BUY") return "🟢";
  if (action === "SELL") return "🔴";
  return "🟡";
}

export function buildNotificationBody(payload: SignalNotificationPayload) {
  const parts = [
    `${payload.symbol} — ${payload.action}`,
    payload.confidence != null ? `${Math.round(payload.confidence * 100)}% confidence` : null,
    payload.durationAdvice,
    payload.status ? `Status: ${payload.status}` : null,
    payload.message,
  ].filter(Boolean);
  return parts.join(" · ");
}

export function showBrowserSignalNotification(payload: SignalNotificationPayload) {
  if (typeof window === "undefined") return;
  if (!areNotificationsEnabled() || !areBrowserNotificationsPreferred()) return;
  if (!("Notification" in window) || Notification.permission !== "granted") return;
  if (payload.action !== "BUY" && payload.action !== "SELL") return;

  const title = `${actionEmoji(payload.action)} SignalForge: ${actionTitle(payload.action)}`;
  const body = buildNotificationBody(payload);

  try {
    new Notification(title, {
      body,
      tag: `signalforge-${payload.symbol}-${payload.action}`,
      icon: "/icon.png",
    });
  } catch {
    // ignore if notifications blocked
  }
}

export function playSignalChime(action: SignalAction) {
  if (typeof window === "undefined") return;
  try {
    const ctx = new AudioContext();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.frequency.value = action === "BUY" ? 880 : action === "SELL" ? 440 : 660;
    gain.gain.value = 0.04;
    osc.start();
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.25);
    osc.stop(ctx.currentTime + 0.25);
  } catch {
    // audio optional
  }
}
