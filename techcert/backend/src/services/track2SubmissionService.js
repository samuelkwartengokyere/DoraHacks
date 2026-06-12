const cmcService = require("./cmcService");

const DORAHACKS_URL = "https://dorahacks.io/hackathon/bnbhack-twt-cmc/detail";

function formatUsd(value) {
  if (value == null || Number.isNaN(Number(value))) return "—";
  return `$${Number(value).toFixed(2)}`;
}

function formatPercent(value) {
  if (value == null || Number.isNaN(Number(value))) return "—";
  return `${Number(value).toFixed(2)}%`;
}

function buildStrategyExplanation(run) {
  const skill = run.skillOutput || {};
  const backtest = skill.backtest || {};
  const signal = skill.cmcSignal || {};
  const submission = skill.dorahacksSubmission || {};
  const params = run.params || {};
  const dataSource = submission.dataSource || cmcService.getDataSource?.() || "rest";
  const fastPeriod = params.fastPeriod ?? 9;
  const slowPeriod = params.slowPeriod ?? 21;
  const initialUsd = params.initialUsd ?? 1000;

  const lines = [
    "# SignalForge — Track 2 Strategy Skill",
    "",
    `**Skill:** \`${skill.skill || run.strategyType || "cmc-momentum-ma-crossover"}\``,
    `**Symbol:** ${run.symbol}`,
    `**Generated:** ${new Date(run.createdAt || skill.generatedAt || Date.now()).toISOString()}`,
    "",
    "## Overview",
    "",
    "SignalForge ships a CoinMarketCap Agent Hub–powered strategy skill that combines live CMC momentum signals with a backtestable MA crossover confirmation layer. The deliverable is a structured, replayable strategy spec — not a live-trading agent.",
    "",
    "## Data Pipeline (CMC Agent Hub)",
    "",
    "1. **Market data** — Latest quote + global metrics via CMC Agent Hub (`" + dataSource + "` path).",
    "2. **Signal engine** — Momentum score from 1h/24h/7d price action, global market cap regime, and volume confirmation.",
    "3. **Technical confirmation** — MA(" + fastPeriod + "/" + slowPeriod + ") crossover on hourly OHLCV (Binance klines, 7-day window).",
    "4. **Backtest** — Simulated round-trip trades with configurable fees and slippage; outputs P&L, win rate, and max drawdown.",
    "",
    "## Signal Logic",
    "",
    submission.signalLogic ||
      "CMC Agent Hub momentum score merged with MA crossover confirmation on hourly candles.",
    "",
    "### Current CMC Signal",
    "",
    "| Field | Value |",
    "| --- | --- |",
    `| Action | **${signal.action || "—"}** |`,
    `| Regime | ${signal.regime || "—"} |`,
    `| Confidence | ${signal.confidence != null ? `${(signal.confidence * 100).toFixed(0)}%` : "—"} |`,
    `| Price (USD) | ${signal.metrics?.priceUsd != null ? formatUsd(signal.metrics.priceUsd) : "—"} |`,
    `| Momentum score | ${signal.metrics?.momentumScore ?? "—"} |`,
    "",
    signal.reasons?.length
      ? "**Reasoning:**\n\n" + signal.reasons.map((r) => `- ${r}`).join("\n")
      : "",
    "",
    "## Backtest Results (7-day hourly)",
    "",
    "| Metric | Value |",
    "| --- | --- |",
    `| Initial capital | ${formatUsd(initialUsd)} |`,
    `| Final equity | ${formatUsd(backtest.finalEquityUsd)} |`,
    `| P&L | ${formatUsd(backtest.pnlUsd)} (${formatPercent(backtest.pnlPercent)}) |`,
    `| Trades | ${backtest.tradeCount ?? "—"} |`,
    `| Win rate | ${backtest.winRate != null ? formatPercent(backtest.winRate) : "—"} |`,
    `| Max drawdown | ${backtest.maxDrawdownPercent != null ? formatPercent(backtest.maxDrawdownPercent) : "—"} |`,
    backtest.disqualified ? "| Drawdown cap | **Would fail evaluation cap** |" : "",
    "",
    skill.recommendation?.backtestAligned != null
      ? `**Signal/backtest alignment:** ${skill.recommendation.backtestAligned ? "Yes — live signal direction matches backtest edge." : "No — signal and backtest diverge; review before acting."}`
      : "",
    "",
    "## Track 1 Consumption (optional)",
    "",
    submission.track1Consumption ||
      "Track 1 autonomous agents can poll this skill output and auto-execute TWAK swaps when the signal action changes and confidence exceeds the agent threshold.",
    "",
    "## Reproducibility",
    "",
    "```bash",
    "# Run backtest via SignalForge API (authenticated)",
    `curl -X POST $API_URL/strategies/backtest \\`,
    `  -H "Authorization: Bearer <token>" \\`,
    `  -H "Content-Type: application/json" \\`,
    `  -d '{"symbol":"${run.symbol}","fastPeriod":${fastPeriod},"slowPeriod":${slowPeriod},"initialUsd":${initialUsd}}'`,
    "",
    "# Export submission JSON",
    `curl $API_URL/competition/track2/export/${run._id} \\`,
    `  -H "Authorization: Bearer <token>"`,
    "```",
    "",
    "## DoraHacks Submission",
    "",
    `- Attach the exported skill JSON (signalforge-track2-${run._id}.json)`,
    "- Paste this write-up into your BUIDL strategy explanation",
    `- Submit by **June 21, 2026 12:00 UTC** on [DoraHacks](${DORAHACKS_URL})`,
    "- No on-chain registration required for Track 2",
    "",
    "## Sponsor Stack",
    "",
    "- **CoinMarketCap Agent Hub** — primary data + signal layer (MCP / REST / optional x402)",
    "- **Trust Wallet Agent Kit** — optional consumption by Track 1 agents for execution",
    "- **BNB Chain** — eligible token universe aligned with Track 1 competition rules",
    "",
  ];

  return lines.filter((line) => line !== false).join("\n");
}

function buildSubmissionPackage(run) {
  const skillOutput = run.skillOutput || {};
  const strategyExplanation = buildStrategyExplanation(run);

  return {
    track: "strategy-skills",
    hackathon: "BNB Hack: AI Trading Agent Edition",
    skill: skillOutput,
    strategyExplanation,
    metadata: {
      name: run.name,
      symbol: run.symbol,
      strategyType: run.strategyType,
      pnlPercent: run.pnlPercent,
      tradeCount: run.tradeCount,
      generatedAt: run.createdAt,
      dataSource: skillOutput.dorahacksSubmission?.dataSource || cmcService.getDataSource?.() || "rest",
      dorahacksUrl: DORAHACKS_URL,
    },
    submissionNotes:
      "Submit the skill JSON plus this strategy explanation on DoraHacks Track 2. No on-chain registration required.",
  };
}

module.exports = {
  buildStrategyExplanation,
  buildSubmissionPackage,
};
