const axios = require("axios");

const PLACEHOLDER_KEYS = new Set([
  "",
  "your_cmc_pro_api_key",
  "your_cmc_mcp_api_key",
]);

class CmcService {
  isConfigured() {
    const key = process.env.CMC_PRO_API_KEY?.trim();
    return Boolean(key && !PLACEHOLDER_KEYS.has(key));
  }

  async getQuote(symbol = "BNB") {
    if (!this.isConfigured()) {
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
    if (!this.isConfigured()) {
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
    const change24h = quote.percentChange24h ?? 0;
    const change7d = quote.percentChange7d ?? 0;
    const volumeRatio = quote.volume24hUsd / Math.max(quote.marketCapUsd, 1);

    let regime = "neutral";
    if (change24h > 3 && change7d > 0) regime = "bullish";
    else if (change24h < -3 && change7d < 0) regime = "bearish";
    else if (Math.abs(change24h) < 1) regime = "ranging";

    let action = "HOLD";
    let confidence = 0.5;
    const reasons = [];

    if (regime === "bullish" && volumeRatio > 0.02) {
      action = "BUY";
      confidence = 0.72;
      reasons.push("Positive 24h/7d momentum with healthy volume");
    } else if (regime === "bearish") {
      action = "SELL";
      confidence = 0.68;
      reasons.push("Bearish regime — risk-off signal from CMC data");
    } else if (change24h > 1.5 && globalMetrics.marketCapChange24h > 0) {
      action = "BUY";
      confidence = 0.6;
      reasons.push("BNB outperforming while global market cap rises");
    } else {
      reasons.push("No strong edge — wait for clearer CMC signal");
    }

    return {
      symbol: quote.symbol,
      action,
      confidence,
      regime,
      reasons,
      metrics: {
        priceUsd: quote.priceUsd,
        percentChange24h: change24h,
        percentChange7d: change7d,
        volume24hUsd: quote.volume24hUsd,
        marketCapUsd: quote.marketCapUsd,
        globalMarketCapChange24h: globalMetrics.marketCapChange24h,
      },
      source: quote.mock ? "cmc-mock" : "cmc-agent-hub",
      generatedAt: new Date().toISOString(),
    };
  }

  async getTradingSignal(symbol = "BNB") {
    const [quote, globalMetrics] = await Promise.all([
      this.getQuote(symbol),
      this.getGlobalMetrics(),
    ]);
    return this.buildSignal(quote, globalMetrics);
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
