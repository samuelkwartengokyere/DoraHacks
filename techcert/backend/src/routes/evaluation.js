const express = require("express");
const auth = require("../middleware/auth");
const evaluationService = require("../services/evaluationService");
const { getEvaluationConfig } = require("../config/evaluationConfig");
const Agent = require("../models/Agent");

const router = express.Router();

router.get("/config", (_req, res) => {
  res.json({ success: true, config: getEvaluationConfig() });
});

router.get("/leaderboard", auth, async (req, res) => {
  try {
    const limit = Number(req.query.limit || 50);
    const global = req.query.global === "true";
    const entries = await evaluationService.getLeaderboard({
      ownerId: global ? null : req.admin.id,
      limit,
    });

    res.json({
      success: true,
      config: getEvaluationConfig(),
      entries,
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

router.get("/agents/:id", auth, async (req, res) => {
  try {
    const agent = await Agent.findOne({ _id: req.params.id, ownerId: req.admin.id });
    if (!agent) {
      return res.status(404).json({ success: false, message: "Agent not found" });
    }

    const price = agent.lastSignal?.metrics?.priceUsd;
    if (price) {
      await evaluationService.markToMarket(agent, price);
    }

    res.json({
      success: true,
      evaluation: evaluationService.serializeEvaluation(agent, price),
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

module.exports = router;
