require("dotenv").config();
const express = require("express");
const cors = require("cors");
const connectDB = require("./config/db");
const { ensureReady } = require("./bootstrap");
const { getMongoConfigSummary } = require("./utils/mongoConfig");

const authRoutes = require("./routes/auth");
const statusRoutes = require("./routes/status");
const agentRoutes = require("./routes/agents");
const tradeRoutes = require("./routes/trades");
const strategyRoutes = require("./routes/strategies");
const marketRoutes = require("./routes/market");

const app = express();

app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.get("/", (_req, res) => {
  res.json({
    service: "SignalForge AI API",
    health: "/api/health",
    status: "/api/status",
  });
});

app.get("/api/health", (_req, res) => {
  res.json({
    status: "ok",
    service: "SignalForge AI API",
    timestamp: new Date().toISOString(),
  });
});

app.get("/api/health/db", async (_req, res) => {
  const config = getMongoConfigSummary();

  if (!config.configured) {
    return res.status(503).json({
      connected: false,
      config,
      message: "MONGODB_URI is not set on this deployment.",
    });
  }

  try {
    await connectDB();
    res.json({
      connected: true,
      config,
      message: "MongoDB connection successful.",
    });
  } catch (error) {
    res.status(503).json({
      connected: false,
      config,
      message: error.message,
      hint:
        "Compare user/host/passwordLength with Atlas. If they differ, fix MONGODB_URI on the backend Vercel project and redeploy.",
    });
  }
});

app.use(async (_req, res, next) => {
  try {
    await ensureReady();
    next();
  } catch (error) {
    console.error("Bootstrap error:", error.message);
    res.status(503).json({
      success: false,
      message:
        error.message ||
        "Database unavailable. Set MONGODB_URI (MongoDB Atlas) in Vercel environment variables.",
    });
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
