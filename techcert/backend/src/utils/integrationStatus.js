const mongoose = require("mongoose");
const { ethers } = require("ethers");
const cmcService = require("../services/cmcService");
const twakService = require("../services/twakService");
const bnbChainService = require("../services/bnbChainService");
const x402PaymentService = require("../services/x402PaymentService");
const { getChainConfig } = require("../config/chainConfig");

const PLACEHOLDER_VALUES = new Set([
  "",
  "your_wallet_private_key",
  "your_wallet_private_key_here",
  "your_super_secret_jwt_key_change_in_production",
  "your_cmc_pro_api_key",
  "your_twak_api_key",
  "your_twak_api_url",
]);

function isRealValue(value) {
  if (!value || typeof value !== "string") return false;
  const trimmed = value.trim();
  return trimmed.length > 0 && !PLACEHOLDER_VALUES.has(trimmed);
}

function maskAddress(address) {
  if (!address || address.length < 10) return null;
  return `${address.slice(0, 6)}...${address.slice(-4)}`;
}

function getEnvConfig() {
  const twakConfigured = twakService.isConfigured();
  const liveExecutionEnabled =
    process.env.AGENT_EXECUTION_MODE === "live" && twakConfigured;
  const chain = getChainConfig();

  return {
    frontendUrl: process.env.FRONTEND_URL || "http://localhost:3000",
    apiUrl: process.env.API_PUBLIC_URL || `http://localhost:${process.env.PORT || 5000}/api`,
    mongodbUri: process.env.MONGODB_URI,
    jwtSecret: process.env.JWT_SECRET,
    cmcConfigured: cmcService.isConfigured(),
    cmcDataSource: cmcService.getDataSource?.() || "rest",
    twakConfigured,
    liveExecutionEnabled,
    executionMode: twakService.getMode(),
    bnbChainConfigured: bnbChainService.isConfigured(),
    agentWalletAddress:
      process.env.AGENT_WALLET_ADDRESS?.trim() ||
      bnbChainService.wallet?.address ||
      null,
    network: chain.networkName,
    chainId: chain.chainId,
    chainMode: chain.mode,
    x402Enabled: x402PaymentService.isEnabled(),
  };
}

function getChecklist(config) {
  return [
    {
      id: "mongodb",
      label: "MongoDB connection string configured",
      done: isRealValue(config.mongodbUri),
    },
    {
      id: "cmc",
      label: "CoinMarketCap Agent Hub API key configured",
      done: config.cmcConfigured,
    },
    {
      id: "twak",
      label: "Trust Wallet Agent Kit configured",
      done: config.twakConfigured,
    },
    {
      id: "bnb-wallet",
      label: "BNB Chain agent wallet private key configured",
      done: isRealValue(process.env.PRIVATE_KEY),
    },
    {
      id: "execution",
      label: "Live execution mode enabled (TWAK + AGENT_EXECUTION_MODE=live)",
      done: config.liveExecutionEnabled,
    },
    {
      id: "jwt",
      label: "JWT secret changed from default",
      done: isRealValue(config.jwtSecret) && config.jwtSecret !== "your_super_secret_jwt_key_change_in_production",
    },
  ];
}

function getOverallMode(config) {
  const hackathonLive =
    config.cmcConfigured && config.twakConfigured && config.liveExecutionEnabled;

  if (hackathonLive) return "live";
  if (config.cmcConfigured || config.twakConfigured || config.bnbChainConfigured) {
    return "partial";
  }
  return "mock";
}

async function testCmcConnection() {
  if (!cmcService.isConfigured()) {
    return {
      ok: false,
      mode: "mock",
      message: "CMC Pro API key not configured — using mock market signals",
    };
  }

  try {
    const quote = await cmcService.getQuote("BNB");
    return {
      ok: !quote.mock,
      mode: quote.mock ? "mock" : "live",
      message: quote.mock
        ? "CMC returned mock data"
        : `CMC live — BNB $${quote.priceUsd?.toFixed(2)}`,
      priceUsd: quote.priceUsd,
    };
  } catch (error) {
    return { ok: false, mode: "mock", message: error.message };
  }
}

