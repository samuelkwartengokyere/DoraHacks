const express = require("express");
const auth = require("../middleware/auth");
const agentService = require("../services/agentService");

const router = express.Router();

router.get("/", auth, async (req, res) => {
  try {
    const limit = Number(req.query.limit || 100);
    const trades = await agentService.getTrades({ limit });
    res.json({ success: true, trades });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

module.exports = router;
