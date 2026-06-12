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
    const apiKey = process.env.TWAK_API_KEY?.trim() || "";
    const hmacSecret = process.env.TWAK_HMAC_SECRET?.trim() || "";

    // Railway sidecar validates Bearer against TWAK_HMAC_SECRET — prefer it when both differ.
    if (apiKey && hmacSecret && apiKey !== hmacSecret) {
      return hmacSecret;
    }

    return hmacSecret || apiKey || "";
  }

  getBaseUrl() {
    const raw = process.env.TWAK_API_URL?.trim() || "";
    return raw.replace(/\/+$/, "").replace(/\/actions$/i, "");
  }

  getConfigDiagnostics() {
    const apiKey = process.env.TWAK_API_KEY?.trim() || "";
    const hmacSecret = process.env.TWAK_HMAC_SECRET?.trim() || "";
    const baseUrl = this.getBaseUrl();
    let host = null;
    let urlIssue = null;

    try {
      if (baseUrl) {
        const parsed = new URL(baseUrl);
        host = parsed.host;
        if (/^localhost$|^127\.0\.0\.1$/i.test(parsed.hostname)) {
          urlIssue = "TWAK_API_URL points to localhost — Vercel cannot reach a local sidecar";
        }
        if (/trustwallet\.com$/i.test(parsed.hostname)) {
          urlIssue =
            "TWAK_API_URL points to Trust Wallet cloud API — use your Railway twak serve --rest URL instead";
        }
      }
    } catch {
      urlIssue = "TWAK_API_URL is not a valid URL";
    }

    return {
      host,
      urlIssue,
      authKeySource:
        apiKey && hmacSecret
          ? apiKey === hmacSecret
            ? "TWAK_HMAC_SECRET+TWAK_API_KEY (match)"
            : "TWAK_HMAC_SECRET (TWAK_API_KEY differs — using HMAC)"
          : hmacSecret
            ? "TWAK_HMAC_SECRET"
            : apiKey
              ? "TWAK_API_KEY"
              : "none",
      keysMismatch: Boolean(apiKey && hmacSecret && apiKey !== hmacSecret),
    };
  }

  isAuthError(error) {
    const status = Number(error.response?.status);
    return status === 401 || /401/.test(error.message || "");
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
      const diagnostics = this.getConfigDiagnostics();
      const twakMessage =
        error.response?.data?.error ||
        error.response?.data?.message ||
        error.message;

      let hint = "Deploy twak serve --rest on Railway/Fly and set TWAK_API_URL to its public URL";
      if (diagnostics.urlIssue) {
        hint = diagnostics.urlIssue;
      } else if (this.isAuthError(error)) {
        hint =
          "TWAK_API_KEY / TWAK_HMAC_SECRET on Vercel must exactly match TWAK_HMAC_SECRET on Railway. Redeploy Vercel after updating env vars.";
      } else if (diagnostics.keysMismatch) {
        hint =
          "TWAK_API_KEY and TWAK_HMAC_SECRET on Vercel differ — remove TWAK_API_KEY or set both to the same HMAC secret.";
      }

      return {
        ok: false,
        mode: this.getMode(),
        message: this.isAuthError(error)
          ? `TWAK authentication failed (401) — ${twakMessage}`
          : twakMessage,
        hint,
        diagnostics,
      };
    }
  }
}

module.exports = new TwakService();
