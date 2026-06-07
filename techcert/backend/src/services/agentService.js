const cmcService = require("./cmcService");
const twakService = require("./twakService");
const evaluationService = require("./evaluationService");
const { getEvaluationConfig, isWithinEvaluationWindow } = require("../config/evaluationConfig");
const Agent = require("../models/Agent");
const Trade = require("../models/Trade");

class AgentService {
  async listAgents(ownerId) {
    const agents = await Agent.find({ ownerId }).sort({ createdAt: -1 });
    return agents.map((agent) => {
      const price = agent.lastSignal?.metrics?.priceUsd;
      const obj = agent.toObject();
      obj.evaluation = evaluationService.serializeEvaluation(agent, price);
      return obj;
    });
  }

  async getAgentForOwner(agentId, ownerId) {
    const agent = await Agent.findOne({ _id: agentId, ownerId });
    if (!agent) {
      throw new Error("Agent not found");
    }
    return agent;
  }

  async createAgent(ownerId, payload) {
    const config = getEvaluationConfig();
    const agent = await Agent.create({
      ownerId,
      name: payload.name || "BNB Momentum Agent",
      symbol: (payload.symbol || "BNB").toUpperCase(),
      strategy: payload.strategy || "cmc-momentum",
      maxTradeUsd: payload.maxTradeUsd ?? 50,
      minConfidence: payload.minConfidence ?? 0.6,
      status: "idle",
      evaluation: evaluationService.defaultEvaluation(config.initialUsd),
    });
    return agent;
  }

  async adviseAgent(agentId, ownerId, { alwaysLog = false, monitored = false } = {}) {
    const agent = await this.getAgentForOwner(agentId, ownerId);
    const signal = await cmcService.getTradingSignal(agent.symbol);
    const prevAction = agent.lastSignal?.action;
    const actionChanged = prevAction !== signal.action;

    agent.lastSignal = signal;
    agent.lastRunAt = new Date();
    if (monitored && agent.isAutomated) {
      agent.status = agent.evaluation?.isDisqualified ? "paused" : "running";
    } else if (!monitored) {
      agent.status = "idle";
    }

    await evaluationService.markToMarket(agent, signal.metrics?.priceUsd);
    await agent.save();

    if (!alwaysLog && !actionChanged) {
      return { agent, signal, trade: null, logged: false };
    }

    const trade = await Trade.create({
      agentId: agent._id,
      symbol: agent.symbol,
      action: signal.action,
      amountUsd: 0,
      priceUsd: signal.metrics.priceUsd,
      confidence: signal.confidence,
      reasoning: signal.reasons.join("; ") || `Recommendation: ${signal.action}`,
      signal,
      executionMode: twakService.getMode(),
      status: "advisory",
      withinEvaluationWindow: isWithinEvaluationWindow(),
    });

    return { agent, signal, trade, logged: true };
  }

