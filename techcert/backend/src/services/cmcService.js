const axios = require("axios");
const cmcMcpClient = require("./cmcMcpClient");

const PLACEHOLDER_KEYS = new Set([
  "",
  "your_cmc_pro_api_key",
  "your_cmc_mcp_api_key",
]);

function getDataSource() {
  const source = (process.env.CMC_DATA_SOURCE || "auto").trim().toLowerCase();
  if (source === "mcp" || source === "rest") return source;
  if (cmcMcpClient.isConfigured() && process.env.CMC_DATA_SOURCE !== "rest") {
    return "mcp";
  }
  return "rest";
}

class CmcService {
  isConfigured() {
    return cmcMcpClient.isConfigured() || this.isRestConfigured();
  }

  isRestConfigured() {
    const key = process.env.CMC_PRO_API_KEY?.trim();
    return Boolean(key && !PLACEHOLDER_KEYS.has(key));
  }

  getDataSource() {
    return getDataSource();
  }

  async getQuote(symbol = "BNB") {
    const upper = symbol.toUpperCase();

    if (getDataSource() === "mcp" && cmcMcpClient.isConfigured()) {
      try {
        const data = await cmcMcpClient.getQuote(upper);
        const entry = data?.data?.[upper] || data?.[upper];
        if (entry) {
          const quote = entry.quote?.USD || entry.quote?.usd || {};
          return this.normalizeQuote(upper, entry, quote, false);
        }
      } catch (error) {
        console.warn("CMC MCP quote failed — falling back to REST:", error.message);
      }
    }

    if (!this.isRestConfigured()) {
      return this.mockQuote(symbol);
    }

    try {
      const response = await axios.get(
        "https://pro-api.coinmarketcap.com/v1/cryptocurrency/quotes/latest",
        {
          params: { symbol: symbol.toUpperCase(), convert: "USD" },
          headers: { "X-CMC_PRO_API_KEY": process.env.CMC_PRO_API_KEY },
          timeout: 15000,
        }
      );

      const entry = response.data?.data?.[symbol.toUpperCase()];
      if (!entry) {
        throw new Error(`No CMC data for ${symbol}`);
      }

      const quote = entry.quote?.USD || {};
      return this.normalizeQuote(symbol, entry, quote, false);
    } catch (error) {
      console.warn("CMC API error — using mock quote:", error.message);
      return this.mockQuote(symbol);
    }
  }

  async getGlobalMetrics() {
    if (getDataSource() === "mcp" && cmcMcpClient.isConfigured()) {
      try {
        const data = await cmcMcpClient.getGlobalMetrics();
        const quote = data?.data?.quote?.USD || data?.quote?.USD || {};
        return {
          mock: false,
          btcDominance: data?.data?.btc_dominance ?? data?.btc_dominance,
          totalMarketCapUsd: quote.total_market_cap,
          totalVolume24hUsd: quote.total_volume_24h,
          marketCapChange24h: quote.total_market_cap_yesterday
            ? ((quote.total_market_cap - quote.total_market_cap_yesterday) /
                quote.total_market_cap_yesterday) *
              100
            : 0,
        };
      } catch (error) {
        console.warn("CMC MCP global metrics failed — falling back to REST:", error.message);
      }
    }

    if (!this.isRestConfigured()) {
      return {
        mock: true,
        btcDominance: 52.4,
        totalMarketCapUsd: 2_450_000_000_000,
        totalVolume24hUsd: 98_000_000_000,
        marketCapChange24h: 0.8,
      };
    }

    const response = await axios.get(
      "https://pro-api.coinmarketcap.com/v1/global-metrics/quotes/latest",
      {
        headers: { "X-CMC_PRO_API_KEY": process.env.CMC_PRO_API_KEY },
        timeout: 15000,
      }
    );

    const quote = response.data?.data?.quote?.USD || {};
    return {
      mock: false,
      btcDominance: response.data?.data?.btc_dominance,
      totalMarketCapUsd: quote.total_market_cap,
      totalVolume24hUsd: quote.total_volume_24h,
      marketCapChange24h: quote.total_market_cap_yesterday
        ? ((quote.total_market_cap - quote.total_market_cap_yesterday) /
            quote.total_market_cap_yesterday) *
          100
        : 0,
    };
  }

