const StrategySchedule = require("../models/StrategySchedule");
const StrategyRun = require("../models/StrategyRun");
const strategyService = require("./strategyService");

const DEFAULT_POLL_SECONDS = Number(process.env.AGENT_SIGNAL_POLL_SECONDS || 30);
const DEFAULT_BACKTEST_MINUTES = Number(process.env.STRATEGY_BACKTEST_INTERVAL_MINUTES || 10);

const lastBacktestOutput = new Map();

function scheduleKey(ownerId) {
  return ownerId.toString();
}

async function loadPreviousBacktest(ownerId) {
  const key = scheduleKey(ownerId);
  const cached = lastBacktestOutput.get(key)?.backtest;
  if (cached) return cached;

  const latestRun = await StrategyRun.findOne({ ownerId })
    .sort({ createdAt: -1 })
    .select("skillOutput.backtest")
    .lean();

  return latestRun?.skillOutput?.backtest ?? null;
}

async function executeSignalTick(ownerId, params, { alwaysLog = false } = {}) {
  try {
    const previousBacktest = await loadPreviousBacktest(ownerId);

    const result = await strategyService.refreshSignalMonitor(ownerId, params, {
      alwaysLog,
      previousBacktest,
    });

    return result;
  } catch (error) {
    console.error(`Strategy signal monitor failed for user ${ownerId}:`, error.message);
    return null;
  }
}

async function executeBacktestTick(ownerId, params) {
  try {
    const { run, skillOutput } = await strategyService.runAndSave(ownerId, params);
    const key = scheduleKey(ownerId);
    lastBacktestOutput.set(key, skillOutput);

    await StrategySchedule.findOneAndUpdate(
      { ownerId },
      { lastBacktestAt: new Date(), lastSignal: skillOutput.cmcSignal }
    );

    await strategyService.syncAgentsFromSignal(ownerId, skillOutput.cmcSignal, params.symbol);

    return run;
  } catch (error) {
    console.error(`Strategy backtest tick failed for user ${ownerId}:`, error.message);
    return null;
  }
}

async function getSchedule(ownerId) {
  return StrategySchedule.findOne({ ownerId });
}

async function startAutomation(
  ownerId,
  params = {},
  { pollSeconds = DEFAULT_POLL_SECONDS, backtestIntervalMinutes = DEFAULT_BACKTEST_MINUTES } = {}
) {
  const defaults = {
    symbol: "BNB",
    name: "CMC Momentum MA Crossover",
    initialUsd: 1000,
    fastPeriod: 9,
    slowPeriod: 21,
    ...params,
  };

  const seconds = Math.min(Math.max(Number(pollSeconds) || DEFAULT_POLL_SECONDS, 15), 300);
  const backtestMinutes = Math.min(Math.max(Number(backtestIntervalMinutes) || DEFAULT_BACKTEST_MINUTES, 1), 60);

  let schedule = await StrategySchedule.findOne({ ownerId });

  if (schedule?.isAutomated) {
    return { schedule, alreadyRunning: true };
  }

  schedule = await StrategySchedule.findOneAndUpdate(
    { ownerId },
    {
      ownerId,
      isAutomated: true,
      signalPollSeconds: seconds,
      backtestIntervalMinutes: backtestMinutes,
      runIntervalMinutes: backtestMinutes,
      automatedStartedAt: new Date(),
      params: defaults,
    },
    { upsert: true, new: true }
  );

  await executeBacktestTick(ownerId, defaults);
  await executeSignalTick(ownerId, defaults, { alwaysLog: true });

  const updated = await StrategySchedule.findOne({ ownerId });
  return { schedule: updated, alreadyRunning: false };
}

async function stopAutomation(ownerId) {
  const key = scheduleKey(ownerId);
  lastBacktestOutput.delete(key);

  const schedule = await StrategySchedule.findOneAndUpdate(
    { ownerId },
    {
      isAutomated: false,
      automatedStartedAt: null,
    },
    { new: true }
  );

  if (!schedule) {
    throw new Error("No strategy schedule found");
  }

  return schedule;
}

async function runDueAutomations() {
  const schedules = await StrategySchedule.find({ isAutomated: true });
  const now = Date.now();
  let signalTicks = 0;
  let backtestTicks = 0;

  for (const schedule of schedules) {
    const ownerId = schedule.ownerId.toString();
    const params = schedule.params || {};
    const pollSeconds = schedule.signalPollSeconds || DEFAULT_POLL_SECONDS;
    const backtestMinutes =
      schedule.backtestIntervalMinutes || schedule.runIntervalMinutes || DEFAULT_BACKTEST_MINUTES;

    const lastBacktestMs = schedule.lastBacktestAt ? new Date(schedule.lastBacktestAt).getTime() : 0;
    const lastSignalMs = schedule.lastRunAt ? new Date(schedule.lastRunAt).getTime() : 0;

    if (!lastBacktestMs || now - lastBacktestMs >= backtestMinutes * 60 * 1000) {
      await executeBacktestTick(ownerId, params);
      backtestTicks += 1;
      continue;
    }

    if (!lastSignalMs || now - lastSignalMs >= pollSeconds * 1000) {
      await executeSignalTick(ownerId, params);
      signalTicks += 1;
    }
  }

  return { checked: schedules.length, signalTicks, backtestTicks };
}

module.exports = {
  getSchedule,
  startAutomation,
  stopAutomation,
  runDueAutomations,
};
