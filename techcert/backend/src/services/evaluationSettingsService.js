const EvaluationSettings = require("../models/EvaluationSettings");

let cachedConfig = null;
let cacheSource = "env";

function parseNumber(value, fallback) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

function parseDate(value) {
  if (!value) return null;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
}

function envDefaults() {
  const windowStart = parseDate(process.env.EVALUATION_WINDOW_START);
  const windowEnd = parseDate(process.env.EVALUATION_WINDOW_END);

  return {
    initialUsd: parseNumber(process.env.EVALUATION_INITIAL_USD, 1000),
    maxDrawdownPercent: parseNumber(process.env.EVALUATION_MAX_DRAWDOWN_PERCENT, 30),
    minTradeCount: parseNumber(process.env.EVALUATION_MIN_TRADE_COUNT, 5),
    feeBps: parseNumber(process.env.EVALUATION_FEE_BPS, 10),
    slippageBps: parseNumber(
      process.env.EVALUATION_SLIPPAGE_BPS || process.env.AGENT_SLIPPAGE_BPS,
      100
    ),
    autoExecute: process.env.EVALUATION_AUTO_EXECUTE !== "false",
    windowStart: windowStart?.toISOString() ?? null,
    windowEnd: windowEnd?.toISOString() ?? null,
    track: "autonomous-agents",
    rules: {
      rankingMetric: "total_return_percent",
      disqualifyAboveDrawdown: parseNumber(process.env.EVALUATION_MAX_DRAWDOWN_PERCENT, 30),
      requireMinTrades: parseNumber(process.env.EVALUATION_MIN_TRADE_COUNT, 5),
      simulateTransactionCosts: true,
    },
  };
}

function buildConfigFromDoc(doc) {
  const env = envDefaults();
  const windowStart = doc.windowStart ?? parseDate(env.windowStart);
  const windowEnd = doc.windowEnd ?? parseDate(env.windowEnd);
  const maxDrawdownPercent = doc.maxDrawdownPercent ?? env.maxDrawdownPercent;
  const minTradeCount = doc.minTradeCount ?? env.minTradeCount;

  return {
    initialUsd: doc.initialUsd ?? env.initialUsd,
    maxDrawdownPercent,
    minTradeCount,
    feeBps: doc.feeBps ?? env.feeBps,
    slippageBps: doc.slippageBps ?? env.slippageBps,
    autoExecute: doc.autoExecute ?? env.autoExecute,
    windowStart: windowStart?.toISOString() ?? null,
    windowEnd: windowEnd?.toISOString() ?? null,
    track: "autonomous-agents",
    rules: {
      rankingMetric: "total_return_percent",
      disqualifyAboveDrawdown: maxDrawdownPercent,
      requireMinTrades: minTradeCount,
      simulateTransactionCosts: true,
    },
    updatedAt: doc.updatedAt?.toISOString?.() ?? null,
    source: doc.updatedBy ? "dashboard" : "env",
  };
}

function getEvaluationConfig() {
  if (cachedConfig) {
    return cachedConfig;
  }
  const env = envDefaults();
  return { ...env, source: "env", updatedAt: null };
}

function isWithinEvaluationWindow(at = new Date()) {
  const { windowStart, windowEnd } = getEvaluationConfig();
  const start = parseDate(windowStart);
  const end = parseDate(windowEnd);

  if (start && at < start) return false;
  if (end && at > end) return false;
  return true;
}

async function refreshEvaluationConfig() {
  let doc = await EvaluationSettings.findOne({ singleton: "default" });

  if (!doc) {
    const env = envDefaults();
    doc = await EvaluationSettings.create({
      singleton: "default",
      initialUsd: env.initialUsd,
      maxDrawdownPercent: env.maxDrawdownPercent,
      minTradeCount: env.minTradeCount,
      feeBps: env.feeBps,
      slippageBps: env.slippageBps,
      autoExecute: env.autoExecute,
      windowStart: parseDate(env.windowStart),
      windowEnd: parseDate(env.windowEnd),
    });
    cacheSource = "env";
  }

  cachedConfig = buildConfigFromDoc(doc);
  cacheSource = doc.updatedBy ? "dashboard" : "env";
  return cachedConfig;
}

async function getEvaluationSettingsForAdmin() {
  const doc = await EvaluationSettings.findOne({ singleton: "default" });
  const config = doc ? buildConfigFromDoc(doc) : getEvaluationConfig();

  return {
    config,
    source: doc?.updatedBy ? "dashboard" : "env",
    envDefaults: envDefaults(),
  };
}

async function updateEvaluationSettings(adminId, payload = {}) {
  const updates = {};

  if (payload.initialUsd != null) {
    updates.initialUsd = parseNumber(payload.initialUsd, 1000);
  }
  if (payload.maxDrawdownPercent != null) {
    updates.maxDrawdownPercent = parseNumber(payload.maxDrawdownPercent, 30);
  }
  if (payload.minTradeCount != null) {
    updates.minTradeCount = parseNumber(payload.minTradeCount, 5);
  }
  if (payload.feeBps != null) {
    updates.feeBps = parseNumber(payload.feeBps, 10);
  }
  if (payload.slippageBps != null) {
    updates.slippageBps = parseNumber(payload.slippageBps, 100);
  }
  if (payload.autoExecute != null) {
    updates.autoExecute = Boolean(payload.autoExecute);
  }
  if (payload.windowStart !== undefined) {
    updates.windowStart = payload.windowStart ? parseDate(payload.windowStart) : null;
  }
  if (payload.windowEnd !== undefined) {
    updates.windowEnd = payload.windowEnd ? parseDate(payload.windowEnd) : null;
  }

  updates.updatedBy = adminId;

  const doc = await EvaluationSettings.findOneAndUpdate(
    { singleton: "default" },
    { $set: updates },
    { upsert: true, new: true }
  );

  cachedConfig = buildConfigFromDoc(doc);
  cacheSource = "dashboard";

  return {
    config: cachedConfig,
    source: cacheSource,
  };
}

module.exports = {
  envDefaults,
  getEvaluationConfig,
  isWithinEvaluationWindow,
  refreshEvaluationConfig,
  getEvaluationSettingsForAdmin,
  updateEvaluationSettings,
};
