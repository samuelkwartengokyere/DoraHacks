const axios = require("axios");
const { getChainConfig, assertLiveExecutionAllowed } = require("../config/chainConfig");

const PLACEHOLDERS = new Set(["", "your_twak_api_key", "your_twak_api_url"]);

/**
 * Trust Wallet Agent Kit integration.
 * Live mode expects a TWAK REST sidecar (`twak serve --rest`) reachable from Vercel via TWAK_API_URL.
 * Actions: swap, competition_register, x402_request, competition_status
 */
class TwakService {
  getApiKey() {
    return (
      process.env.TWAK_API_KEY?.trim() ||
      process.env.TWAK_HMAC_SECRET?.trim() ||
      ""
    );
  }

  getBaseUrl() {
    return process.env.TWAK_API_URL?.trim().replace(/\/$/, "") || "";
  }

  isConfigured() {
    const url = this.getBaseUrl();
    const key = this.getApiKey();
    return Boolean(url && key && !PLACEHOLDERS.has(url) && !PLACEHOLDERS.has(key));
  }

  usesActionsApi() {
    return process.env.TWAK_API_MODE !== "legacy";
  }

  getMode() {
    return process.env.AGENT_EXECUTION_MODE === "live" && this.isConfigured()
      ? "live"
      : "paper";
  }

  authHeaders() {
    return {
      Authorization: `Bearer ${this.getApiKey()}`,
      "Content-Type": "application/json",
    };
  }

  async invokeAction(actionName, body = {}) {
    const response = await axios.post(
      `${this.getBaseUrl()}/actions/${actionName}`,
      body,
      { headers: this.authHeaders(), timeout: 90000 }
    );
    return response.data;
  }

  async listActions() {
    const response = await axios.get(`${this.getBaseUrl()}/actions`, {
      headers: this.authHeaders(),
      timeout: 15000,
    });
    return response.data;
  }

  extractTxHash(data) {
    if (!data) return null;
    return (
      data.txHash ||
      data.transactionHash ||
      data.hash ||
      data.tx?.hash ||
      data.result?.txHash ||
      data.result?.transactionHash
    );
  }

  buildSwapBody({ symbol, action, amountUsd }) {
    const { twakChain } = getChainConfig();
    const slippagePercent = (Number(process.env.AGENT_SLIPPAGE_BPS || 100) / 100).toFixed(2);

    if (action === "BUY") {
      return {
        fromChain: twakChain,
        fromToken: "USDT",
        toChain: twakChain,
        toToken: symbol.toUpperCase(),
        amount: String(amountUsd),
        slippage: slippagePercent,
      };
    }

    return {
      fromChain: twakChain,
      fromToken: symbol.toUpperCase(),
      toChain: twakChain,
      toToken: "USDT",
      amount: String(amountUsd),
      slippage: slippagePercent,
    };
  }

  async executeSwap({ symbol, action, amountUsd, walletAddress }) {
    if (this.getMode() === "live") {
      assertLiveExecutionAllowed();
    }

    const { twakChain: chain } = getChainConfig();
    const swapBody = this.buildSwapBody({ symbol, action, amountUsd });
    const payload = { ...swapBody, chain, walletAddress, amountUsd };

    if (this.getMode() !== "live") {
      return {
        ok: true,
        mode: "paper",
        provider: "trust-wallet-agent-kit-simulated",
        message: `Paper ${action} ${symbol} for $${amountUsd} via TWAK autonomous rules`,
        txHash: `paper-${Date.now().toString(16)}`,
        payload,
        autonomous: true,
      };
    }

    try {
      let data;
      let provider = "trust-wallet-agent-kit-actions";

      if (this.usesActionsApi()) {
        data = await this.invokeAction("swap", swapBody);
      } else {
        provider = "trust-wallet-agent-kit-legacy";
        const response = await axios.post(
          `${this.getBaseUrl()}/v1/swap`,
          {
            chain,
            fromToken: swapBody.fromToken,
            toToken: swapBody.toToken,
            amountUsd,
            walletAddress,
            slippageBps: Number(process.env.AGENT_SLIPPAGE_BPS || 100),
          },
          { headers: this.authHeaders(), timeout: 60000 }
        );
        data = response.data;
      }

      return {
        ok: true,
        mode: "live",
        provider,
        txHash: this.extractTxHash(data),
        message: data?.message || data?.result?.message || `${action} submitted via TWAK autonomous wallet`,
        payload,
        raw: data,
        autonomous: true,
      };
    } catch (error) {
      const detail =
        error.response?.data?.message ||
        error.response?.data?.error ||
        error.response?.data?.result?.message ||
        error.message;
      return {
        ok: false,
        mode: "live",
        provider: "trust-wallet-agent-kit",
        message: detail,
        payload,
      };
    }
  }

  async competitionRegister() {
    if (!this.isConfigured()) {
      throw new Error("TWAK not configured — set TWAK_API_URL and TWAK_API_KEY on Vercel");
    }
    const data = await this.invokeAction("competition_register", {});
    return {
      ok: true,
      txHash: this.extractTxHash(data),
      message: data?.message || "Competition registration submitted",
      raw: data,
    };
  }

  async competitionStatus() {
    if (!this.isConfigured()) {
      throw new Error("TWAK not configured");
    }
    return this.invokeAction("competition_status", {});
  }

  async x402Request({
    url,
    method = "GET",
    body = null,
    maxPaymentAtomic = process.env.X402_MAX_PAYMENT_ATOMIC || "10000",
    preferNetwork = process.env.X402_NETWORK || "base",
    preferMethod = "eip3009",
    autoApprove = true,
  }) {
    if (!this.isConfigured()) {
      throw new Error("TWAK sidecar required for x402 signing — set TWAK_API_URL to your twak serve --rest host");
    }

    const payload = {
      url,
      method,
      maxPaymentAtomic: String(maxPaymentAtomic),
      preferNetwork,
      preferMethod,
      autoApprove,
    };
    if (body) payload.body = body;

    const data = await this.invokeAction("x402_request", payload);
    return {
      ok: true,
      data: data?.body ?? data?.result?.body ?? data?.result ?? data,
      paymentTxHash: this.extractTxHash(data?.payment ?? data),
      raw: data,
    };
  }

  async x402Quote({ url, method = "GET", body = null }) {
    if (!this.isConfigured()) {
      throw new Error("TWAK not configured");
    }
    const payload = { url, method };
    if (body) payload.body = body;
    return this.invokeAction("x402_quote", payload);
  }

  async healthCheck() {
    if (!this.isConfigured()) {
      return { ok: false, message: "TWAK not configured" };
    }
    try {
      const actions = await this.listActions();
      const names = Array.isArray(actions)
        ? actions.map((a) => a.name || a)
        : actions?.actions?.map((a) => a.name) || [];
      return {
        ok: true,
        mode: this.getMode(),
        apiMode: this.usesActionsApi() ? "actions" : "legacy",
        actions: names,
        message: `TWAK sidecar reachable (${names.length} actions)`,
      };
    } catch (error) {
      return {
        ok: false,
        mode: this.getMode(),
        message: error.response?.data?.message || error.message,
        hint: "Deploy twak serve --rest on Railway/Fly and set TWAK_API_URL to its public URL",
      };
    }
  }
}

module.exports = new TwakService();
