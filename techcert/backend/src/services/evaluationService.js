const Agent = require("../models/Agent");
const { getEvaluationConfig, isWithinEvaluationWindow } = require("../config/evaluationConfig");
const transactionCostService = require("./transactionCostService");

function defaultEvaluation(initialUsd) {
  return {
    initialUsd,
    cashUsd: initialUsd,
    positionQty: 0,
    peakEquityUsd: initialUsd,
    equityUsd: initialUsd,
    totalReturnPercent: 0,
    maxDrawdownPercent: 0,
    unrealizedPnlUsd: 0,
    realizedPnlUsd: 0,
    executedTradeCount: 0,
    totalFeesUsd: 0,
    isDisqualified: false,
    disqualificationReason: null,
    disqualifiedAt: null,
    lastMarkToMarketAt: null,
  };
}

function ensureEvaluation(agent) {
  const config = getEvaluationConfig();
  if (!agent.evaluation || agent.evaluation.initialUsd == null) {
    agent.evaluation = defaultEvaluation(config.initialUsd);
  }
  return agent.evaluation;
}

function computeEquity(evaluation, markPrice) {
  const price = Number(markPrice) || 0;
  const cash = evaluation.cashUsd ?? 0;
  const qty = evaluation.positionQty ?? 0;
  const equity = cash + qty * price;
  const initial = evaluation.initialUsd || getEvaluationConfig().initialUsd;
  const totalReturnPercent = initial > 0 ? ((equity - initial) / initial) * 100 : 0;

  let unrealizedPnlUsd = 0;
  if (qty > 0 && evaluation.avgEntryPriceUsd) {
    unrealizedPnlUsd = qty * (price - evaluation.avgEntryPriceUsd);
  }

  return {
    equityUsd: equity,
    totalReturnPercent,
    unrealizedPnlUsd,
  };
}

function updateDrawdown(evaluation, equityUsd) {
  const peak = Math.max(evaluation.peakEquityUsd ?? equityUsd, equityUsd);
  evaluation.peakEquityUsd = peak;
  evaluation.equityUsd = equityUsd;

  if (peak > 0) {
    const drawdown = ((peak - equityUsd) / peak) * 100;
    evaluation.maxDrawdownPercent = Math.max(evaluation.maxDrawdownPercent ?? 0, drawdown);
  }
}

function checkDisqualification(agent) {
  const config = getEvaluationConfig();
  const evaluation = ensureEvaluation(agent);

  if (evaluation.isDisqualified) {
    return { disqualified: true, reason: evaluation.disqualificationReason };
  }

  if ((evaluation.maxDrawdownPercent ?? 0) > config.maxDrawdownPercent) {
    evaluation.isDisqualified = true;
    evaluation.disqualificationReason = `Max drawdown ${evaluation.maxDrawdownPercent.toFixed(2)}% exceeded ${config.maxDrawdownPercent}% cap`;
    evaluation.disqualifiedAt = new Date();
    return { disqualified: true, reason: evaluation.disqualificationReason };
  }

  return { disqualified: false, reason: null };
}

function getEligibility(evaluation, { dailyProgress } = {}) {
  const config = getEvaluationConfig();
  const inWindow = isWithinEvaluationWindow();

  if (evaluation.isDisqualified) {
    return {
      eligible: false,
      status: "disqualified",
      reason: evaluation.disqualificationReason,
      inWindow,
    };
  }

  if (!inWindow) {
    return {
      eligible: false,
      status: "outside_window",
      reason: "Outside the held-out evaluation window",
      inWindow,
    };
  }

  if ((evaluation.executedTradeCount ?? 0) < config.minTradeCount) {
    return {
      eligible: false,
      status: "pending_min_trades",
      reason: `Need ${config.minTradeCount - (evaluation.executedTradeCount ?? 0)} more executed trade(s)`,
      inWindow,
    };
  }

  if (dailyProgress && !dailyProgress.competitionReady) {
    return {
      eligible: false,
      status: "pending_daily_trades",
      reason: dailyProgress.reason,
      inWindow,
      dailyProgress,
    };
  }

  return {
    eligible: true,
    status: "ranked",
    reason: null,
    inWindow,
    dailyProgress: dailyProgress ?? null,
  };
}

