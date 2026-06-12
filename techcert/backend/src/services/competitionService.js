const { getChainConfig } = require("../config/chainConfig");
const { ELIGIBLE_SET } = require("../config/competitionTokens");
const twakService = require("./twakService");
const cmcService = require("./cmcService");
const cmcMcpClient = require("./cmcMcpClient");
const x402PaymentService = require("./x402PaymentService");
const bnbChainService = require("./bnbChainService");
const dailyTradeService = require("./dailyTradeService");
const { getEvaluationConfig, isWithinEvaluationWindow } = require("../config/evaluationConfig");

const COMPETITION_CONTRACT =
  process.env.COMPETITION_CONTRACT_ADDRESS ||
  "0x212c61b9b72c95d95bf29cf032f5e5635629aed5";

const DORAHACKS_URL = "https://dorahacks.io/hackathon/bnbhack-twt-cmc/detail";

async function tryTwakRegister() {
  if (!twakService.isConfigured()) {
    return {
      ok: false,
      message: "TWAK sidecar not configured on Vercel",
      hint: "Set TWAK_API_URL to your twak serve --rest host, then retry",
    };
  }

  try {
    const result = await twakService.competitionRegister();
    return {
      ok: true,
      txHash: result.txHash,
      message: result.message,
      raw: result.raw,
    };
  } catch (error) {
    const diagnostics = twakService.getConfigDiagnostics();
    const twakMessage =
      error.response?.data?.error ||
      error.response?.data?.message ||
      error.message;
    const authFailed = twakService.isAuthError(error);
    const gasFailed = /insufficient funds|tx cost|overshot|gas required/i.test(twakMessage);

    let hint = "Ensure twak serve --rest is running with TWAK_WALLET_PASSWORD and a funded BSC wallet";
    if (gasFailed) {
      let wallet = null;
      try {
        const status = await twakService.competitionStatus();
        wallet = status?.participant || status?.walletAddress || status?.address || null;
      } catch {
        // competition_status may still work when register fails for gas
      }

      const txCostWei = twakMessage.match(/tx cost (\d+)/i)?.[1];
      const gasEstimate = txCostWei
        ? `~${(Number(txCostWei) / 1e18).toFixed(6)} BNB`
        : "~0.001 BNB";

      hint = wallet
        ? `Send ${gasEstimate} BNB on BSC mainnet to the TWAK wallet ${wallet}, wait for confirmation, then retry.`
        : `Fund the TWAK agent wallet on BSC mainnet with ${gasEstimate} for gas. Find the address in Railway sidecar startup logs.`;
    } else if (diagnostics.urlIssue) {
      hint = diagnostics.urlIssue;
    } else if (authFailed) {
      hint =
        "TWAK_API_KEY / TWAK_HMAC_SECRET on Vercel must exactly match TWAK_HMAC_SECRET on Railway. Redeploy Vercel after updating env vars.";
    }

    return {
      ok: false,
      message: authFailed
        ? `TWAK authentication failed (401) — ${twakMessage}. Bearer token must match TWAK_HMAC_SECRET on the Railway sidecar.`
        : twakMessage,
      hint,
      diagnostics,
    };
  }
}

