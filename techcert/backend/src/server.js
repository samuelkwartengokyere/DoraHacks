const app = require("./app");
const { ensureReady } = require("./bootstrap");
const { runDueAutomations } = require("./services/automationWorkerService");
const { getIntegrationStatus } = require("./utils/integrationStatus");

const PORT = process.env.PORT || 5000;
const WORKER_INTERVAL_MS = Number(process.env.AUTOMATION_WORKER_INTERVAL_MS || 15_000);

async function start() {
  await ensureReady();

  await runDueAutomations().catch((error) => {
    console.warn("Initial automation worker tick failed:", error.message);
  });

  setInterval(() => {
    runDueAutomations().catch((error) => {
      console.error("Automation worker tick failed:", error.message);
    });
  }, WORKER_INTERVAL_MS);

  app.listen(PORT, async () => {
    console.log(`SignalForge AI API running on port ${PORT}`);
    console.log(`Automation worker polling every ${WORKER_INTERVAL_MS / 1000}s`);
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
