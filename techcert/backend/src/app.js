require("dotenv").config();
const express = require("express");
const cors = require("cors");
const { ensureReady } = require("./bootstrap");

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