  async runAgent(agentId, ownerId, { automated = false } = {}) {
    const agent = await this.getAgentForOwner(agentId, ownerId);
    evaluationService.ensureEvaluation(agent);

    if (agent.evaluation?.isDisqualified) {
      throw new Error(agent.evaluation.disqualificationReason || "Agent disqualified — max drawdown exceeded");
    }

    if (!isWithinEvaluationWindow()) {
      throw new Error("Outside held-out evaluation window — trades are not counted");
    }

    agent.status = "running";
    agent.lastRunAt = new Date();
    await agent.save();

    try {
      const signal = await cmcService.getTradingSignal(agent.symbol);
      const priceUsd = signal.metrics?.priceUsd;

      if (signal.action === "HOLD" || signal.confidence < agent.minConfidence) {
        const skipReason =
          signal.action === "HOLD"
            ? signal.reasons.join("; ") || "No directional edge"
            : `${signal.action} signal (${Math.round(signal.confidence * 100)}% conf) below ${Math.round(agent.minConfidence * 100)}% threshold`;

        const trade = await Trade.create({
          agentId: agent._id,
          symbol: agent.symbol,
          action: signal.action,
          amountUsd: 0,
          priceUsd,
          confidence: signal.confidence,
          reasoning: skipReason,
          signal,
          executionMode: twakService.getMode(),
          status: "skipped",
          withinEvaluationWindow: isWithinEvaluationWindow(),
        });

        agent.lastSignal = signal;
        await evaluationService.markToMarket(agent, priceUsd);
        agent.status = automated && agent.isAutomated && !agent.evaluation?.isDisqualified ? "running" : "idle";
        await agent.save();

        return { agent, trade, signal, executed: false };
      }

      if (signal.action === "BUY" && (agent.evaluation?.positionQty ?? 0) > 0) {
        const trade = await Trade.create({
          agentId: agent._id,
          symbol: agent.symbol,
          action: signal.action,
          amountUsd: 0,
          priceUsd,
          confidence: signal.confidence,
          reasoning: "Already in position — skip duplicate BUY",
          signal,
          executionMode: twakService.getMode(),
          status: "skipped",
          withinEvaluationWindow: isWithinEvaluationWindow(),
        });
        agent.lastSignal = signal;
        await agent.save();
        return { agent, trade, signal, executed: false };
      }

      if (signal.action === "SELL" && (agent.evaluation?.positionQty ?? 0) <= 0) {
        const trade = await Trade.create({
          agentId: agent._id,
          symbol: agent.symbol,
          action: signal.action,
          amountUsd: 0,
          priceUsd,
          confidence: signal.confidence,
          reasoning: "No open position — skip SELL",
          signal,
          executionMode: twakService.getMode(),
          status: "skipped",
          withinEvaluationWindow: isWithinEvaluationWindow(),
        });
        agent.lastSignal = signal;
        await agent.save();
        return { agent, trade, signal, executed: false };
      }

      const tradeAmount =
        signal.action === "BUY"
          ? Math.min(agent.maxTradeUsd, agent.evaluation?.cashUsd ?? agent.maxTradeUsd)
          : agent.maxTradeUsd;

      const execution = await twakService.executeSwap({
        symbol: agent.symbol,
        action: signal.action,
        amountUsd: tradeAmount,
        walletAddress: process.env.AGENT_WALLET_ADDRESS,
      });

      let portfolioResult = null;
      if (execution.ok) {
        if (signal.action === "BUY") {
          portfolioResult = await evaluationService.applyBuy(agent, {
            amountUsd: tradeAmount,
            priceUsd,
          });
        } else {
          portfolioResult = await evaluationService.applySell(agent, { priceUsd });
          await Trade.updateMany(
            { agentId: agent._id, status: "open", action: "BUY" },
            {
              status: "completed",
              executionDetail: "Position closed by SELL execution",
            }
          );
        }
      }

      if (!portfolioResult?.ok && execution.ok) {
        execution.ok = false;
        execution.message = portfolioResult?.reason || "Portfolio update failed";
      }

      const fill = portfolioResult?.fill;
      const trade = await Trade.create({
        agentId: agent._id,
        symbol: agent.symbol,
        action: signal.action,
        amountUsd: signal.action === "BUY" ? tradeAmount : fill?.netUsd ?? tradeAmount,
        priceUsd,
        effectivePriceUsd: fill?.effectivePriceUsd,
        quantity: fill?.quantity,
        feeUsd: fill?.feeUsd ?? 0,
        slippageUsd: fill?.slippageUsd ?? 0,
        pnlUsd: portfolioResult?.realizedPnlUsd,
        equityAfterUsd: portfolioResult?.equityUsd ?? agent.evaluation?.equityUsd,
        totalReturnPercent: portfolioResult?.totalReturnPercent ?? agent.evaluation?.totalReturnPercent,
        maxDrawdownPercent: portfolioResult?.maxDrawdownPercent ?? agent.evaluation?.maxDrawdownPercent,
        confidence: signal.confidence,
        reasoning: signal.reasons.join("; "),
        signal,
        executionMode: execution.mode,
        txHash: execution.txHash,
        status: execution.ok ? (signal.action === "BUY" ? "open" : "completed") : "failed",
        executionDetail: execution.message,
        withinEvaluationWindow: isWithinEvaluationWindow(),
      });

      agent.lastSignal = signal;
      agent.totalTrades = (agent.totalTrades || 0) + (execution.ok ? 1 : 0);

      if (agent.evaluation?.isDisqualified && agent.isAutomated) {
        agent.isAutomated = false;
        agent.status = "paused";
      } else if (execution.ok) {
        agent.status = automated && agent.isAutomated ? "running" : "idle";
      } else {
        agent.status = automated && agent.isAutomated ? "running" : "error";
      }

      await agent.save();

      return {
        agent,
        trade,
        signal,
        executed: execution.ok,
        execution,
        evaluation: evaluationService.serializeEvaluation(agent, priceUsd),
      };
    } catch (error) {
      agent.status = automated && agent.isAutomated ? "running" : "error";
      await agent.save();
      throw error;
    }
  }

