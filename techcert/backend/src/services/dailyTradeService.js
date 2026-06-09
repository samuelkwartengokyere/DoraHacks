const Trade = require("../models/Trade");
const { getEvaluationConfig } = require("../config/evaluationConfig");

const EXECUTED_STATUSES = new Set(["completed", "open"]);

function toUtcDateKey(date) {
  const d = new Date(date);
  return d.toISOString().slice(0, 10);
}

function getTradingDays(windowStart, windowEnd) {
  const days = [];
  const start = new Date(windowStart);
  const end = new Date(windowEnd);
  start.setUTCHours(0, 0, 0, 0);
  end.setUTCHours(0, 0, 0, 0);

  for (let cursor = new Date(start); cursor <= end; cursor.setUTCDate(cursor.getUTCDate() + 1)) {
    days.push(toUtcDateKey(cursor));
  }
  return days;
}

async function getExecutedTradesInWindow(agentId, windowStart, windowEnd) {
  const query = {
    agentId,
    status: { $in: [...EXECUTED_STATUSES] },
    withinEvaluationWindow: true,
  };

  if (windowStart) {
    query.createdAt = { ...(query.createdAt || {}), $gte: new Date(windowStart) };
  }
  if (windowEnd) {
    query.createdAt = { ...(query.createdAt || {}), $lte: new Date(windowEnd) };
  }

  return Trade.find(query).sort({ createdAt: 1 });
}

async function getDailyTradeProgress(agentId) {
  const config = getEvaluationConfig();
  const windowStart = config.windowStart;
  const windowEnd = config.windowEnd;
  const minPerDay = config.minTradesPerDay ?? 1;
  const minTotal = config.minTradeCount ?? 7;

  const trades = await getExecutedTradesInWindow(agentId, windowStart, windowEnd);
  const countsByDay = {};

  for (const trade of trades) {
    const day = toUtcDateKey(trade.createdAt);
    countsByDay[day] = (countsByDay[day] || 0) + 1;
  }

  const tradingDays = windowStart && windowEnd ? getTradingDays(windowStart, windowEnd) : [];
  const daysWithTrades = tradingDays.filter((day) => (countsByDay[day] || 0) >= minPerDay);
  const missingDays = tradingDays.filter((day) => (countsByDay[day] || 0) < minPerDay);
  const totalExecuted = trades.length;

  const meetsDailyRule =
    tradingDays.length === 0 || daysWithTrades.length >= tradingDays.length;
  const meetsTotalRule = totalExecuted >= minTotal;

  return {
    totalExecuted,
    minTotalTrades: minTotal,
    minTradesPerDay: minPerDay,
    tradingDaysRequired: tradingDays.length,
    daysWithTrades: daysWithTrades.length,
    missingDays,
    countsByDay,
    meetsDailyRule,
    meetsTotalRule,
    competitionReady: meetsDailyRule && meetsTotalRule,
    reason: !meetsTotalRule
      ? `Need ${minTotal - totalExecuted} more executed trade(s) (${minTotal} total required)`
      : !meetsDailyRule
        ? `Need at least ${minPerDay} trade(s) on: ${missingDays.join(", ")}`
        : null,
  };
}

async function hasTradedToday(agentId) {
  const today = toUtcDateKey(new Date());
  const count = await Trade.countDocuments({
    agentId,
    status: { $in: [...EXECUTED_STATUSES] },
    withinEvaluationWindow: true,
    createdAt: {
      $gte: new Date(`${today}T00:00:00.000Z`),
      $lte: new Date(`${today}T23:59:59.999Z`),
    },
  });
  return count > 0;
}

module.exports = {
  getDailyTradeProgress,
  hasTradedToday,
  toUtcDateKey,
  getTradingDays,
};