function serializeEvaluation(agent, markPrice = null, { dailyProgress } = {}) {
  const evaluation = ensureEvaluation(agent);
  const config = getEvaluationConfig();
  const price = markPrice ?? agent.lastSignal?.metrics?.priceUsd ?? 0;
  const metrics = price ? computeEquity(evaluation, price) : {};
  const eligibility = getEligibility(evaluation, { dailyProgress });

  return {
    initialUsd: evaluation.initialUsd,
    cashUsd: evaluation.cashUsd,
    positionQty: evaluation.positionQty,
    equityUsd: metrics.equityUsd ?? evaluation.equityUsd,
    peakEquityUsd: evaluation.peakEquityUsd,
    totalReturnPercent: metrics.totalReturnPercent ?? evaluation.totalReturnPercent,
    maxDrawdownPercent: evaluation.maxDrawdownPercent ?? 0,
    unrealizedPnlUsd: metrics.unrealizedPnlUsd ?? evaluation.unrealizedPnlUsd ?? 0,
    realizedPnlUsd: evaluation.realizedPnlUsd ?? 0,
    executedTradeCount: evaluation.executedTradeCount ?? 0,
    totalFeesUsd: evaluation.totalFeesUsd ?? 0,
    isDisqualified: evaluation.isDisqualified ?? false,
    disqualificationReason: evaluation.disqualificationReason,
    disqualifiedAt: evaluation.disqualifiedAt,
    lastMarkToMarketAt: evaluation.lastMarkToMarketAt,
    eligibility,
    config: {
      maxDrawdownPercent: config.maxDrawdownPercent,
      minTradeCount: config.minTradeCount,
      minTradesPerDay: config.minTradesPerDay,
      windowStart: config.windowStart,
      windowEnd: config.windowEnd,
    },
  };
}

async function markToMarket(agent, markPrice) {
  if (!markPrice || markPrice <= 0) return serializeEvaluation(agent);

  const evaluation = ensureEvaluation(agent);
  const { equityUsd, totalReturnPercent, unrealizedPnlUsd } = computeEquity(evaluation, markPrice);

  updateDrawdown(evaluation, equityUsd);
  evaluation.totalReturnPercent = totalReturnPercent;
  evaluation.unrealizedPnlUsd = unrealizedPnlUsd;
  evaluation.lastMarkToMarketAt = new Date();

  checkDisqualification(agent);
  await agent.save();

  return serializeEvaluation(agent, markPrice);
}

async function applyBuy(agent, { amountUsd, priceUsd }) {
  const evaluation = ensureEvaluation(agent);
  const spendUsd = Math.min(amountUsd, evaluation.cashUsd ?? 0);

  if (spendUsd <= 0 || (evaluation.positionQty ?? 0) > 0) {
    return { ok: false, reason: "No cash available or already in position" };
  }

  const fill = transactionCostService.simulateBuy({ amountUsd: spendUsd, priceUsd });

  evaluation.cashUsd = (evaluation.cashUsd ?? 0) - spendUsd;
  evaluation.positionQty = (evaluation.positionQty ?? 0) + fill.quantity;
  evaluation.avgEntryPriceUsd = fill.effectivePriceUsd;
  evaluation.totalFeesUsd = (evaluation.totalFeesUsd ?? 0) + fill.totalCostUsd;
  evaluation.executedTradeCount = (evaluation.executedTradeCount ?? 0) + 1;

  const { equityUsd, totalReturnPercent, unrealizedPnlUsd } = computeEquity(evaluation, priceUsd);
  updateDrawdown(evaluation, equityUsd);
  evaluation.totalReturnPercent = totalReturnPercent;
  evaluation.unrealizedPnlUsd = unrealizedPnlUsd;

  checkDisqualification(agent);
  await agent.save();

  return {
    ok: true,
    fill,
    equityUsd,
    totalReturnPercent: evaluation.totalReturnPercent,
    maxDrawdownPercent: evaluation.maxDrawdownPercent,
  };
}

