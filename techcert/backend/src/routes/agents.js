const express = require("express");
const auth = require("../middleware/auth");
const agentService = require("../services/agentService");
const cmcService = require("../services/cmcService");

const router = express.Router();

router.get("/signals/:symbol", async (req, res) => {
  try {
    const signal = await cmcService.getTradingSignal(req.params.symbol);
    res.json({ success: true, signal });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

router.get("/", auth, async (_req, res) => {
  try {
    const agents = await agentService.listAgents();
    res.json({ success: true, agents });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

router.post("/", auth, async (req, res) => {
  try {
    const agent = await agentService.createAgent(req.body);
    res.status(201).json({ success: true, agent });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
});

router.post("/:id/run", auth, async (req, res) => {
  try {
    const result = await agentService.runAgent(req.params.id);
    res.json({ success: true, ...result });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
});

router.get("/:id/trades", auth, async (req, res) => {
  try {
    const trades = await agentService.getTrades({ agentId: req.params.id });
    res.json({ success: true, trades });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

module.exports = router;
