function parseNumber(value, fallback) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

function parseDate(value) {
  if (!value) return null;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
}

function getEvaluationConfig() {
  const initialUsd = parseNumber(process.env.EVALUATION_INITIAL_USD, 1000);
  const maxDrawdownPercent = parseNumber(process.env.EVALUATION_MAX_DRAWDOWN_PERCENT, 30);
  const minTradeCount = parseNumber(process.env.EVALUATION_MIN_TRADE_COUNT, 5);
  const feeBps = parseNumber(process.env.EVALUATION_FEE_BPS, 10);
  const slippageBps = parseNumber(
    process.env.EVALUATION_SLIPPAGE_BPS || process.env.AGENT_SLIPPAGE_BPS,
    100
  );
  const autoExecute = process.env.EVALUATION_AUTO_EXECUTE !== "false";
  const windowStart = parseDate(process.env.EVALUATION_WINDOW_START);
  const windowEnd = parseDate(process.env.EVALUATION_WINDOW_END);

  return {
    initialUsd,
    maxDrawdownPercent,
    minTradeCount,
    feeBps,
    slippageBps,
    autoExecute,
    windowStart: windowStart?.toISOString() ?? null,
    windowEnd: windowEnd?.toISOString() ?? null,
    track: "autonomous-agents",
    rules: {
      rankingMetric: "total_return_percent",
      disqualifyAboveDrawdown: maxDrawdownPercent,
      requireMinTrades: minTradeCount,
      simulateTransactionCosts: true,
    },
  };
}

function isWithinEvaluationWindow(at = new Date()) {
  const { windowStart, windowEnd } = getEvaluationConfig();
  const start = parseDate(windowStart);
  const end = parseDate(windowEnd);

  if (start && at < start) return false;
  if (end && at > end) return false;
  return true;
}

module.exports = {
  getEvaluationConfig,
  isWithinEvaluationWindow,
};
