const agentService = require("./agentService");
const cmcService = require("./cmcService");
const evaluationService = require("./evaluationService");
const { getEvaluationConfig } = require("../config/evaluationConfig");
const Agent = require("../models/Agent");

const DEFAULT_POLL_SECONDS = Number(process.env.AGENT_SIGNAL_POLL_SECONDS || 30);

async function executeSignalTick(agentId, ownerId) {
  try {
    const agent = await Agent.findOne({ _id: agentId, ownerId });
    if (!agent?.isAutomated) return;

    const signal = await cmcService.getTradingSignal(agent.symbol);
    const priceUsd = signal.metrics?.priceUsd;
    await evaluationService.markToMarket(agent, priceUsd);

    if (agent.evaluation?.isDisqualified) {
      agent.isAutomated = false;
      agent.status = "paused";
      await agent.save();
      return;
    }

    const config = getEvaluationConfig();
    const prevAction = agent.lastSignal?.action;
    const actionChanged = prevAction !== signal.action;
    const shouldAutoExecute =
      config.autoExecute &&
      actionChanged &&
      signal.action !== "HOLD" &&
      signal.confidence >= agent.minConfidence &&
      evaluationService.isWithinEvaluationWindow();

    if (shouldAutoExecute) {
      await agentService.runAgent(agentId, ownerId, { automated: true });
      return;
    }

    await agentService.adviseAgent(agentId, ownerId, {
      alwaysLog: actionChanged,
      monitored: true,
    });
  } catch (error) {
    console.error(`Signal monitor tick failed for agent ${agentId}:`, error.message);
    const agent = await Agent.findOne({ _id: agentId, ownerId });
    if (agent?.isAutomated && !agent.evaluation?.isDisqualified) {
      agent.status = "error";
      await agent.save();
    }
  }
}

async function startAutomation(agentId, ownerId, pollSeconds = DEFAULT_POLL_SECONDS) {
  const agent = await Agent.findOne({ _id: agentId, ownerId });
  if (!agent) {
    throw new Error("Agent not found");
  }

  if (agent.evaluation?.isDisqualified) {
    throw new Error(agent.evaluation.disqualificationReason || "Agent is disqualified");
  }

  const seconds = Math.min(Math.max(Number(pollSeconds) || DEFAULT_POLL_SECONDS, 15), 300);

  if (agent.isAutomated) {
    return { agent, alreadyRunning: true };
  }

  agent.isAutomated = true;
  agent.signalPollSeconds = seconds;
  agent.runIntervalMinutes = Math.max(1, Math.round(seconds / 60));
  agent.automatedStartedAt = new Date();
  agent.status = "running";
  await agent.save();

  const config = getEvaluationConfig();
  if (config.autoExecute) {
    try {
      await agentService.runAgent(agentId, ownerId, { automated: true });
    } catch {
      await agentService.adviseAgent(agentId, ownerId, { alwaysLog: true, monitored: true });
    }
  } else {
    await agentService.adviseAgent(agentId, ownerId, { alwaysLog: true, monitored: true });
  }

  const updated = await Agent.findById(agentId);
  return { agent: updated, alreadyRunning: false };
}

async function stopAutomation(agentId, ownerId) {
  const agent = await Agent.findOne({ _id: agentId, ownerId });
  if (!agent) {
    throw new Error("Agent not found");
  }

  agent.isAutomated = false;
  agent.status = "idle";
  agent.automatedStartedAt = null;
  await agent.save();

  return agent;
}

async function runDueAutomations() {
  const agents = await Agent.find({ isAutomated: true });
  const now = Date.now();
  let ticks = 0;

  for (const agent of agents) {
    if (agent.evaluation?.isDisqualified) {
      agent.isAutomated = false;
      agent.status = "paused";
      await agent.save();
      continue;
    }

    const pollSeconds = agent.signalPollSeconds || DEFAULT_POLL_SECONDS;
    const lastRunMs = agent.lastRunAt ? new Date(agent.lastRunAt).getTime() : 0;

    if (!lastRunMs || now - lastRunMs >= pollSeconds * 1000) {
      await executeSignalTick(agent._id.toString(), agent.ownerId.toString());
      ticks += 1;
    }
  }

  return { checked: agents.length, ticks };
}

module.exports = {
  startAutomation,
  stopAutomation,
  runDueAutomations,
};
