const axios = require("axios");
const twakService = require("./twakService");

const DEFAULT_MCP_URL = "https://mcp.coinmarketcap.com/mcp";
const X402_MCP_URL = "https://mcp.coinmarketcap.com/x402/mcp";

class CmcMcpClient {
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
        headers: {
          "Content-Type": "application/json",
          "X-CMC-MCP-API-KEY": this.getApiKey(),
          "X-CMC_PRO_API_KEY": this.getApiKey(),
        },
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

  async getQuote(symbol) {
    return this.callTool("get_crypto_quotes_latest", {
      symbol: symbol.toUpperCase(),
      convert: "USD",
    });
  }

  async getGlobalMetrics() {
    return this.callTool("get_global_metrics_latest", { convert: "USD" });
  }

  normalizeQuote(symbol, data) {
    const upper = symbol.toUpperCase();
    const entry = data?.data?.[upper] || data?.[upper] || data?.quote?.[upper];
    if (!entry) {
      throw new Error(`No MCP quote for ${upper}`);
    }
    const quote = entry.quote?.USD || entry.quote?.usd || {};
    return {
      mock: false,
      symbol: upper,
      name: entry.name || upper,
      priceUsd: quote.price ?? entry.price,
      percentChange1h: quote.percent_change_1h ?? entry.percent_change_1h,
      percentChange24h: quote.percent_change_24h ?? entry.percent_change_24h,
      percentChange7d: quote.percent_change_7d ?? entry.percent_change_7d,
      volume24hUsd: quote.volume_24h ?? entry.volume_24h,
      marketCapUsd: quote.market_cap ?? entry.market_cap,
      lastUpdated: quote.last_updated || new Date().toISOString(),
    };
  }

  normalizeGlobalMetrics(data) {
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
    };
  }
}

module.exports = new CmcMcpClient();
