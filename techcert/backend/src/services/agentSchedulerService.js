const agentService = require("./agentService");
const Agent = require("../models/Agent");

const DEFAULT_POLL_SECONDS = Number(process.env.AGENT_SIGNAL_POLL_SECONDS || 30);

async function executeSignalTick(agentId, ownerId) {
  try {
    await agentService.adviseAgent(agentId, ownerId, {
      alwaysLog: false,
      monitored: true,
    });
  } catch (error) {
    console.error(`Signal monitor tick failed for agent ${agentId}:`, error.message);
    const agent = await Agent.findOne({ _id: agentId, ownerId });
    if (agent?.isAutomated) {
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

  await agentService.adviseAgent(agentId, ownerId, { alwaysLog: true, monitored: true });

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
