const agentService = require("./agentService");
const Agent = require("../models/Agent");

const DEFAULT_POLL_SECONDS = Number(process.env.AGENT_SIGNAL_POLL_SECONDS || 30);
const timers = new Map();

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

function scheduleAgent(agentId, ownerId, pollSeconds = DEFAULT_POLL_SECONDS) {
  if (timers.has(agentId)) {
    clearInterval(timers.get(agentId));
  }

  const intervalMs = pollSeconds * 1000;
  const handle = setInterval(() => {
    executeSignalTick(agentId, ownerId);
  }, intervalMs);

  timers.set(agentId, handle);
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
  scheduleAgent(agentId, ownerId, seconds);

  const updated = await Agent.findById(agentId);
  return { agent: updated, alreadyRunning: false };
}

async function stopAutomation(agentId, ownerId) {
  const agent = await Agent.findOne({ _id: agentId, ownerId });
  if (!agent) {
    throw new Error("Agent not found");
  }

  if (timers.has(agentId)) {
    clearInterval(timers.get(agentId));
    timers.delete(agentId);
  }

  agent.isAutomated = false;
  agent.status = "idle";
  agent.automatedStartedAt = null;
  await agent.save();

  return agent;
}

async function restoreAutomatedAgents() {
  const agents = await Agent.find({ isAutomated: true });
  for (const agent of agents) {
    const seconds = agent.signalPollSeconds || DEFAULT_POLL_SECONDS;
    agent.status = "running";
    await agent.save();
    scheduleAgent(agent._id.toString(), agent.ownerId.toString(), seconds);
    console.log(`Restored signal monitor: ${agent.name} (${agent._id}) every ${seconds}s`);
  }
}

module.exports = {
  startAutomation,
  stopAutomation,
  restoreAutomatedAgents,
};
