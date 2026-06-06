import type { Agent, StrategyRun, StrategySchedule, Trade, TradingSignal } from "@/lib/api";
import {
  areNotificationsEnabled,
  playSignalChime,
  showBrowserSignalNotification,
  type SignalAction,
  type SignalNotificationPayload,
} from "@/lib/signal-notifications";

function signalToPayload(
  signal: TradingSignal,
  source: string,
  extra?: Partial<SignalNotificationPayload>,
): SignalNotificationPayload {
  return {
    action: signal.action,
    symbol: signal.symbol,
    confidence: signal.confidence,
    source,
    message: signal.reasons?.join("; "),
    durationAdvice:
      signal.duration?.beginnerGuide ||
      signal.duration?.summary ||
      signal.duration?.advice,
    ...extra,
  };
}

function tradeToNotification(trade: Trade): SignalNotificationPayload | null {
  if (trade.action !== "BUY" && trade.action !== "SELL") return null;
  return {
    action: trade.action,
    symbol: trade.symbol,
    confidence: trade.confidence,
    source: trade.status === "advisory" ? "Signal advisory" : "Trading Agent",
    message: trade.reasoning,
    status: trade.status === "advisory" ? "Recommendation" : trade.status,
    durationAdvice:
      trade.signal?.duration?.beginnerGuide ||
      trade.signal?.duration?.summary ||
      trade.signal?.duration?.advice,
  };
}

function strategyRunToNotification(run: StrategyRun): SignalNotificationPayload | null {
  const signal = run.skillOutput?.cmcSignal;
  if (!signal || (signal.action !== "BUY" && signal.action !== "SELL")) return null;
  return signalToPayload(signal, "Strategy Skill", {
    message: run.skillOutput.recommendation?.rationale,
  });
}

function agentToNotification(agent: Agent): SignalNotificationPayload | null {
  const signal = agent.lastSignal;
  if (!signal || (signal.action !== "BUY" && signal.action !== "SELL")) return null;
  return signalToPayload(signal, agent.name || "Trading Agent");
}

export function isActionableSignal(action: SignalAction) {
  return action === "BUY" || action === "SELL";
}

export function shouldNotifyActionChange(
  prevAction: string | null | undefined,
  nextAction: string | null | undefined,
) {
  if (!nextAction) return false;
  if (nextAction === "BUY" || nextAction === "SELL") {
    return prevAction !== nextAction;
  }
  return false;
}

export function detectNewSignalNotifications(
  prevTradeIds: Set<string>,
  trades: Trade[],
  prevRunIds: Set<string>,
  runs: StrategyRun[],
  isBootstrapped: boolean,
): SignalNotificationPayload[] {
  if (!isBootstrapped) return [];

  const notifications: SignalNotificationPayload[] = [];

  for (const trade of trades) {
    if (!prevTradeIds.has(trade._id)) {
      const payload = tradeToNotification(trade);
      if (payload) notifications.push(payload);
    }
  }

  for (const run of runs) {
    if (!prevRunIds.has(run._id)) {
      const payload = strategyRunToNotification(run);
      if (payload) notifications.push(payload);
    }
  }

  return notifications;
}

export function detectLiveSignalNotifications(
  prevAgentActions: Map<string, string>,
  agents: Agent[],
  prevScheduleAction: string | null,
  schedule: StrategySchedule | null,
  prevMarketAction: string | null,
  marketSignal: TradingSignal | null,
  isBootstrapped: boolean,
): SignalNotificationPayload[] {
  if (!isBootstrapped) return [];

  const notifications: SignalNotificationPayload[] = [];
  const seen = new Set<string>();

  function pushOnce(payload: SignalNotificationPayload) {
    const key = `${payload.source}:${payload.symbol}:${payload.action}`;
    if (seen.has(key)) return;
    seen.add(key);
    notifications.push(payload);
  }

  for (const agent of agents) {
    const action = agent.lastSignal?.action;
    const prev = prevAgentActions.get(agent._id);
    if (shouldNotifyActionChange(prev, action)) {
      const payload = agentToNotification(agent);
      if (payload) pushOnce(payload);
    }
  }

  const scheduleAction = schedule?.lastSignal?.action;
  if (shouldNotifyActionChange(prevScheduleAction, scheduleAction) && schedule?.lastSignal) {
    pushOnce(signalToPayload(schedule.lastSignal, "Strategy Skill"));
  }

  const marketAction = marketSignal?.action;
  if (
    marketSignal &&
    marketAction &&
    shouldNotifyActionChange(prevMarketAction, marketAction) &&
    isActionableSignal(marketAction)
  ) {
    pushOnce(signalToPayload(marketSignal, "Live market signal"));
  }

  return notifications;
}

export function snapshotAgentActions(agents: Agent[]) {
  const map = new Map<string, string>();
  for (const agent of agents) {
    if (agent.lastSignal?.action) {
      map.set(agent._id, agent.lastSignal.action);
    }
  }
  return map;
}

export function emitSignalNotification(payload: SignalNotificationPayload) {
  if (!areNotificationsEnabled()) return;
  if (!isActionableSignal(payload.action)) return;
  playSignalChime(payload.action);
  showBrowserSignalNotification(payload);
}

export function snapshotTradeIds(trades: Trade[]) {
  return new Set(trades.map((t) => t._id));
}

export function snapshotRunIds(runs: StrategyRun[]) {
  return new Set(runs.map((r) => r._id));
}

export function hasActiveAutomation(agents: Agent[], schedule: { isAutomated?: boolean } | null) {
  return agents.some((a) => a.isAutomated) || Boolean(schedule?.isAutomated);
}
