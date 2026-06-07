const strategySchedulerService = require("./strategySchedulerService");
const agentSchedulerService = require("./agentSchedulerService");

async function runDueAutomations() {
  const [strategyResults, agentResults] = await Promise.all([
    strategySchedulerService.runDueAutomations(),
    agentSchedulerService.runDueAutomations(),
  ]);

  return {
    strategies: strategyResults,
    agents: agentResults,
  };
}

module.exports = {
  runDueAutomations,
};
