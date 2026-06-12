const axios = require("axios");
const twakService = require("./twakService");

const DEFAULT_MCP_URL = "https://mcp.coinmarketcap.com/mcp";
const X402_MCP_URL = "https://mcp.coinmarketcap.com/x402/mcp";

class CmcMcpClient {
  constructor() {
    this.symbolIdCache = new Map();
  }

  isConfigured() {
    if (this.useX402()) return twakService.isConfigured();
    const key = process.env.CMC_MCP_API_KEY?.trim() || process.env.CMC_PRO_API_KEY?.trim();
    const placeholders = new Set(["", "your_cmc_pro_api_key", "your_cmc_mcp_api_key"]);
    return Boolean(key && !placeholders.has(key));
  }

  useX402() {
    return process.env.CMC_DATA_SOURCE === "x402" || process.env.X402_ENABLED === "true";
  }

  getUrl() {
    if (this.useX402()) return X402_MCP_URL;
    return (process.env.CMC_MCP_URL || DEFAULT_MCP_URL).replace(/\/$/, "");
  }

  getApiKey() {
    return process.env.CMC_MCP_API_KEY?.trim() || process.env.CMC_PRO_API_KEY?.trim();
  }

  getRequestHeaders() {
    const key = this.getApiKey();
    return {
      "Content-Type": "application/json",
      Accept: "application/json, text/event-stream",
      "X-CMC-MCP-API-KEY": key,
      "X-CMC_PRO_API_KEY": key,
    };
  }

  async callTool(toolName, args = {}) {
    if (this.useX402()) {
      return this.callToolViaTwakX402(toolName, args);
    }

    const response = await axios.post(
      this.getUrl(),
      {
        jsonrpc: "2.0",
        id: Date.now(),
        method: "tools/call",
        params: { name: toolName, arguments: args },
      },
      {
        headers: this.getRequestHeaders(),
        timeout: 25000,
      }
    );

    return this.parseMcpResult(response.data?.result, toolName);
  }

  async callToolViaTwakX402(toolName, args = {}) {
    const mcpUrl = X402_MCP_URL;
    const body = {
      jsonrpc: "2.0",
      id: Date.now(),
      method: "tools/call",
      params: { name: toolName, arguments: args },
    };

    const result = await twakService.x402Request({
      url: mcpUrl,
      method: "POST",
      body,
      preferNetwork: process.env.X402_NETWORK || "base",
    });

    const payload = result.data;
    if (typeof payload === "string") {
      try {
        return this.parseMcpResult(JSON.parse(payload).result, toolName);
      } catch {
        return JSON.parse(payload);
      }
    }
    return this.parseMcpResult(payload?.result ?? payload, toolName);
  }

  parseMcpResult(result, toolName) {
    if (result?.isError) {
      throw new Error(result.content?.[0]?.text || `MCP tool ${toolName} failed`);
    }

    const text = result?.content?.find((c) => c.type === "text")?.text;
    if (text) {
      try {
        return JSON.parse(text);
      } catch {
        return text;
      }
    }
    return result;
  }

  parsePercentString(value) {
    if (value == null) return null;
    if (typeof value === "number") return value;
    const cleaned = String(value).replace(/[%+,]/g, "").trim();
    const parsed = Number(cleaned);
    return Number.isFinite(parsed) ? parsed : null;
  }

  parseCompactUsd(value) {
    if (value == null) return null;
    if (typeof value === "number") return value;
    const raw = String(value).trim().replace(/[$,]/g, "");
    const match = raw.match(/^([\d.]+)\s*([KMBT])?$/i);
    if (!match) {
      const direct = Number(raw);
      return Number.isFinite(direct) ? direct : null;
    }
    const amount = Number(match[1]);
    const suffix = (match[2] || "").toUpperCase();
    const multipliers = { K: 1e3, M: 1e6, B: 1e9, T: 1e12 };
    return amount * (multipliers[suffix] || 1);
  }

  async searchCryptos(query, limit = 3) {
    return this.callTool("search_cryptos", { query, limit });
  }

  async resolveCryptoId(symbol) {
    const upper = symbol.toUpperCase();
    if (this.symbolIdCache.has(upper)) {
      return this.symbolIdCache.get(upper);
    }

    const results = await this.searchCryptos(upper, 5);
    const rows = Array.isArray(results) ? results : results?.data || [];
    const match =
      rows.find((row) => row.symbol?.toUpperCase() === upper) ||
      rows.find((row) => row.slug?.toLowerCase() === upper.toLowerCase()) ||
      rows[0];

    if (!match?.id) {
      throw new Error(`No MCP search result for ${upper}`);
    }

    const resolved = String(match.id);
    this.symbolIdCache.set(upper, resolved);
    return resolved;
  }

  async getQuote(symbol) {
    const id = await this.resolveCryptoId(symbol);
    return this.callTool("get_crypto_quotes_latest", { id });
  }

