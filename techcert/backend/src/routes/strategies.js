const express = require("express");
const auth = require("../middleware/auth");
const StrategyRun = require("../models/StrategyRun");
const strategyService = require("../services/strategyService");
const strategySchedulerService = require("../services/strategySchedulerService");
const { assertEligibleToken } = require("../config/competitionTokens");

const router = express.Router();

router.get("/", auth, async (req, res) => {
  try {
    const [runs, schedule] = await Promise.all([
      StrategyRun.find({ ownerId: req.admin.id }).sort({ createdAt: -1 }).limit(50),
      strategySchedulerService.getSchedule(req.admin.id),
    ]);
    res.json({ success: true, runs, schedule });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

router.post("/backtest", auth, async (req, res) => {
  try {
    const {
      symbol = "BNB",
      name = "CMC Momentum MA Crossover",
      fastPeriod = 9,
      slowPeriod = 21,
      initialUsd = 1000,
    } = req.body;

    const eligibleSymbol = assertEligibleToken(symbol);

    const { run, skillOutput } = await strategyService.runAndSave(req.admin.id, {
      symbol: eligibleSymbol,
      name,
      fastPeriod,
      slowPeriod,
      initialUsd,
    });

    res.status(201).json({ success: true, run, skillOutput });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
});

router.post("/automation/start", auth, async (req, res) => {
  try {
    const pollSeconds = Number(req.body.pollSeconds || process.env.AGENT_SIGNAL_POLL_SECONDS || 30);
    const backtestIntervalMinutes = Number(
      req.body.backtestIntervalMinutes || req.body.intervalMinutes || 10
    );
    const result = await strategySchedulerService.startAutomation(req.admin.id, req.body, {
      pollSeconds,
      backtestIntervalMinutes,
    });
    res.json({ success: true, ...result });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
});

router.post("/automation/stop", auth, async (req, res) => {
  try {
    const schedule = await strategySchedulerService.stopAutomation(req.admin.id);
    res.json({ success: true, schedule });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
});

module.exports = router;
