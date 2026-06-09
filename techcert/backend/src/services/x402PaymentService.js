/**
 * x402 micropayment hooks for CMC data and agent tool access.
 * When X402_ENABLED=true, records payment metadata on trades and
 * prepares headers for pay-per-request CMC x402 endpoints.
 */
const { getChainConfig } = require("../config/chainConfig");

class X402PaymentService {
  isEnabled() {
    return process.env.X402_ENABLED === "true";
  }

  getConfig() {
    return {
      enabled: this.isEnabled(),
      network: process.env.X402_NETWORK || "bsc",
      facilitatorUrl: process.env.X402_FACILITATOR_URL || null,
      cmcX402Base: "https://pro-api.coinmarketcap.com/x402",
      mcpX402Url: "https://mcp.coinmarketcap.com/x402/mcp",
      chain: getChainConfig(),
    };
  }

  /**
   * Build optional payment metadata to attach to a trade record.
   * Full TWAK x402 signing is delegated to the TWAK CLI/SDK at execution time.
   */
  buildTradePaymentMeta({ purpose = "data", amountUsd = 0.01 } = {}) {
    if (!this.isEnabled()) {
      return null;
    }
    return {
      protocol: "x402",
      purpose,
      amountUsd,
      network: process.env.X402_NETWORK || "bsc",
      timestamp: new Date().toISOString(),
    };
  }

  async fetchCmcWithX402(path, { paymentSignature } = {}) {
    if (!paymentSignature) {
      const err = new Error("x402 payment signature required for pay-per-request CMC access");
      err.status = 402;
      err.code = "X402_PAYMENT_REQUIRED";
      throw err;
    }

    const axios = require("axios");
    const base = "https://pro-api.coinmarketcap.com";
    const response = await axios.get(`${base}${path}`, {
      headers: { "PAYMENT-SIGNATURE": paymentSignature },
      timeout: 20000,
    });
    return response.data;
  }
}

module.exports = new X402PaymentService();