  async getGlobalMetrics() {
    return this.callTool("get_global_metrics_latest", {});
  }

  async getTechnicalAnalysis(symbol) {
    const id = await this.resolveCryptoId(symbol);
    return this.callTool("get_crypto_technical_analysis", { id });
  }

  normalizeQuote(symbol, data) {
    const upper = symbol.toUpperCase();
    const entry =
      data?.data?.[upper] ||
      data?.[upper] ||
      data?.quote?.[upper] ||
      data?.data?.[0] ||
      data?.[0] ||
      data?.data?.[String(Object.keys(data?.data || data || {})[0])];

    if (!entry) {
      throw new Error(`No MCP quote for ${upper}`);
    }

    const quote = entry.quote?.USD || entry.quote?.usd || entry;
    return {
      mock: false,
      symbol: entry.symbol?.toUpperCase?.() || upper,
      name: entry.name || upper,
      cmcId: entry.id != null ? String(entry.id) : null,
      priceUsd: quote.price ?? entry.price,
      percentChange1h: quote.percent_change_1h ?? quote.percentChange1h ?? entry.percent_change_1h,
      percentChange24h: quote.percent_change_24h ?? quote.percentChange24h ?? entry.percent_change_24h,
      percentChange7d: quote.percent_change_7d ?? quote.percentChange7d ?? entry.percent_change_7d,
      volume24hUsd: quote.volume_24h ?? quote.volume24h ?? entry.volume_24h,
      marketCapUsd: quote.market_cap ?? quote.marketCap ?? entry.market_cap,
      lastUpdated: quote.last_updated || entry.last_updated || new Date().toISOString(),
    };
  }

  normalizeGlobalMetrics(data) {
    if (data?.market_size || data?.sentiment) {
      const marketCapCurrent = data.market_size?.total_crypto_market_cap_usd?.current;
      const volumeCurrent = data.liquidity?.volume24h?.total?.current;
      const marketCapChange24h = this.parsePercentString(
        data.market_size?.total_crypto_market_cap_usd?.percent_change?.["24h"]
      );
      const fearGreed = data.sentiment?.fear_greed?.current;

      return {
        mock: false,
        btcDominance: this.parsePercentString(data.dominance?.btc?.current),
        totalMarketCapUsd: this.parseCompactUsd(marketCapCurrent),
        totalVolume24hUsd: this.parseCompactUsd(volumeCurrent),
        marketCapChange24h: marketCapChange24h ?? 0,
        fearGreedIndex: fearGreed?.index ?? null,
        fearGreedLabel: fearGreed?.value ?? null,
        altcoinSeasonIndex: data.sentiment?.altcoin_season?.current?.index ?? null,
        source: "cmc-mcp-global-metrics",
      };
    }

    const root = data?.data ?? data;
    const quote = root?.quote?.USD || root?.quote?.usd || {};
    return {
      mock: false,
      btcDominance: root?.btc_dominance,
      totalMarketCapUsd: quote.total_market_cap,
      totalVolume24hUsd: quote.total_volume_24h,
      marketCapChange24h: quote.total_market_cap_yesterday
        ? ((quote.total_market_cap - quote.total_market_cap_yesterday) /
            quote.total_market_cap_yesterday) *
          100
        : 0,
      fearGreedIndex: root?.fear_and_greed?.value ?? null,
      fearGreedLabel: root?.fear_and_greed?.value_classification ?? null,
      source: "cmc-mcp-global-metrics-legacy",
    };
  }

  normalizeTechnicalAnalysis(data, symbol) {
    const root = data?.data ?? data;
    const moving = root?.moving_averages || {};
    const macd = root?.macd || {};
    const rsi = root?.rsi || {};

    const toNumber = (value) => {
      const parsed = Number(value);
      return Number.isFinite(parsed) ? parsed : null;
    };

    return {
      mock: false,
      symbol: symbol.toUpperCase(),
      movingAverages: {
        sma7: toNumber(moving.simple_moving_average_7_day),
        sma30: toNumber(moving.simple_moving_average_30_day),
        sma200: toNumber(moving.simple_moving_average_200_day),
        ema7: toNumber(moving.exponential_moving_average_7_day),
        ema30: toNumber(moving.exponential_moving_average_30_day),
        ema200: toNumber(moving.exponential_moving_average_200_day),
      },
      macd: {
        line: toNumber(macd.macdLine),
        signal: toNumber(macd.signalLine),
        histogram: toNumber(macd.histogram),
      },
      rsi: {
        rsi7: toNumber(rsi.rsi7),
        rsi14: toNumber(rsi.rsi14),
        rsi21: toNumber(rsi.rsi21),
      },
      pivotPoint: toNumber(root?.pivotPoint),
      fibonacci: root?.fibonacciLevels || null,
      source: "cmc-mcp-technical-analysis",
    };
  }
}

module.exports = new CmcMcpClient();
