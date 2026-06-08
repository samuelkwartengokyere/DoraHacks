const express = require("express");
const auth = require("../middleware/auth");
const strategyService = require("../services/strategyService");

const router = express.Router();
const ALLOWED_INTERVALS = new Set(["1m", "5m", "15m", "1h", "2h", "4h", "1d"]);

router.get("/candles", auth, async (req, res) => {
  try {
    const symbol = String(req.query.symbol || "BNB").toUpperCase();
    const interval = String(req.query.interval || "1h").toLowerCase();
    const limit = Math.min(Math.max(parseInt(req.query.limit, 10) || 168, 24), 500);
    const endTime = req.query.endTime ? parseInt(req.query.endTime, 10) : undefined;

    if (!ALLOWED_INTERVALS.has(interval)) {
      return res.status(400).json({
        success: false,
        message: `Unsupported interval. Use one of: ${[...ALLOWED_INTERVALS].join(", ")}`,
      });
    }

    const candles = await strategyService.fetchKlines(symbol, interval, limit, { endTime });

    res.json({
      success: true,
      symbol,
      interval,
      candles: candles.map((candle) => ({
        time: candle.openTime,
        open: candle.open,
        high: candle.high,
        low: candle.low,
        close: candle.close,
        volume: candle.volume,
      })),
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

module.exports = router;
