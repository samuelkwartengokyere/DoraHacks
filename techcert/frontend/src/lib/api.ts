const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000/api";
const TOKEN_KEY = "signalforge_token";
const USER_KEY = "signalforge_user";
const LEGACY_TOKEN_KEY = "techcert_token";

export interface PlatformStatus {
  success: boolean;
  mode: "mock" | "partial" | "live";
  readyForProduction: boolean;
  integrations: {
    mongodb: { configured: boolean; status: string };
    cmc?: {
      configured: boolean;
      status: string;
      hubUrl?: string;
      ok?: boolean;
      message?: string;
      priceUsd?: number;
    };
    twak?: {
      configured: boolean;
      status: string;
      executionMode?: string;
      ok?: boolean;
      message?: string;
    };
    blockchain: {
      configured: boolean;
      status: string;
      network?: string | null;
      chainId?: number;
      ok?: boolean;
      message?: string;
      issuerBalanceBnb?: string;
    };
    agentWallet?: {
      configured: boolean;
      addressMasked: string | null;
      balanceBnb?: string;
    };
  };
  urls: {
    frontend: string;
    api: string;
  };
  checklist: Array<{ id: string; label: string; done: boolean }>;
  timestamp: string;
}

export interface SignalDuration {
  activeSince?: string | null;
  activeDurationMs?: number | null;
  activeDurationLabel?: string | null;
  typicalHoldMs?: number | null;
  typicalHoldLabel?: string | null;
  remainingMs?: number | null;
  remainingLabel?: string | null;
  suggestedExitAt?: string | null;
  timeframe?: string;
  samples?: number;
  advice?: string;
  summary?: string;
  beginnerGuide?: string;
  progressPercent?: number | null;
}

export interface TradingSignal {
  symbol: string;
  action: "BUY" | "SELL" | "HOLD";
  confidence: number;
  regime: string;
  reasons: string[];
  metrics: Record<string, number>;
  source: string;
  generatedAt: string;
  duration?: SignalDuration;
}

export interface Agent {
  _id: string;
  name: string;
  symbol: string;
  strategy: string;
  maxTradeUsd: number;
  minConfidence: number;
  status: string;
  isAutomated?: boolean;
  runIntervalMinutes?: number;
  signalPollSeconds?: number;
  automatedStartedAt?: string;
  totalTrades: number;
  lastRunAt?: string;
  lastSignal?: TradingSignal;
  createdAt: string;
  updatedAt: string;
}

export interface Trade {
  _id: string;
  agentId: string;
  symbol: string;
  action: "BUY" | "SELL" | "HOLD";
  amountUsd: number;
  priceUsd?: number;
  confidence?: number;
  reasoning?: string;
  signal?: TradingSignal;
  executionMode: "paper" | "live";
  txHash?: string;
  status: string;
  executionDetail?: string;
  createdAt: string;
}

export interface StrategySchedule {
  _id: string;
  isAutomated: boolean;
  runIntervalMinutes: number;
  signalPollSeconds?: number;
  backtestIntervalMinutes?: number;
  automatedStartedAt?: string;
  lastRunAt?: string;
  lastBacktestAt?: string;
  lastSignal?: TradingSignal;
  params: {
    symbol: string;
    name: string;
    initialUsd: number;
    fastPeriod: number;
    slowPeriod: number;
  };
}

export interface StrategyRun {
  _id: string;
  name: string;
  symbol: string;
  strategyType: string;
  params: Record<string, unknown>;
  skillOutput: {
    skill: string;
    track: string;
    symbol?: string;
    cmcSignal: TradingSignal;
    recommendation: { action: string; confidence: number; rationale: string; backtestAligned: boolean };
    backtest: {
      pnlPercent: number;
      pnlUsd: number;
      finalEquityUsd: number;
      tradeCount: number;
      winRate: number;
      trades?: Array<{ type: string; price: number; time: number }>;
      chartSeries?: Array<{
        time: number;
        open?: number;
        high?: number;
        low?: number;
        close?: number;
        volume?: number;
        price: number;
        fastMa: number | null;
        slowMa: number | null;
      }>;
    };
  };
  pnlPercent: number;
  tradeCount: number;
  createdAt: string;
}

export interface AuthUser {
  id: string;
  email: string;
  name: string;
}

class ApiClient {
  private token: string | null = null;

  setToken(token: string | null) {
    this.token = token;
    if (typeof window !== "undefined") {
      if (token) {
        localStorage.setItem(TOKEN_KEY, token);
        localStorage.removeItem(LEGACY_TOKEN_KEY);
      } else {
        localStorage.removeItem(TOKEN_KEY);
        localStorage.removeItem(LEGACY_TOKEN_KEY);
        localStorage.removeItem(USER_KEY);
      }
    }
  }

  setUser(user: AuthUser | null) {
    if (typeof window !== "undefined") {
      if (user) {
        localStorage.setItem(USER_KEY, JSON.stringify(user));
      } else {
        localStorage.removeItem(USER_KEY);
      }
    }
  }

  getUser(): AuthUser | null {
    if (typeof window === "undefined") return null;
    const raw = localStorage.getItem(USER_KEY);
    if (!raw) return null;
    try {
      return JSON.parse(raw) as AuthUser;
    } catch {
      return null;
    }
  }

  getToken() {
    if (this.token) return this.token;
    if (typeof window !== "undefined") {
      return localStorage.getItem(TOKEN_KEY) || localStorage.getItem(LEGACY_TOKEN_KEY);
    }
    return null;
  }

