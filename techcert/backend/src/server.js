const app = require("./app");
const { ensureReady } = require("./bootstrap");
const agentSchedulerService = require("./services/agentSchedulerService");
const strategySchedulerService = require("./services/strategySchedulerService");
const { getIntegrationStatus } = require("./utils/integrationStatus");

const PORT = process.env.PORT || 5000;

async function start() {
  await ensureReady();
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
