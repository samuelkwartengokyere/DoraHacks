const mongoose = require("mongoose");

const tradeSchema = new mongoose.Schema(
  {
    agentId: { type: mongoose.Schema.Types.ObjectId, ref: "Agent", required: true },
    symbol: { type: String, required: true, uppercase: true },
    action: { type: String, enum: ["BUY", "SELL", "HOLD"], required: true },
    amountUsd: { type: Number, default: 0 },
    priceUsd: { type: Number },
    confidence: { type: Number },
    reasoning: { type: String },
    signal: { type: mongoose.Schema.Types.Mixed },
    executionMode: { type: String, enum: ["paper", "live"], default: "paper" },
    txHash: { type: String },
    status: {
      type: String,
      enum: ["completed", "failed", "skipped"],
      default: "completed",
    },
    executionDetail: { type: String },
  },
  { timestamps: true }
);

module.exports = mongoose.model("Trade", tradeSchema);
