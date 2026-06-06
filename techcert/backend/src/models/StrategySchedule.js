const mongoose = require("mongoose");

const strategyScheduleSchema = new mongoose.Schema(
  {
    ownerId: { type: mongoose.Schema.Types.ObjectId, ref: "Admin", required: true, unique: true },
    isAutomated: { type: Boolean, default: false },
    runIntervalMinutes: { type: Number, default: 10, min: 1 },
    signalPollSeconds: { type: Number, default: 30, min: 15, max: 300 },
    backtestIntervalMinutes: { type: Number, default: 10, min: 1 },
    automatedStartedAt: { type: Date },
    lastRunAt: { type: Date },
    lastBacktestAt: { type: Date },
    lastSignal: { type: mongoose.Schema.Types.Mixed },
    params: {
      symbol: { type: String, default: "BNB", uppercase: true },
      name: { type: String, default: "CMC Momentum MA Crossover" },
      initialUsd: { type: Number, default: 1000 },
      fastPeriod: { type: Number, default: 9 },
      slowPeriod: { type: Number, default: 21 },
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model("StrategySchedule", strategyScheduleSchema);
