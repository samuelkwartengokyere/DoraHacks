const express = require("express");
const auth = require("../middleware/auth");
const Agent = require("../models/Agent");
const StrategyRun = require("../models/StrategyRun");
const competitionService = require("../services/competitionService");
const track2SubmissionService = require("../services/track2SubmissionService");
const { ELIGIBLE_SYMBOLS } = require("../config/competitionTokens");

const router = express.Router();

router.get("/status", auth, async (req, res) => {
  try {
    const agent = await Agent.findOne({ ownerId: req.admin.id }).sort({ createdAt: -1 });
    const status = await competitionService.getDualTrackStatus(agent, {
      ownerId: req.admin.id,
    });
    res.json({ success: true, ...status });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

router.get("/tokens", (_req, res) => {
  res.json({
    success: true,
    count: ELIGIBLE_SYMBOLS.length,
    symbols: ELIGIBLE_SYMBOLS,
  });
});

router.post("/register-on-chain", auth, async (req, res) => {
  try {
    const result = await competitionService.tryTwakRegister();
    res.json({ success: result.ok, ...result });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

router.get("/track2/export/:runId", auth, async (req, res) => {
  try {
    const run = await StrategyRun.findOne({
      _id: req.params.runId,
      ownerId: req.admin.id,
    });

    if (!run) {
      return res.status(404).json({ success: false, message: "Strategy run not found" });
    }

    const submission = track2SubmissionService.buildSubmissionPackage(run);

    res.json({ success: true, submission });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

module.exports = router;
