const express = require("express");
const { runDueAutomations } = require("../services/automationWorkerService");

const router = express.Router();

function authorizeCron(req, res) {
  const secret = process.env.CRON_SECRET;
  if (!secret) {
    if (process.env.NODE_ENV === "production") {
      res.status(503).json({
        success: false,
        message: "CRON_SECRET is not configured for this deployment.",
      });
      return false;
    }
    return true;
  }

  const header = req.headers.authorization || "";
  if (header !== `Bearer ${secret}`) {
    res.status(401).json({ success: false, message: "Unauthorized cron request." });
    return false;
  }

  return true;
}

router.get("/automation", async (req, res) => {
  if (!authorizeCron(req, res)) return;

  try {
    const results = await runDueAutomations();
    res.json({
      success: true,
      timestamp: new Date().toISOString(),
      ...results,
    });
  } catch (error) {
    console.error("Automation cron failed:", error.message);
    res.status(500).json({ success: false, message: error.message });
  }
});

module.exports = router;
