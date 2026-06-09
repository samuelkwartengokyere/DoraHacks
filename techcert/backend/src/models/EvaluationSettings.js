const mongoose = require("mongoose");

const evaluationSettingsSchema = new mongoose.Schema(
  {
    singleton: { type: String, default: "default", unique: true },
    initialUsd: { type: Number, min: 1 },
    maxDrawdownPercent: { type: Number, min: 1, max: 100 },
    minTradeCount: { type: Number, min: 1 },
    minTradesPerDay: { type: Number, min: 1 },
    feeBps: { type: Number, min: 0 },
    slippageBps: { type: Number, min: 0 },
    autoExecute: { type: Boolean },
    windowStart: { type: Date },
    windowEnd: { type: Date },
    updatedBy: { type: mongoose.Schema.Types.ObjectId, ref: "Admin" },
  },
  { timestamps: true }
);

module.exports = mongoose.model("EvaluationSettings", evaluationSettingsSchema);
