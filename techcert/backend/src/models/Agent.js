const mongoose = require("mongoose");

const agentSchema = new mongoose.Schema(
  {
    ownerId: { type: mongoose.Schema.Types.ObjectId, ref: "Admin", index: true },
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
    isAutomated: { type: Boolean, default: false },
    runIntervalMinutes: { type: Number, default: 10, min: 1 },
    signalPollSeconds: { type: Number, default: 30, min: 15, max: 300 },
    automatedStartedAt: { type: Date },
    totalTrades: { type: Number, default: 0 },
    lastRunAt: { type: Date },
    lastSignal: { type: mongoose.Schema.Types.Mixed },
  },
  { timestamps: true }
);

module.exports = mongoose.model("Agent", agentSchema);
