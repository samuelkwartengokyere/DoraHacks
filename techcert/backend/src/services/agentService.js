const cmcService = require("./cmcService");
const twakService = require("./twakService");
const Agent = require("../models/Agent");
const Trade = require("../models/Trade");

class AgentService {
  async listAgents() {
    return Agent.find().sort({ createdAt: -1 });
  }

  async createAgent(payload) {
    const agent = await Agent.create({
      name: payload.name || "BNB Momentum Agent",
      symbol: (payload.symbol || "BNB").toUpperCase(),
      strategy: payload.strategy || "cmc-momentum",
      maxTradeUsd: payload.maxTradeUsd ?? 50,
      minConfidence: payload.minConfidence ?? 0.6,
      status: "idle",
    });
    return agent;
  }

  async runAgent(agentId) {
    const agent = await Agent.findById(agentId);
    if (!agent) {
      throw new Error("Agent not found");
    }

    agent.status = "running";
    agent.lastRunAt = new Date();
    await agent.save();

    try {
      const signal = await cmcService.getTradingSignal(agent.symbol);

      if (signal.confidence < agent.minConfidence || signal.action === "HOLD") {
        const trade = await Trade.create({
          agentId: agent._id,
          symbol: agent.symbol,
          action: "HOLD",
          amountUsd: 0,
          priceUsd: signal.metrics.priceUsd,
          confidence: signal.confidence,
          reasoning: signal.reasons.join("; ") || "Below confidence threshold",
          signal,
          executionMode: twakService.getMode(),
          status: "skipped",
        });

        agent.status = "idle";
        agent.lastSignal = signal;
        await agent.save();

        return { agent, trade, signal, executed: false };
      }

      const execution = await twakService.executeSwap({
        symbol: agent.symbol,
        action: signal.action,
        amountUsd: agent.maxTradeUsd,
        walletAddress: process.env.AGENT_WALLET_ADDRESS,
      });

      const trade = await Trade.create({
        agentId: agent._id,
        symbol: agent.symbol,
        action: signal.action,
        amountUsd: agent.maxTradeUsd,
        priceUsd: signal.metrics.priceUsd,
        confidence: signal.confidence,
        reasoning: signal.reasons.join("; "),
        signal,
        executionMode: execution.mode,
        txHash: execution.txHash,
        status: execution.ok ? "completed" : "failed",
        executionDetail: execution.message,
      });

      agent.status = execution.ok ? "idle" : "error";
      agent.lastSignal = signal;
      agent.totalTrades = (agent.totalTrades || 0) + (execution.ok ? 1 : 0);
      await agent.save();

      return { agent, trade, signal, executed: execution.ok, execution };
    } catch (error) {
      agent.status = "error";
      await agent.save();
      throw error;
    }
  }

  async getTrades({ agentId, limit = 50 } = {}) {
    const query = agentId ? { agentId } : {};
    return Trade.find(query).sort({ createdAt: -1 }).limit(limit).populate("agentId", "name symbol");
  }
}

module.exports = new AgentService();