async function applySell(agent, { priceUsd }) {
  const evaluation = ensureEvaluation(agent);
  const qty = evaluation.positionQty ?? 0;

  if (qty <= 0) {
    return { ok: false, reason: "No open position to sell" };
  }

  const entryValue = qty * (evaluation.avgEntryPriceUsd || priceUsd);
  const fill = transactionCostService.simulateSell({ quantity: qty, priceUsd });

  evaluation.cashUsd = (evaluation.cashUsd ?? 0) + fill.netUsd;
  evaluation.realizedPnlUsd = (evaluation.realizedPnlUsd ?? 0) + (fill.netUsd - entryValue);
  evaluation.positionQty = 0;
  evaluation.avgEntryPriceUsd = null;
  evaluation.totalFeesUsd = (evaluation.totalFeesUsd ?? 0) + fill.totalCostUsd;
  evaluation.executedTradeCount = (evaluation.executedTradeCount ?? 0) + 1;

  const { equityUsd, totalReturnPercent } = computeEquity(evaluation, priceUsd);
  updateDrawdown(evaluation, equityUsd);
  evaluation.totalReturnPercent = totalReturnPercent;
  evaluation.unrealizedPnlUsd = 0;

  checkDisqualification(agent);
  await agent.save();

  return {
    ok: true,
    fill,
    realizedPnlUsd: fill.netUsd - entryValue,
    equityUsd,
    totalReturnPercent: evaluation.totalReturnPercent,
    maxDrawdownPercent: evaluation.maxDrawdownPercent,
  };
}

async function revertBuy(agent, { amountUsd, priceUsd, feeUsd = 0, slippageUsd = 0, quantity = 0 }) {
  const evaluation = ensureEvaluation(agent);
  evaluation.cashUsd = (evaluation.cashUsd ?? 0) + amountUsd;
  evaluation.positionQty = Math.max(0, (evaluation.positionQty ?? 0) - quantity);
  evaluation.totalFeesUsd = Math.max(0, (evaluation.totalFeesUsd ?? 0) - feeUsd - slippageUsd);
  evaluation.executedTradeCount = Math.max(0, (evaluation.executedTradeCount ?? 0) - 1);

  if ((evaluation.positionQty ?? 0) === 0) {
    evaluation.avgEntryPriceUsd = null;
  }

  const { equityUsd, totalReturnPercent } = computeEquity(evaluation, priceUsd);
  updateDrawdown(evaluation, equityUsd);
  evaluation.totalReturnPercent = totalReturnPercent;
  await agent.save();
}

async function getLeaderboard({ ownerId = null, limit = 50 } = {}) {
  const filter = ownerId ? { ownerId } : {};
  const agents = await Agent.find(filter).sort({ "evaluation.totalReturnPercent": -1 }).limit(limit);

  const config = getEvaluationConfig();

  return agents
    .map((agent, index) => {
      const evaluation = serializeEvaluation(agent);
      return {
        rank: index + 1,
        agentId: agent._id,
        agentName: agent.name,
        symbol: agent.symbol,
        ownerId: agent.ownerId,
        totalReturnPercent: evaluation.totalReturnPercent,
        maxDrawdownPercent: evaluation.maxDrawdownPercent,
        equityUsd: evaluation.equityUsd,
        executedTradeCount: evaluation.executedTradeCount,
        isDisqualified: evaluation.isDisqualified,
        eligibility: evaluation.eligibility,
        status: evaluation.eligibility.status,
      };
    })
    .sort((a, b) => {
      if (a.isDisqualified !== b.isDisqualified) return a.isDisqualified ? 1 : -1;
      if (a.eligibility.eligible !== b.eligibility.eligible) return a.eligibility.eligible ? -1 : 1;
      return b.totalReturnPercent - a.totalReturnPercent;
    })
    .map((entry, index) => ({ ...entry, rank: index + 1, minTradeCount: config.minTradeCount }));
}

module.exports = {
  defaultEvaluation,
  ensureEvaluation,
  serializeEvaluation,
  markToMarket,
  applyBuy,
  applySell,
  revertBuy,
  checkDisqualification,
  getEligibility,
  getLeaderboard,
  isWithinEvaluationWindow,
};
