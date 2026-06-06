const mongoose = require("mongoose");

const strategyRunSchema = new mongoose.Schema(
  {
    ownerId: { type: mongoose.Schema.Types.ObjectId, ref: "Admin", index: true },
    name: { type: String, required: true },
    symbol: { type: String, required: true, uppercase: true },
    strategyType: { type: String, default: "cmc-momentum-ma-crossover" },
    params: { type: mongoose.Schema.Types.Mixed },
    skillOutput: { type: mongoose.Schema.Types.Mixed, required: true },
    pnlPercent: { type: Number },
    tradeCount: { type: Number },
  },
  { timestamps: true }
);

module.exports = mongoose.model("StrategyRun", strategyRunSchema);
