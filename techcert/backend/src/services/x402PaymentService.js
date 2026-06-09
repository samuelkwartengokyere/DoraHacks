const twakService = require("./twakService");
const { getChainConfig } = require("../config/chainConfig");

class X402PaymentService {
  isEnabled() {
    return process.env.X402_ENABLED === "true";
  }

  getConfig() {
    return {
      enabled: this.isEnabled(),
      network: process.env.X402_NETWORK || "base",
      maxPaymentAtomic: process.env.X402_MAX_PAYMENT_ATOMIC || "10000",
      cmcX402Base: "https://pro-api.coinmarketcap.com/x402",
      mcpX402Url: "https://mcp.coinmarketcap.com/x402/mcp",
      twakSidecarRequired: true,
      chain: getChainConfig(),
    };
  }

  buildCmcQuotesUrl(symbol) {
    const upper = symbol.toUpperCase();
    return `https://pro-api.coinmarketcap.com/x402/v3/cryptocurrency/quotes/latest?symbol=${upper}&convert=USD`;
  }

  async fetchCmcQuote(symbol) {
    const url = this.buildCmcQuotesUrl(symbol);
    const result = await twakService.x402Request({
      url,
      method: "GET",
      preferNetwork: process.env.X402_NETWORK || "base",
    });

    const body = typeof result.data === "string" ? JSON.parse(result.data) : result.data;
    const entry = body?.data?.[symbol.toUpperCase()];
    if (!entry) {
      throw new Error(`x402 CMC response missing quote for ${symbol}`);
    }

    return {
      quote: entry,
      paymentTxHash: result.paymentTxHash,
      protocol: "x402",
      url,
    };
  }

  buildTradePaymentMeta({ purpose = "data", amountUsd = 0.01, paymentTxHash = null } = {}) {
    if (!this.isEnabled()) return null;
    return {
      protocol: "x402",
      purpose,
      amountUsd,
      network: process.env.X402_NETWORK || "base",
      paymentTxHash,
      timestamp: new Date().toISOString(),
    };
  }
}

module.exports = new X402PaymentService();
