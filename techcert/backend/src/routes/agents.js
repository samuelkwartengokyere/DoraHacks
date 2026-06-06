const express = require("express");
const auth = require("../middleware/auth");
const agentService = require("../services/agentService");
const agentSchedulerService = require("../services/agentSchedulerService");
const strategySchedulerService = require("../services/strategySchedulerService");
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

router.get("/live-status", auth, async (req, res) => {
  try {
    await strategySchedulerService.ensureMonitoring(req.admin.id);
    let agents = await agentService.listAgents(req.admin.id);
    await Promise.all(
      agents
        .filter((agent) => !agent.isAutomated)
        .map((agent) =>
          agentSchedulerService
            .startAutomation(
              agent._id.toString(),
              req.admin.id,
              Number(process.env.AGENT_SIGNAL_POLL_SECONDS || 15)
            )
            .catch(() => null)
        )
    );
    agents = await agentService.listAgents(req.admin.id);
    const schedule = await strategySchedulerService.getSchedule(req.admin.id);

    const lastRunMs = schedule?.lastRunAt ? new Date(schedule.lastRunAt).getTime() : 0;
    const signalFresh = schedule?.lastSignal && Date.now() - lastRunMs < 20_000;
    const marketSignal = signalFresh
      ? schedule.lastSignal
      : await cmcService.getTradingSignal("BNB");

    res.json({
      success: true,
      agents,
      schedule,
      marketSignal,
      serverTime: new Date().toISOString(),
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

router.get("/", auth, async (req, res) => {
  try {
    const agents = await agentService.listAgents(req.admin.id);
    res.json({ success: true, agents });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

router.post("/", auth, async (req, res) => {
  try {
    const agent = await agentService.createAgent(req.admin.id, req.body);
    try {
      await agentSchedulerService.startAutomation(
        agent._id.toString(),
        req.admin.id,
        Number(process.env.AGENT_SIGNAL_POLL_SECONDS || 15)
      );
    } catch (monitorError) {
      console.warn("Auto signal monitor failed for new agent:", monitorError.message);
    }
    res.status(201).json({ success: true, agent });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
});

router.post("/:id/advise", auth, async (req, res) => {
  try {
    const result = await agentService.adviseAgent(req.params.id, req.admin.id, {
      alwaysLog: true,
    });
    res.json({ success: true, ...result });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
});

router.post("/:id/run", auth, async (req, res) => {
  try {
    const result = await agentService.runAgent(req.params.id, req.admin.id);
    res.json({ success: true, ...result });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
});

router.post("/:id/automation/start", auth, async (req, res) => {
  try {
    const pollSeconds = Number(req.body.pollSeconds || process.env.AGENT_SIGNAL_POLL_SECONDS || 30);
    const result = await agentSchedulerService.startAutomation(
      req.params.id,
      req.admin.id,
      pollSeconds
    );
    res.json({ success: true, ...result });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
});

router.post("/:id/automation/stop", auth, async (req, res) => {
  try {
    const agent = await agentSchedulerService.stopAutomation(req.params.id, req.admin.id);
    res.json({ success: true, agent });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
});

router.get("/:id/trades", auth, async (req, res) => {
  try {
    const trades = await agentService.getTrades({
      ownerId: req.admin.id,
      agentId: req.params.id,
    });
    res.json({ success: true, trades });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

module.exports = router;
