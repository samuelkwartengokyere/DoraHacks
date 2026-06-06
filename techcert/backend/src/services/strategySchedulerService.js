const StrategySchedule = require("../models/StrategySchedule");
const strategyService = require("./strategyService");

const DEFAULT_POLL_SECONDS = Number(process.env.AGENT_SIGNAL_POLL_SECONDS || 30);
const DEFAULT_BACKTEST_MINUTES = Number(process.env.STRATEGY_BACKTEST_INTERVAL_MINUTES || 10);

const signalTimers = new Map();
const backtestTimers = new Map();
const lastBacktestOutput = new Map();

function scheduleKey(ownerId) {
  return ownerId.toString();
}

async function executeSignalTick(ownerId, params, { alwaysLog = false } = {}) {
  try {
    const key = scheduleKey(ownerId);
    const previousBacktest = lastBacktestOutput.get(key)?.backtest ?? null;

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

function scheduleSignalMonitor(ownerId, params, pollSeconds = DEFAULT_POLL_SECONDS) {
  const key = scheduleKey(ownerId);
  if (signalTimers.has(key)) {
    clearInterval(signalTimers.get(key));
  }

  const intervalMs = pollSeconds * 1000;
  const handle = setInterval(() => {
    executeSignalTick(ownerId, params);
  }, intervalMs);

  signalTimers.set(key, handle);
}

function scheduleBacktest(ownerId, params, backtestMinutes = DEFAULT_BACKTEST_MINUTES) {
  const key = scheduleKey(ownerId);
  if (backtestTimers.has(key)) {
    clearInterval(backtestTimers.get(key));
  }

  const intervalMs = backtestMinutes * 60 * 1000;
  const handle = setInterval(() => {
    executeBacktestTick(ownerId, params);
  }, intervalMs);

  backtestTimers.set(key, handle);
}

function clearSchedules(ownerId) {
  const key = scheduleKey(ownerId);
  if (signalTimers.has(key)) {
    clearInterval(signalTimers.get(key));
    signalTimers.delete(key);
  }
  if (backtestTimers.has(key)) {
    clearInterval(backtestTimers.get(key));
    backtestTimers.delete(key);
  }
  lastBacktestOutput.delete(key);
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

  scheduleSignalMonitor(ownerId, defaults, seconds);
  scheduleBacktest(ownerId, defaults, backtestMinutes);

  const updated = await StrategySchedule.findOne({ ownerId });
  return { schedule: updated, alreadyRunning: false };
}

async function stopAutomation(ownerId) {
  clearSchedules(ownerId);

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

async function restoreAutomatedSchedules() {
  const schedules = await StrategySchedule.find({ isAutomated: true });
  for (const schedule of schedules) {
    const params = schedule.params || {};
    const seconds = schedule.signalPollSeconds || DEFAULT_POLL_SECONDS;
    const backtestMinutes = schedule.backtestIntervalMinutes || schedule.runIntervalMinutes || DEFAULT_BACKTEST_MINUTES;

    scheduleSignalMonitor(schedule.ownerId.toString(), params, seconds);
    scheduleBacktest(schedule.ownerId.toString(), params, backtestMinutes);
    console.log(
      `Restored strategy skill monitor for user ${schedule.ownerId} — signal every ${seconds}s, backtest every ${backtestMinutes}m`
    );
  }
}

async function ensureMonitoring(ownerId, params = {}) {
  const schedule = await StrategySchedule.findOne({ ownerId });
  if (schedule?.isAutomated) {
    return { schedule, started: false };
  }

  const result = await startAutomation(ownerId, params, {
    pollSeconds: Number(process.env.AGENT_SIGNAL_POLL_SECONDS || 15),
    backtestIntervalMinutes: DEFAULT_BACKTEST_MINUTES,
  });
  return { schedule: result.schedule, started: !result.alreadyRunning };
}

module.exports = {
  getSchedule,
  startAutomation,
  stopAutomation,
  restoreAutomatedSchedules,
  ensureMonitoring,
};