  private async request<T>(path: string, options: RequestInit = {}): Promise<T> {
    const headers: Record<string, string> = {
      ...(options.headers as Record<string, string>),
    };

    const token = this.getToken();
    if (token) headers.Authorization = `Bearer ${token}`;

    const response = await fetch(`${API_URL}${path}`, { ...options, headers });
    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.message || "Request failed");
    }

    return data;
  }

  async login(email: string, password: string) {
    const data = await this.request<{
      success: boolean;
      token: string;
      admin: AuthUser;
    }>("/auth/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, password }),
    });
    this.setToken(data.token);
    this.setUser(data.admin);
    return data;
  }

  async register(name: string, email: string, password: string) {
    const data = await this.request<{
      success: boolean;
      token: string;
      admin: AuthUser;
    }>("/auth/register", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: name.trim() || undefined, email, password }),
    });
    this.setToken(data.token);
    this.setUser(data.admin);
    return data;
  }

  logout() {
    this.setToken(null);
    this.setUser(null);
  }

  async getPlatformStatus(deep = true) {
    const response = await fetch(`${API_URL}/status?deep=${deep}`);
    const data = await response.json();
    if (!response.ok) throw new Error(data.message || "Failed to load platform status");
    return data as PlatformStatus;
  }

  async getAgents() {
    return this.request<{ success: boolean; agents: Agent[] }>("/agents");
  }

  async getLiveStatus() {
    return this.request<{
      success: boolean;
      agents: Agent[];
      schedule: StrategySchedule | null;
      marketSignal: TradingSignal;
      serverTime: string;
    }>("/agents/live-status");
  }

  async createAgent(payload: {
    name: string;
    symbol?: string;
    maxTradeUsd?: number;
    minConfidence?: number;
  }) {
    return this.request<{ success: boolean; agent: Agent }>("/agents", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
  }

  async runAgent(agentId: string) {
    return this.request<{
      success: boolean;
      agent: Agent;
      trade: Trade;
      signal: TradingSignal;
      executed: boolean;
    }>(`/agents/${agentId}/run`, { method: "POST" });
  }

  async adviseAgent(agentId: string) {
    return this.request<{
      success: boolean;
      agent: Agent;
      signal: TradingSignal;
      trade: Trade | null;
      logged: boolean;
    }>(`/agents/${agentId}/advise`, { method: "POST" });
  }

  async startAgentAutomation(agentId: string, pollSeconds = 30) {
    return this.request<{
      success: boolean;
      agent: Agent;
      alreadyRunning?: boolean;
    }>(`/agents/${agentId}/automation/start`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ pollSeconds }),
    });
  }

  async stopAgentAutomation(agentId: string) {
    return this.request<{ success: boolean; agent: Agent }>(
      `/agents/${agentId}/automation/stop`,
      { method: "POST" }
    );
  }

  async getTrades() {
    return this.request<{ success: boolean; trades: Trade[] }>("/trades");
  }

  async deleteTrades(ids: string[]) {
    return this.request<{ success: boolean; deletedCount: number }>("/trades", {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ids }),
    });
  }

  async cancelTrade(tradeId: string) {
    return this.request<{ success: boolean; trade: Trade }>(`/trades/${tradeId}/cancel`, {
      method: "POST",
    });
  }

  async deleteAllTrades() {
    return this.request<{ success: boolean; deletedCount: number }>("/trades", {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({}),
    });
  }

  async getStrategyRuns() {
    return this.request<{ success: boolean; runs: StrategyRun[]; schedule: StrategySchedule | null }>(
      "/strategies"
    );
  }

  async startStrategyAutomation(payload: {
    symbol?: string;
    name?: string;
    initialUsd?: number;
    fastPeriod?: number;
    slowPeriod?: number;
    pollSeconds?: number;
    backtestIntervalMinutes?: number;
    intervalMinutes?: number;
  }) {
    return this.request<{ success: boolean; schedule: StrategySchedule; alreadyRunning?: boolean }>(
      "/strategies/automation/start",
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      }
    );
  }

  async stopStrategyAutomation() {
    return this.request<{ success: boolean; schedule: StrategySchedule }>(
      "/strategies/automation/stop",
      { method: "POST" }
    );
  }

  async runStrategyBacktest(payload: {
    symbol?: string;
    name?: string;
    initialUsd?: number;
    fastPeriod?: number;
    slowPeriod?: number;
  }) {
    return this.request<{ success: boolean; run: StrategyRun; skillOutput: StrategyRun["skillOutput"] }>(
      "/strategies/backtest",
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      }
    );
  }

  async getPublicSignal(symbol = "BNB") {
    return this.request<{ success: boolean; signal: TradingSignal }>(`/agents/signals/${symbol}`);
  }

  async getMarketCandles(symbol = "BNB", limit = 168, interval = "1h") {
    const params = new URLSearchParams({ symbol, limit: String(limit), interval });
    return this.request<{
      success: boolean;
      symbol: string;
      interval: string;
      candles: Array<{
        time: number;
        open: number;
        high: number;
        low: number;
        close: number;
        volume: number;
      }>;
    }>(`/market/candles?${params}`);
  }
}

export const api = new ApiClient();

export async function fetchMarketCandles(
  symbol = "BNB",
  limit = 168,
  interval = "1h",
) {
  const data = await api.getMarketCandles(symbol, limit, interval);
  return data.candles;
}
