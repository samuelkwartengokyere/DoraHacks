const { execFile } = require("child_process");
const { promisify } = require("util");
const { getChainConfig } = require("../config/chainConfig");
const { ELIGIBLE_SET } = require("../config/competitionTokens");
const twakService = require("./twakService");
const cmcService = require("./cmcService");
const cmcMcpClient = require("./cmcMcpClient");
const x402PaymentService = require("./x402PaymentService");
const bnbChainService = require("./bnbChainService");
const dailyTradeService = require("./dailyTradeService");
const { getEvaluationConfig, isWithinEvaluationWindow } = require("../config/evaluationConfig");

const execFileAsync = promisify(execFile);

const COMPETITION_CONTRACT =
  process.env.COMPETITION_CONTRACT_ADDRESS ||
  "0x212c61b9b72c95d95bf29cf032f5e5635629aed5";

const DORAHACKS_URL = "https://dorahacks.io/hackathon/bnbhack-twt-cmc/detail";

async function tryTwakRegister() {
  try {
    const { stdout, stderr } = await execFileAsync("twak", ["compete", "register"], {
      timeout: 60000,
    });
    return { ok: true, stdout: stdout.trim(), stderr: stderr?.trim() || null };
  } catch (error) {
    return {
      ok: false,
      message: error.message,
      hint: "Install TWAK CLI: curl -fsSL https://agent-kit.trustwallet.com/install.sh | bash",
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

function getTrack2Readiness() {
  const checklist = [
    {
      id: "skill_spec",
      label: "Backtestable strategy skill spec (JSON export)",
      done: true,
      action: "Run CMC Strategy Skill → export via GET /api/strategies/runs/:id/export",
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

async function getDualTrackStatus(agent = null) {
  const [track1] = await Promise.all([getTrack1Readiness(agent)]);

  return {
    track1,
    track2: getTrack2Readiness(),
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
