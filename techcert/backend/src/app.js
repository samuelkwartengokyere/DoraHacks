require("dotenv").config();
const express = require("express");
const cors = require("cors");

const authRoutes = require("./routes/auth");
const statusRoutes = require("./routes/status");
const agentRoutes = require("./routes/agents");
const tradeRoutes = require("./routes/trades");
const strategyRoutes = require("./routes/strategies");
const marketRoutes = require("./routes/market");
const { getIntegrationStatus } = require("./utils/integrationStatus");

const app = express();

app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.get("/api/health", async (_req, res) => {
  try {
    const status = await getIntegrationStatus();
    res.json({
      status: "ok",
      service: "SignalForge AI API",
      mode: status.mode,
      readyForProduction: status.readyForProduction,
      timestamp: status.timestamp,
    });
  } catch (error) {
    res.status(500).json({ status: "error", message: error.message });
  }
});

app.use("/api/status", statusRoutes);
app.use("/api/auth", authRoutes);
app.use("/api/agents", agentRoutes);
app.use("/api/trades", tradeRoutes);
app.use("/api/strategies", strategyRoutes);
app.use("/api/market", marketRoutes);

app.use((err, _req, res, _next) => {
  console.error(err.stack);
  res.status(err.status || 500).json({
    success: false,
    message: err.message || "Internal server error",
  });
});

module.exports = app;