  async getTrades({ ownerId, agentId, limit = 50 } = {}) {
    const agentFilter = { ownerId };
    if (agentId) {
      agentFilter._id = agentId;
    }

    const agents = await Agent.find(agentFilter).select("_id");
    const agentIds = agents.map((a) => a._id);

    if (agentIds.length === 0) {
      return [];
    }

    return Trade.find({ agentId: { $in: agentIds } })
      .sort({ createdAt: -1 })
      .limit(limit)
      .populate("agentId", "name symbol");
  }

  async getOwnerAgentIds(ownerId) {
    const agents = await Agent.find({ ownerId }).select("_id");
    return agents.map((a) => a._id);
  }

  async deleteTrades(ownerId, tradeIds) {
    const agentIds = await this.getOwnerAgentIds(ownerId);
    if (agentIds.length === 0) {
      return 0;
    }

    const result = await Trade.deleteMany({
      _id: { $in: tradeIds },
      agentId: { $in: agentIds },
    });
    return result.deletedCount;
  }

  async deleteAllTrades(ownerId) {
    const agentIds = await this.getOwnerAgentIds(ownerId);
    if (agentIds.length === 0) {
      return 0;
    }

    const result = await Trade.deleteMany({ agentId: { $in: agentIds } });
    return result.deletedCount;
  }

  async getTradeForOwner(tradeId, ownerId) {
    const agentIds = await this.getOwnerAgentIds(ownerId);
    if (agentIds.length === 0) {
      throw new Error("Trade not found");
    }

    const trade = await Trade.findOne({
      _id: tradeId,
      agentId: { $in: agentIds },
    }).populate("agentId", "name symbol");

    if (!trade) {
      throw new Error("Trade not found");
    }

    return trade;
  }

  async cancelTrade(tradeId, ownerId) {
    const trade = await this.getTradeForOwner(tradeId, ownerId);

    if (trade.status !== "open") {
      throw new Error("Only open trades can be cancelled");
    }

    const agent = await Agent.findById(trade.agentId);
    let exitPrice = trade.priceUsd;
    try {
      const signal = await cmcService.getTradingSignal(trade.symbol);
      exitPrice = signal.metrics?.priceUsd ?? exitPrice;
    } catch {
      // keep entry price as fallback
    }

    if (agent && trade.action === "BUY") {
      await evaluationService.revertBuy(agent, {
        amountUsd: trade.amountUsd,
        priceUsd: exitPrice,
        feeUsd: trade.feeUsd ?? 0,
        slippageUsd: trade.slippageUsd ?? 0,
        quantity: trade.quantity ?? 0,
      });
    }

    trade.status = "cancelled";
    trade.cancelledAt = new Date();
    trade.cancelReason = `Cancelled by user at ~$${exitPrice?.toFixed?.(2) ?? exitPrice}`;
    trade.executionDetail = trade.cancelReason;
    await trade.save();

    return trade;
  }
}

module.exports = new AgentService();