async function getTrack1Readiness(agent) {
  const chain = getChainConfig();
  const config = getEvaluationConfig();
  const walletAddress =
    process.env.AGENT_WALLET_ADDRESS?.trim() || bnbChainService.wallet?.address || null;

  let dailyProgress = null;
  if (agent?._id) {
    dailyProgress = await dailyTradeService.getDailyTradeProgress(agent._id);
  }

  const checklist = [
    {
      id: "on_chain_register",
      label: "On-chain registration (twak compete register)",
      done: false,
      action: `Run: twak compete register — contract ${COMPETITION_CONTRACT}`,
      url: `https://bsctrace.com/address/${COMPETITION_CONTRACT}`,
    },
    {
      id: "dorahacks_buidl",
      label: "DoraHacks BUIDL + agent address + strategy write-up",
      done: false,
      action: "Submit on DoraHacks with GitHub, demo video, and agent wallet address",
      url: DORAHACKS_URL,
    },
    {
      id: "mainnet_wallet",
      label: "Funded agent wallet on BSC mainnet",
      done: Boolean(walletAddress) && chain.mode === "mainnet",
      action: "Set BNB_CHAIN_MODE=mainnet, fund AGENT_WALLET_ADDRESS with in-scope assets",
    },
    {
      id: "twak_live",
      label: "TWAK live execution configured",
      done: twakService.getMode() === "live" && twakService.isConfigured(),
      action: "Set TWAK_API_URL, TWAK_API_KEY, AGENT_EXECUTION_MODE=live",
    },
    {
      id: "cmc_data",
      label: "CMC Agent Hub data (MCP or Pro API)",
      done: cmcMcpClient.isConfigured() || cmcService.isConfigured(),
      action: "Set CMC_PRO_API_KEY or CMC_MCP_API_KEY; optional CMC_DATA_SOURCE=mcp",
    },
    {
      id: "eligible_token",
      label: "Agent trades eligible BEP-20 token only",
      done: agent ? true : false,
      detail: agent ? `Symbol: ${agent.symbol}` : "Create agent with eligible symbol",
    },
    {
      id: "daily_trades",
      label: "≥1 executed trade per competition day (7 total)",
      done: dailyProgress?.competitionReady ?? false,
      detail: dailyProgress?.reason || "Start monitor before Jun 22 trading window",
    },
    {
      id: "x402",
      label: "x402 in trade loop (optional — special prize)",
      done: x402PaymentService.isEnabled(),
      action: "Enable X402_ENABLED=true and use TWAK x402 for CMC/inference payments",
    },
  ];

  return {
    track: "autonomous-agents",
    contractAddress: COMPETITION_CONTRACT,
    chain,
    walletAddress,
    inTradingWindow: isWithinEvaluationWindow(),
    evaluationWindow: { start: config.windowStart, end: config.windowEnd },
    eligibleTokenCount: ELIGIBLE_SET.size,
    dailyProgress,
    checklist,
    registration: {
      cli: "twak compete register",
      mcp: "competition_register",
      contract: COMPETITION_CONTRACT,
      dorahacks: DORAHACKS_URL,
    },
  };
}

function getTrack2Readiness({ hasBacktestRun = false } = {}) {
  const checklist = [
    {
      id: "skill_spec",
      label: "Backtestable strategy skill spec (JSON export)",
      done: hasBacktestRun,
      action: "Dashboard → Strategies → Run backtest once, then export JSON",
    },
    {
      id: "cmc_hub",
      label: "CMC Agent Hub integration (MCP / REST / x402)",
      done: cmcMcpClient.isConfigured() || cmcService.isConfigured(),
      action: "Use MCP (CMC_DATA_SOURCE=mcp) or Pro API for live signals",
    },
    {
      id: "dorahacks_skill",
      label: "Submit Skill + strategy spec on DoraHacks (no on-chain registration)",
      done: false,
      action: "Upload skill JSON and strategy explanation on DoraHacks Track 2",
      url: DORAHACKS_URL,
    },
    {
      id: "x402_skill",
      label: "x402 pay-per-request data path (optional — special prize)",
      done: x402PaymentService.isEnabled(),
      action: "Use CMC x402 MCP at https://mcp.coinmarketcap.com/x402/mcp",
    },
  ];

  return {
    track: "strategy-skills",
    checklist,
    dorahacks: DORAHACKS_URL,
    skillName: "cmc-momentum-ma-crossover",
  };
}

async function getDualTrackStatus(agent = null, { ownerId = null } = {}) {
  const StrategyRun = require("../models/StrategyRun");

  const [track1, backtestRunCount] = await Promise.all([
    getTrack1Readiness(agent),
    ownerId
      ? StrategyRun.countDocuments({
          ownerId,
          "skillOutput.backtest.chartSeries.0": { $exists: true },
        })
      : Promise.resolve(0),
  ]);

  return {
    track1,
    track2: getTrack2Readiness({ hasBacktestRun: backtestRunCount > 0 }),
    specialPrizes: [
      { name: "Best Use of Trust Wallet Agent Kit", track: "track1", amountUsd: 2000 },
      { name: "Best Use of Agent Hub", track: "both", amountUsd: 2000 },
      { name: "Best Use of BNB AI Agent SDK", track: "both", amountUsd: 2000 },
    ],
    stackRecommendation:
      "Stack CMC Agent Hub (MCP) + TWAK (autonomous signing + x402) + BNB mainnet for strongest shot at main + special prizes.",
  };
}

module.exports = {
  COMPETITION_CONTRACT,
  DORAHACKS_URL,
  tryTwakRegister,
  getTrack1Readiness,
  getTrack2Readiness,
  getDualTrackStatus,
};
