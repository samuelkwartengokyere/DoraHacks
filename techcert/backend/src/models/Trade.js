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
      enum: ["open", "completed", "cancelled", "failed", "skipped", "advisory"],
      default: "completed",
    },
    cancelledAt: { type: Date },
    cancelReason: { type: String },
    executionDetail: { type: String },
    feeUsd: { type: Number, default: 0 },
    slippageUsd: { type: Number, default: 0 },
    effectivePriceUsd: { type: Number },
    quantity: { type: Number },
    pnlUsd: { type: Number },
    equityAfterUsd: { type: Number },
    totalReturnPercent: { type: Number },
    maxDrawdownPercent: { type: Number },
    withinEvaluationWindow: { type: Boolean, default: true },
    x402Payment: { type: mongoose.Schema.Types.Mixed },
  },
  { timestamps: true }
);

module.exports = mongoose.model("Trade", tradeSchema);
