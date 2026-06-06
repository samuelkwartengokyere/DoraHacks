const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000/api";
const TOKEN_KEY = "signalforge_token";
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

export interface TradingSignal {
  symbol: string;
  action: "BUY" | "SELL" | "HOLD";
  confidence: number;
  regime: string;
  reasons: string[];
  metrics: Record<string, number>;
  source: string;
  generatedAt: string;
}

export interface Agent {
  _id: string;
  name: string;
  symbol: string;
  strategy: string;
  maxTradeUsd: number;
  minConfidence: number;
  status: string;
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

export interface StrategyRun {
  _id: string;
  name: string;
  symbol: string;
  strategyType: string;
  params: Record<string, unknown>;
  skillOutput: {
    skill: string;
    track: string;
    cmcSignal: TradingSignal;
    recommendation: { action: string; confidence: number; rationale: string; backtestAligned: boolean };
    backtest: {
      pnlPercent: number;
      pnlUsd: number;
      finalEquityUsd: number;
      tradeCount: number;
      winRate: number;
    };
  };
  pnlPercent: number;
  tradeCount: number;
  createdAt: string;
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
      }
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
      admin: { id: string; email: string; name: string };
    }>("/auth/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, password }),
    });
    this.setToken(data.token);
    return data;
  }

  logout() {
    this.setToken(null);
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

  async getTrades() {
    return this.request<{ success: boolean; trades: Trade[] }>("/trades");
  }

  async getStrategyRuns() {
    return this.request<{ success: boolean; runs: StrategyRun[] }>("/strategies");
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
}

export const api = new ApiClient();
