const strategySchedulerService = require("./strategySchedulerService");
const agentSchedulerService = require("./agentSchedulerService");
const cmcService = require("./cmcService");
const evaluationService = require("./evaluationService");
const Agent = require("../models/Agent");

async function runDueAutomations() {
  const [strategyResults, agentResults] = await Promise.all([
    strategySchedulerService.runDueAutomations(),
    agentSchedulerService.runDueAutomations(),
  ]);

  const openAgents = await Agent.find({ "evaluation.positionQty": { $gt: 0 } });
  for (const agent of openAgents) {
    try {
      const signal = await cmcService.getTradingSignal(agent.symbol);
      await evaluationService.markToMarket(agent, signal.metrics?.priceUsd);
    } catch (error) {
      console.error(`Mark-to-market failed for agent ${agent._id}:`, error.message);
    }
  }

  return {
    strategies: strategyResults,
    agents: agentResults,
    openPositionsMarked: openAgents.length,
  };
}

module.exports = {
  runDueAutomations,
};
