const mongoose = require("mongoose");

const agentSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    symbol: { type: String, required: true, uppercase: true, default: "BNB" },
    strategy: {
      type: String,
      enum: ["cmc-momentum", "ma-crossover", "dca"],
      default: "cmc-momentum",
    },
    maxTradeUsd: { type: Number, default: 50, min: 1 },
    minConfidence: { type: Number, default: 0.6, min: 0, max: 1 },
    status: {
      type: String,
      enum: ["idle", "running", "error", "paused"],
      default: "idle",
    },
    totalTrades: { type: Number, default: 0 },
    lastRunAt: { type: Date },
    lastSignal: { type: mongoose.Schema.Types.Mixed },
  },
  { timestamps: true }
);

module.exports = mongoose.model("Agent", agentSchema);
