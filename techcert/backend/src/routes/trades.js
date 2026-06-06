const express = require("express");
const auth = require("../middleware/auth");
const agentService = require("../services/agentService");

const router = express.Router();

router.get("/", auth, async (req, res) => {
  try {
    const limit = Number(req.query.limit || 100);
    const trades = await agentService.getTrades({ ownerId: req.admin.id, limit });
    res.json({ success: true, trades });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

router.delete("/", auth, async (req, res) => {
  try {
    const { ids } = req.body || {};

    if (Array.isArray(ids) && ids.length > 0) {
      const deletedCount = await agentService.deleteTrades(req.admin.id, ids);
      return res.json({ success: true, deletedCount });
    }

    const deletedCount = await agentService.deleteAllTrades(req.admin.id);
    res.json({ success: true, deletedCount });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
});

router.post("/:id/cancel", auth, async (req, res) => {
  try {
    const trade = await agentService.cancelTrade(req.params.id, req.admin.id);
    res.json({ success: true, trade });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
});

module.exports = router;