  buildSignal(quote, globalMetrics) {
    const change1h = quote.percentChange1h ?? 0;
    const change24h = quote.percentChange24h ?? 0;
    const change7d = quote.percentChange7d ?? 0;
    const volumeRatio = quote.volume24hUsd / Math.max(quote.marketCapUsd, 1);
    const globalChange = globalMetrics.marketCapChange24h ?? 0;

    let score = 0;
    const reasons = [];

    if (change1h > 0.2) {
      score += 0.5;
      reasons.push(`Short-term momentum +${change1h.toFixed(2)}% (1h)`);
    } else if (change1h < -0.2) {
      score -= 0.5;
      reasons.push(`Short-term weakness ${change1h.toFixed(2)}% (1h)`);
    }

    if (change24h > 1.5) {
      score += 1.5;
      reasons.push(`Strong 24h gain +${change24h.toFixed(2)}%`);
    } else if (change24h > 0.25) {
      score += 0.75;
      reasons.push(`Positive 24h trend +${change24h.toFixed(2)}%`);
    } else if (change24h < -1.5) {
      score -= 1.5;
      reasons.push(`Strong 24h decline ${change24h.toFixed(2)}%`);
    } else if (change24h < -0.25) {
      score -= 0.75;
      reasons.push(`Negative 24h trend ${change24h.toFixed(2)}%`);
    }

    if (change7d > 3) {
      score += 1.25;
      reasons.push(`7d uptrend +${change7d.toFixed(1)}%`);
    } else if (change7d > 0) {
      score += 0.5;
      reasons.push(`7d trend positive +${change7d.toFixed(1)}%`);
    } else if (change7d < -8) {
      score -= 1.5;
      reasons.push(`Extended 7d weakness ${change7d.toFixed(1)}%`);
    } else if (change7d < 0) {
      score -= 0.75;
      reasons.push(`7d trend negative ${change7d.toFixed(1)}%`);
    }

    if (globalChange > 0.4) {
      score += 0.5;
      reasons.push("Global market cap rising");
    } else if (globalChange < -0.4) {
      score -= 0.5;
      reasons.push("Global market cap falling");
    }

    if (volumeRatio > 0.02 && score > 0) {
      score += 0.25;
      reasons.push("Volume supports bullish read");
    } else if (volumeRatio > 0.02 && score < 0) {
      score -= 0.25;
      reasons.push("Volume supports bearish read");
    }

    let regime = "neutral";
    if (score >= 1.25) regime = "bullish";
    else if (score <= -1.25) regime = "bearish";
    else if (Math.abs(change24h) < 1) regime = "ranging";

    let action = "HOLD";
    let confidence = 0.5;

    if (score >= 0.9) {
      action = "BUY";
      confidence = Math.min(0.88, 0.58 + score * 0.12);
    } else if (score <= -0.9) {
      action = "SELL";
      confidence = Math.min(0.88, 0.58 + Math.abs(score) * 0.12);
    } else if (score >= 0.45) {
      action = "BUY";
      confidence = 0.62;
    } else if (score <= -0.45) {
      action = "SELL";
      confidence = 0.62;
    } else {
      reasons.push("Momentum mixed — no clear directional edge");
    }

    return {
      symbol: quote.symbol,
      action,
      confidence,
      regime,
      reasons,
      metrics: {
        priceUsd: quote.priceUsd,
        percentChange1h: change1h,
        percentChange24h: change24h,
        percentChange7d: change7d,
        volume24hUsd: quote.volume24hUsd,
        marketCapUsd: quote.marketCapUsd,
        globalMarketCapChange24h: globalChange,
        momentumScore: Number(score.toFixed(2)),
      },
      source: quote.mock ? "cmc-mock" : `cmc-agent-hub-${getDataSource()}`,
      generatedAt: new Date().toISOString(),
    };
  }