async function testTwakConnection() {
  if (!twakService.isConfigured()) {
    return {
      ok: false,
      mode: "paper",
      message: "TWAK sidecar not configured — paper trading enabled",
      hint: "Deploy twak serve --rest and set TWAK_API_URL on Vercel",
    };
  }

  const health = await twakService.healthCheck();
  const chain = getChainConfig();
  const diagnostics = health.diagnostics || twakService.getConfigDiagnostics();

  return {
    ok: health.ok,
    mode: twakService.getMode(),
    apiMode: health.apiMode,
    actions: health.actions,
    message: health.ok
      ? `${health.message} · ${chain.networkName} · ${twakService.getMode()} mode`
      : health.message,
    hint: health.hint,
    diagnostics,
  };
}

async function testBnbChainConnection() {
  if (!bnbChainService.isConfigured()) {
    return {
      ok: false,
      mode: "mock",
      message: "BNB Chain wallet not configured (set PRIVATE_KEY + BNB_TESTNET_RPC)",
    };
  }

  try {
    const chain = getChainConfig();
    const blockNumber = await bnbChainService.provider.getBlockNumber();
    const balance = await bnbChainService.provider.getBalance(bnbChainService.wallet.address);

    return {
      ok: true,
      mode: "live",
      message: `Connected to ${chain.networkName} (block ${blockNumber})`,
      blockNumber,
      agentBalanceBnb: ethers.formatEther(balance),
      agentAddress: bnbChainService.wallet.address,
    };
  } catch (error) {
    return {
      ok: false,
      mode: "mock",
      message: error.message || "BNB Chain connection failed",
    };
  }
}

async function getIntegrationStatus({ deep = false } = {}) {
  const config = getEnvConfig();
  const checklist = getChecklist(config);
  const mode = getOverallMode(config);

  const integrations = {
    mongodb: {
      configured: isRealValue(config.mongodbUri),
      status: mongoose.connection.readyState === 1 ? "connected" : "disconnected",
    },
    cmc: {
      configured: config.cmcConfigured,
      status: config.cmcConfigured ? "configured" : "mock",
      protocol: config.cmcDataSource,
      hubUrl: "https://mcp.coinmarketcap.com/mcp",
    },
    twak: {
      configured: config.twakConfigured,
      status: config.twakConfigured ? config.executionMode : "paper",
      executionMode: config.executionMode,
    },
    blockchain: {
      configured: config.bnbChainConfigured,
      status: config.bnbChainConfigured ? "live" : "mock",
      network: config.network,
      chainId: config.chainId,
    },
    x402: {
      configured: config.x402Enabled,
      status: config.x402Enabled ? "enabled" : "disabled",
    },
    agentWallet: {
      configured: Boolean(config.agentWalletAddress),
      address: config.agentWalletAddress,
      addressMasked: maskAddress(config.agentWalletAddress),
    },
  };

  const status = {
    success: true,
    mode,
    readyForProduction: checklist.every((item) => item.done) && mode === "live",
    integrations,
    urls: {
      frontend: config.frontendUrl,
      api: config.apiUrl,
    },
    checklist,
    timestamp: new Date().toISOString(),
  };

  if (deep) {
    const [cmcTest, twakTest, bnbTest] = await Promise.all([
      testCmcConnection(),
      testTwakConnection(),
      testBnbChainConnection(),
    ]);

    status.integrations.cmc = {
      ...status.integrations.cmc,
      ...cmcTest,
      status: cmcTest.ok ? "live" : "mock",
    };
    status.integrations.twak = {
      ...status.integrations.twak,
      ...twakTest,
      status: twakTest.mode,
    };
    status.integrations.blockchain = {
      ...status.integrations.blockchain,
      ...bnbTest,
      status: bnbTest.ok ? "live" : "mock",
      message: bnbTest.message,
    };

    if (bnbTest.agentBalanceBnb !== undefined) {
      status.integrations.agentWallet.balanceBnb = bnbTest.agentBalanceBnb;
    }

    status.mode = getOverallMode({
      ...config,
      cmcConfigured: cmcTest.ok,
      twakConfigured: twakTest.ok,
      bnbChainConfigured: bnbTest.ok,
    });
    status.readyForProduction =
      status.mode === "live" &&
      cmcTest.ok &&
      twakTest.ok &&
      checklist.filter((item) => item.id !== "jwt").every((item) => item.done);
  }

  return status;
}

module.exports = {
  getIntegrationStatus,
  testCmcConnection,
  testTwakConnection,
  testBnbChainConnection,
  isRealValue,
};
