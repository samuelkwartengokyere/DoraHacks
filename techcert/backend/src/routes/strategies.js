const express = require("express");
const auth = require("../middleware/auth");
const StrategyRun = require("../models/StrategyRun");
const strategyService = require("../services/strategyService");

const router = express.Router();

router.get("/", auth, async (_req, res) => {
  try {
    const runs = await StrategyRun.find().sort({ createdAt: -1 }).limit(50);
    res.json({ success: true, runs });
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

    const skillOutput = await strategyService.runCmcSkillBacktest({
      symbol,
      fastPeriod,
      slowPeriod,
      initialUsd,
    });

    const run = await StrategyRun.create({
      name,
      symbol: symbol.toUpperCase(),
      strategyType: skillOutput.skill,
      params: { fastPeriod, slowPeriod, initialUsd },
      skillOutput,
      pnlPercent: skillOutput.backtest.pnlPercent,
      tradeCount: skillOutput.backtest.tradeCount,
    });

    res.status(201).json({ success: true, run, skillOutput });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
});

module.exports = router;