  mergeSignals(cmcSignal, maSignal) {
    const weight = { BUY: 1, HOLD: 0, SELL: -1 };
    const cmcPart = weight[cmcSignal.action] * cmcSignal.confidence * 0.55;
    const maPart = weight[maSignal.action] * maSignal.confidence * 0.45;
    const composite = cmcPart + maPart;

    let action = "HOLD";
    let confidence = 0.5;
    const reasons = [...cmcSignal.reasons];

    if (maSignal.reasons.length > 0) {
      reasons.push(...maSignal.reasons);
    }

    if (composite >= 0.32) {
      action = "BUY";
      confidence = Math.min(0.9, 0.6 + composite * 0.45);
    } else if (composite <= -0.32) {
      action = "SELL";
      confidence = Math.min(0.9, 0.6 + Math.abs(composite) * 0.45);
    } else if (cmcSignal.action !== "HOLD") {
      action = cmcSignal.action;
      confidence = cmcSignal.confidence;
    } else if (maSignal.action !== "HOLD") {
      action = maSignal.action;
      confidence = maSignal.confidence;
    } else {
      reasons.push("CMC + MA crossover both neutral");
    }

    if (cmcSignal.action === maSignal.action && cmcSignal.action !== "HOLD") {
      confidence = Math.min(0.92, confidence + 0.08);
      reasons.push(`CMC and MA agree on ${cmcSignal.action}`);
    }

    const sources = [cmcSignal.source];
    if (maSignal.action !== "HOLD") {
      sources.push("ma-crossover");
    }

    return {
      ...cmcSignal,
      action,
      confidence: Number(confidence.toFixed(2)),
      reasons: [...new Set(reasons)],
      source: sources.join("+"),
      technical: maSignal.metrics,
      metrics: {
        ...cmcSignal.metrics,
        ma9: maSignal.metrics?.ma9,
        ma21: maSignal.metrics?.ma21,
        compositeScore: Number(composite.toFixed(3)),
      },
    };
  }

  async getTradingSignal(symbol = "BNB") {
    const [quote, globalMetrics] = await Promise.all([
      this.getQuote(symbol),
      this.getGlobalMetrics(),
    ]);
    const cmcSignal = this.buildSignal(quote, globalMetrics);

    try {
      const strategyService = require("./strategyService");
      const maSignal = await strategyService.getMaCrossoverSignal(symbol);
      const merged = this.mergeSignals(cmcSignal, maSignal);
      const duration = await strategyService.getSignalDuration(symbol, merged.action);
      return { ...merged, duration };
    } catch (error) {
      console.warn("MA crossover signal unavailable:", error.message);
      return cmcSignal;
    }
  }

  normalizeQuote(symbol, entry, quote, mock) {
    return {
      mock,
      symbol: symbol.toUpperCase(),
      name: entry.name || symbol,
      priceUsd: quote.price,
      percentChange1h: quote.percent_change_1h,
      percentChange24h: quote.percent_change_24h,
      percentChange7d: quote.percent_change_7d,
      volume24hUsd: quote.volume_24h,
      marketCapUsd: quote.market_cap,
      lastUpdated: quote.last_updated || new Date().toISOString(),
    };
  }

  mockQuote(symbol) {
    const seed = symbol.toUpperCase() === "BNB" ? 620.42 : 100;
    return {
      mock: true,
      symbol: symbol.toUpperCase(),
      name: symbol.toUpperCase(),
      priceUsd: seed,
      percentChange1h: 0.35,
      percentChange24h: 1.85,
      percentChange7d: 4.2,
      volume24hUsd: 1_850_000_000,
      marketCapUsd: 90_000_000_000,
      lastUpdated: new Date().toISOString(),
    };
  }
}

module.exports = new CmcService();
