const axios = require("axios");
const { getChainConfig, assertLiveExecutionAllowed } = require("../config/chainConfig");

/**
 * Trust Wallet Agent Kit (TWAK) integration layer.
 * Configure TWAK_API_URL + TWAK_API_KEY from the Trust Wallet developer portal.
 * Falls back to paper execution when not configured.
 */
class TwakService {
  isConfigured() {
    const url = process.env.TWAK_API_URL?.trim();
    const key = process.env.TWAK_API_KEY?.trim();
    const placeholders = new Set(["", "your_twak_api_key", "your_twak_api_url"]);
    return Boolean(url && key && !placeholders.has(url) && !placeholders.has(key));
  }

  getMode() {
    return process.env.AGENT_EXECUTION_MODE === "live" && this.isConfigured()
      ? "live"
      : "paper";
  }

  async executeSwap({ symbol, action, amountUsd, walletAddress }) {
    if (this.getMode() === "live") {
      assertLiveExecutionAllowed();
    }

    const { twakChain: chain } = getChainConfig();
    const side = action === "SELL" ? "sell" : "buy";
    const payload = {
      chain,
      fromToken: side === "buy" ? "USDT" : symbol,
      toToken: side === "buy" ? symbol : "USDT",
      amountUsd,
      walletAddress,
      slippageBps: Number(process.env.AGENT_SLIPPAGE_BPS || 100),
    };

    if (this.getMode() !== "live") {
      return {
        ok: true,
        mode: "paper",
        provider: "trust-wallet-agent-kit-simulated",
        message: `Paper ${action} ${symbol} for $${amountUsd} via TWAK rules`,
        txHash: `paper-${Date.now().toString(16)}`,
        payload,
      };
    }

    try {
      const response = await axios.post(
        `${process.env.TWAK_API_URL.replace(/\/$/, "")}/v1/swap`,
        payload,
        {
          headers: {
            Authorization: `Bearer ${process.env.TWAK_API_KEY}`,
            "Content-Type": "application/json",
          },
          timeout: 30000,
        }
      );

      return {
        ok: true,
        mode: "live",
        provider: "trust-wallet-agent-kit",
        txHash: response.data?.txHash || response.data?.transactionHash,
        message: response.data?.message || "Swap submitted via TWAK",
        payload,
      };
    } catch (error) {
      return {
        ok: false,
        mode: "live",
        provider: "trust-wallet-agent-kit",
        message: error.response?.data?.message || error.message,
        payload,
      };
    }
  }
}

module.exports = new TwakService();
