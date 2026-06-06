require("dotenv").config();
const express = require("express");
const cors = require("cors");
const connectDB = require("./config/db");
const seedAdmin = require("./utils/seedAdmin");
const migrateLegacyOwnership = require("./utils/migrateLegacyOwnership");
const agentSchedulerService = require("./services/agentSchedulerService");
const strategySchedulerService = require("./services/strategySchedulerService");

const authRoutes = require("./routes/auth");
const statusRoutes = require("./routes/status");
const agentRoutes = require("./routes/agents");
const tradeRoutes = require("./routes/trades");
const strategyRoutes = require("./routes/strategies");
const marketRoutes = require("./routes/market");
const { getIntegrationStatus } = require("./utils/integrationStatus");

const app = express();
const PORT = process.env.PORT || 5000;

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

async function start() {
  await connectDB();
  await seedAdmin();
  await migrateLegacyOwnership();
  await agentSchedulerService.restoreAutomatedAgents();
  await strategySchedulerService.restoreAutomatedSchedules();

  app.listen(PORT, async () => {
    console.log(`SignalForge AI API running on port ${PORT}`);
    try {
      const status = await getIntegrationStatus();
      console.log(`Integration mode: ${status.mode.toUpperCase()}`);
      if (status.mode === "mock") {
        console.log("Running in mock/paper mode — add CMC + TWAK keys in backend/.env");
      }
    } catch (error) {
      console.warn("Could not read integration status:", error.message);
    }
  });
}

start().catch((err) => {
  console.error("Failed to start server:", err);
  process.exit(1);
});
