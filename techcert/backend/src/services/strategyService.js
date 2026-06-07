const axios = require("axios");
const cmcService = require("./cmcService");

class StrategyService {
  intervalMs(interval = "1h") {
    const map = {
      "15m": 15 * 60_000,
      "1h": 60 * 60_000,
      "2h": 2 * 60 * 60_000,
      "4h": 4 * 60 * 60_000,
      "1d": 24 * 60 * 60_000,
    };
    return map[interval] || map["1h"];
  }

  async fetchKlines(symbol = "BNB", interval = "1h", limit = 168) {
    const pair = symbol.toUpperCase() === "BNB" ? "BNBUSDT" : `${symbol.toUpperCase()}USDT`;

    try {
      const response = await axios.get("https://api.binance.com/api/v3/klines", {
        params: { symbol: pair, interval, limit },
        timeout: 15000,
      });

      return response.data.map((row) => ({
        openTime: row[0],
        open: parseFloat(row[1]),
        high: parseFloat(row[2]),
        low: parseFloat(row[3]),
        close: parseFloat(row[4]),
        volume: parseFloat(row[5]),
      }));
    } catch (error) {
      console.warn("Binance klines unavailable — generating synthetic series:", error.message);
      return this.syntheticCloses(limit, interval);
    }
  }

  async fetchHourlyCloses(symbol = "BNB", limit = 168) {
    return this.fetchKlines(symbol, "1h", limit);
  }

  syntheticCloses(limit, interval = "1h") {
    let price = 600;
    const rows = [];
    const now = Date.now();
    const stepMs = this.intervalMs(interval);

    for (let i = limit - 1; i >= 0; i -= 1) {
      const open = price;
      price *= 1 + (Math.random() - 0.48) * 0.008;
      const close = price;
      const wick = price * 0.004;
      rows.push({
        openTime: now - i * stepMs,
        open,
        high: Math.max(open, close) + wick,
        low: Math.min(open, close) - wick,
        close,
        volume: 1000 + Math.random() * 500,
      });
    }
    return rows;
  }

  movingAverage(values, period) {
    const result = [];
    for (let i = 0; i < values.length; i += 1) {
      if (i + 1 < period) {
        result.push(null);
        continue;
      }
      const slice = values.slice(i + 1 - period, i + 1);
      result.push(slice.reduce((a, b) => a + b, 0) / period);
    }
    return result;
  }

  async getMaCrossoverSignal(symbol = "BNB", fastPeriod = 9, slowPeriod = 21) {
    const candles = await this.fetchKlines(symbol, "1h", 48);
    const closes = candles.map((c) => c.close);
    const fast = this.movingAverage(closes, fastPeriod);
    const slow = this.movingAverage(closes, slowPeriod);
    const idx = closes.length - 1;

    if (idx < slowPeriod || fast[idx] == null || slow[idx] == null) {
      return {
        action: "HOLD",
        confidence: 0.5,
        reasons: [],
        metrics: {},
      };
    }

    const price = closes[idx];
    const ma9 = fast[idx];
    const ma21 = slow[idx];
    const prevFast = fast[idx - 1];
    const prevSlow = slow[idx - 1];

    let action = "HOLD";
    let confidence = 0.5;
    const reasons = [];

    if (prevFast <= prevSlow && ma9 > ma21) {
      action = "BUY";
      confidence = 0.78;
      reasons.push("MA9 golden cross above MA21");
    } else if (prevFast >= prevSlow && ma9 < ma21) {
      action = "SELL";
      confidence = 0.78;
      reasons.push("MA9 death cross below MA21");
    } else if (ma9 > ma21 && price > ma9) {
      action = "BUY";
      confidence = 0.68;
      reasons.push("Price trading above rising MA stack (9 > 21)");
    } else if (ma9 < ma21 && price < ma9) {
      action = "SELL";
      confidence = 0.68;
      reasons.push("Price trading below falling MA stack (9 < 21)");
    } else if (ma9 > ma21) {
      action = "BUY";
      confidence = 0.6;
      reasons.push("MA9 above MA21 — bullish structure");
    } else if (ma9 < ma21) {
      action = "SELL";
      confidence = 0.6;
      reasons.push("MA9 below MA21 — bearish structure");
    }

    return {
      action,
      confidence,
      reasons,
      metrics: { ma9, ma21, price },
    };
  }

  formatDurationMs(ms) {
    if (ms == null || ms < 0) return null;
    const minutes = Math.round(ms / 60_000);
    if (minutes < 90) return `${minutes}m`;
    const hours = ms / 3_600_000;
    if (hours < 48) return `${hours.toFixed(1)}h`;
    return `${(ms / 86_400_000).toFixed(1)}d`;
  }

  averageHoldDurations(trades) {
    const buyHolds = [];
    const sellWaits = [];

    for (let i = 0; i < trades.length - 1; i += 1) {
      const current = trades[i];
      const next = trades[i + 1];
      if (current.type === "BUY" && next.type === "SELL") {
        buyHolds.push(next.time - current.time);
      }
      if (current.type === "SELL" && next.type === "BUY") {
        sellWaits.push(next.time - current.time);
      }
    }

    const average = (values) =>
      values.length === 0 ? null : values.reduce((sum, v) => sum + v, 0) / values.length;

    return {
      avgBuyHoldMs: average(buyHolds),
      avgSellWaitMs: average(sellWaits),
      buyHoldSamples: buyHolds.length,
      sellWaitSamples: sellWaits.length,
    };
  }

  findRegimeStartTime(candles, fast, slow, slowPeriod, action) {
    if (action === "HOLD") return null;

    const bullish = action === "BUY";

    for (let i = fast.length - 1; i >= slowPeriod; i -= 1) {
      const prevFast = fast[i - 1];
      const prevSlow = slow[i - 1];
      const currFast = fast[i];
      const currSlow = slow[i];
      if (prevFast == null || currFast == null) continue;

      if (bullish && prevFast <= prevSlow && currFast > currSlow) {
        return candles[i].openTime;
      }
      if (!bullish && prevFast >= prevSlow && currFast < currSlow) {
        return candles[i].openTime;
      }
    }

    for (let i = fast.length - 1; i >= slowPeriod; i -= 1) {
      const currFast = fast[i];
      const currSlow = slow[i];
      if (currFast == null || currSlow == null) continue;
      const isBull = currFast > currSlow;
      if (bullish === isBull) {
        return candles[i].openTime;
      }
    }

    return candles[slowPeriod]?.openTime ?? null;
  }

  buildDurationAdvice(action, activeMs, typicalMs, remainingMs) {
    return this.buildDurationContext(action, activeMs, typicalMs, remainingMs).advice;
  }

  buildDurationContext(action, activeMs, typicalMs, remainingMs) {
    if (action === "HOLD") {
      return {
        summary: "No timing guidance yet — wait for a clearer signal",
        beginnerGuide:
          "The market looks mixed right now. Stay on the sidelines until you see a clear BUY or SELL. There is no suggested hold or wait period for HOLD.",
        advice: "No timed position — wait for a clear BUY or SELL signal.",
        progressPercent: null,
      };
    }

    const active = this.formatDurationMs(activeMs) || "a short time";
    const typical = this.formatDurationMs(typicalMs);
    const remaining = this.formatDurationMs(remainingMs);
    const progressPercent =
      typicalMs != null && typicalMs > 0 && activeMs != null
        ? Math.min(100, Math.round((activeMs / typicalMs) * 100))
        : null;

    if (action === "BUY") {
      if (typical && remainingMs != null && remainingMs > 0) {
        return {
          summary: `Bullish signal active for ${active} — similar trades in our test usually lasted ~${typical} total`,
          beginnerGuide: `If you buy now, plan to check back in about ${remaining}. That is when similar BUY setups in our backtest often reached their average exit point. This is a guide, not a promise — always review before you sell.`,
          advice: `BUY for ${active} · review in ~${remaining} · typical full hold ~${typical}`,
          progressPercent,
        };
      }
      if (typical) {
        return {
          summary: `Bullish signal active for ${active} — backtest average hold was ~${typical}`,
          beginnerGuide: `You could consider buying if it fits your plan. In our backtest, similar BUY signals were held for about ${typical} on average before selling. Watch for a SELL signal or set a reminder to review around then.`,
          advice: `BUY active ${active} · backtest avg hold ~${typical}`,
          progressPercent,
        };
      }
      return {
        summary: `Bullish signal active for ${active}`,
        beginnerGuide:
          "You could consider buying if it matches your risk tolerance. We do not have enough backtest history yet to suggest how long to hold.",
        advice: `BUY active ${active}`,
        progressPercent: null,
      };
    }

    // SELL
    if (typical && remainingMs != null && remainingMs > 0) {
      return {
        summary: `Bearish signal active for ${active} — similar waits in our test usually lasted ~${typical} total`,
        beginnerGuide: `Avoid buying for now. In our backtest, similar SELL periods lasted about ${typical} before the next BUY. Check back in roughly ${remaining} — that is when conditions often improved enough to consider buying again.`,
        advice: `SELL stance ${active} · recheck in ~${remaining} · typical wait ~${typical}`,
        progressPercent,
      };
    }
    if (typical) {
      return {
        summary: `Bearish signal active for ${active} — backtest average wait before buying again was ~${typical}`,
        beginnerGuide: `Stay out of the market for now. In our backtest, traders typically waited about ${typical} after a SELL before buying again. Watch for a new BUY signal.`,
        advice: `SELL stance ${active} · backtest avg wait ~${typical} before next BUY`,
        progressPercent,
      };
    }
    return {
      summary: `Bearish signal active for ${active}`,
      beginnerGuide:
        "Avoid buying for now. Wait until the signal turns to BUY or HOLD before entering a position.",
      advice: `SELL stance active ${active}`,
      progressPercent: null,
    };
  }

  async getSignalDuration(symbol = "BNB", action = "HOLD", fastPeriod = 9, slowPeriod = 21) {
    const candles = await this.fetchKlines(symbol, "1h", 168);
    const backtest = this.backtestMaCrossover(candles, { fastPeriod, slowPeriod });
    const { avgBuyHoldMs, avgSellWaitMs, buyHoldSamples, sellWaitSamples } =
      this.averageHoldDurations(backtest.trades);

    const closes = candles.map((c) => c.close);
    const fast = this.movingAverage(closes, fastPeriod);
    const slow = this.movingAverage(closes, slowPeriod);

    const regimeStart = this.findRegimeStartTime(candles, fast, slow, slowPeriod, action);
    const now = Date.now();
    const activeDurationMs = regimeStart != null ? now - regimeStart : null;

    let typicalHoldMs = null;
    let samples = 0;
    if (action === "BUY") {
      typicalHoldMs = avgBuyHoldMs;
      samples = buyHoldSamples;
    } else if (action === "SELL") {
      typicalHoldMs = avgSellWaitMs;
      samples = sellWaitSamples;
    }

    const remainingMs =
      typicalHoldMs != null && activeDurationMs != null
        ? Math.max(0, typicalHoldMs - activeDurationMs)
        : typicalHoldMs;

    const suggestedExitAt =
      remainingMs != null && action !== "HOLD"
        ? new Date(now + remainingMs).toISOString()
        : null;

    const context = this.buildDurationContext(action, activeDurationMs, typicalHoldMs, remainingMs);

    return {
      activeSince: regimeStart ? new Date(regimeStart).toISOString() : null,
      activeDurationMs,
      activeDurationLabel: this.formatDurationMs(activeDurationMs),
      typicalHoldMs,
      typicalHoldLabel: this.formatDurationMs(typicalHoldMs),
      remainingMs,
      remainingLabel: this.formatDurationMs(remainingMs),
      suggestedExitAt,
      timeframe: "1h",
      samples,
      advice: context.advice,
      summary: context.summary,
      beginnerGuide: context.beginnerGuide,
      progressPercent: context.progressPercent,
    };
  }

  backtestMaCrossover(candles, { fastPeriod = 9, slowPeriod = 21, initialUsd = 1000 } = {}) {
    const transactionCostService = require("./transactionCostService");
    const { getEvaluationConfig } = require("../config/evaluationConfig");
    const costConfig = getEvaluationConfig();

    const closes = candles.map((c) => c.close);
    const fast = this.movingAverage(closes, fastPeriod);
    const slow = this.movingAverage(closes, slowPeriod);

    let cash = initialUsd;
    let position = 0;
    let peakEquity = initialUsd;
    let maxDrawdownPercent = 0;
    let totalFeesUsd = 0;
    const trades = [];
    const equityCurve = [];

    const recordEquity = (price) => {
      const equity = cash + position * price;
      peakEquity = Math.max(peakEquity, equity);
      if (peakEquity > 0) {
        maxDrawdownPercent = Math.max(maxDrawdownPercent, ((peakEquity - equity) / peakEquity) * 100);
      }
      equityCurve.push(equity);
      return equity;
    };

    for (let i = slowPeriod; i < closes.length; i += 1) {
      const prevFast = fast[i - 1];
      const prevSlow = slow[i - 1];
      const currFast = fast[i];
      const currSlow = slow[i];
      if (prevFast == null || currFast == null) continue;

      const goldenCross = prevFast <= prevSlow && currFast > currSlow;
      const deathCross = prevFast >= prevSlow && currFast < currSlow;
      const price = closes[i];

      if (goldenCross && position === 0 && cash > 0) {
        const fill = transactionCostService.simulateBuy({
          amountUsd: cash,
          priceUsd: price,
          feeBps: costConfig.feeBps,
          slippageBps: costConfig.slippageBps,
        });
        position = fill.quantity;
        cash = 0;
        totalFeesUsd += fill.totalCostUsd;
        trades.push({
          type: "BUY",
          price,
          effectivePrice: fill.effectivePriceUsd,
          time: candles[i].openTime,
          feeUsd: fill.feeUsd,
          slippageUsd: fill.slippageUsd,
        });
      } else if (deathCross && position > 0) {
        const fill = transactionCostService.simulateSell({
          quantity: position,
          priceUsd: price,
          feeBps: costConfig.feeBps,
          slippageBps: costConfig.slippageBps,
        });
        cash = fill.netUsd;
        totalFeesUsd += fill.totalCostUsd;
        trades.push({
          type: "SELL",
          price,
          effectivePrice: fill.effectivePriceUsd,
          time: candles[i].openTime,
          feeUsd: fill.feeUsd,
          slippageUsd: fill.slippageUsd,
        });
        position = 0;
      }

      recordEquity(price);
    }

    const finalPrice = closes[closes.length - 1];
    const equity = recordEquity(finalPrice);
    const pnlUsd = equity - initialUsd;
    const pnlPercent = (pnlUsd / initialUsd) * 100;
    const disqualified = maxDrawdownPercent > costConfig.maxDrawdownPercent;

    const chartSeries = candles.map((candle, i) => ({
      time: candle.openTime,
      open: candle.open ?? closes[i],
      high: candle.high ?? closes[i],
      low: candle.low ?? closes[i],
      close: closes[i],
      volume: candle.volume ?? 0,
      price: closes[i],
      fastMa: fast[i],
      slowMa: slow[i],
    }));

    return {
      initialUsd,
      finalEquityUsd: equity,
      pnlUsd,
      pnlPercent,
      tradeCount: trades.length,
      trades,
      winRate: this.calculateWinRate(trades),
      maxDrawdownPercent,
      totalFeesUsd,
      feeBps: costConfig.feeBps,
      slippageBps: costConfig.slippageBps,
      disqualified,
      drawdownCapPercent: costConfig.maxDrawdownPercent,
      minTradeCount: costConfig.minTradeCount,
      meetsMinTrades: trades.length >= costConfig.minTradeCount,
      chartSeries,
      equityCurve,
    };
  }

  calculateWinRate(trades) {
    if (trades.length < 2) return 0;
    let wins = 0;
    let pairs = 0;
    for (let i = 1; i < trades.length; i += 2) {
      const buy = trades[i - 1];
      const sell = trades[i];
      if (buy?.type === "BUY" && sell?.type === "SELL") {
        pairs += 1;
        const buyPrice = buy.effectivePrice ?? buy.price;
        const sellPrice = sell.effectivePrice ?? sell.price;
        if (sellPrice > buyPrice) wins += 1;
      }
    }
    return pairs === 0 ? 0 : (wins / pairs) * 100;
  }

  async runCmcSkillBacktest({
    symbol = "BNB",
    fastPeriod = 9,
    slowPeriod = 21,
    initialUsd = 1000,
    signal = null,
  } = {}) {
    const [resolvedSignal, candles] = await Promise.all([
      signal ? Promise.resolve(signal) : cmcService.getTradingSignal(symbol),
      this.fetchHourlyCloses(symbol, 168),
    ]);

    const backtest = this.backtestMaCrossover(candles, {
      fastPeriod,
      slowPeriod,
      initialUsd,
    });

    const skillOutput = {
      skill: "cmc-momentum-ma-crossover",
      track: "strategy-skills",
      symbol,
      pipeline: [
        { step: "cmc-agent-hub", action: "fetch_quote_and_global_metrics" },
        { step: "signal-engine", action: "compute_regime_and_action", result: resolvedSignal },
        { step: "backtest", action: "ma_crossover_on_hourly_ohlcv", params: { fastPeriod, slowPeriod } },
      ],
      cmcSignal: resolvedSignal,
      recommendation: {
        action: resolvedSignal.action,
        confidence: resolvedSignal.confidence,
        rationale: resolvedSignal.reasons.join("; "),
        backtestAligned:
          (resolvedSignal.action === "BUY" && backtest.pnlPercent > 0) ||
          (resolvedSignal.action === "SELL" && backtest.pnlPercent < 0) ||
          resolvedSignal.action === "HOLD",
      },
      backtest,
      generatedAt: new Date().toISOString(),
    };

    return skillOutput;
  }

  async runAndSave(ownerId, {
    symbol = "BNB",
    name = "CMC Momentum MA Crossover",
    fastPeriod = 9,
    slowPeriod = 21,
    initialUsd = 1000,
  } = {}) {
    const StrategyRun = require("../models/StrategyRun");

    const skillOutput = await this.runCmcSkillBacktest({
      symbol,
      fastPeriod,
      slowPeriod,
      initialUsd,
    });

    const run = await StrategyRun.create({
      ownerId,
      name,
      symbol: symbol.toUpperCase(),
      strategyType: skillOutput.skill,
      params: { fastPeriod, slowPeriod, initialUsd },
      skillOutput,
      pnlPercent: skillOutput.backtest.pnlPercent,
      tradeCount: skillOutput.backtest.tradeCount,
    });

    return { run, skillOutput };
  }

  buildSignalSkillOutput(symbol, signal, backtest = null) {
    return {
      skill: "cmc-momentum-ma-crossover",
      track: "strategy-skills",
      symbol,
      pipeline: [
        { step: "cmc-agent-hub", action: "fetch_quote_and_global_metrics" },
        { step: "signal-engine", action: "compute_regime_and_action", result: signal },
        ...(backtest
          ? [{ step: "backtest", action: "ma_crossover_on_hourly_ohlcv" }]
          : [{ step: "signal-monitor", action: "live_signal_refresh" }]),
      ],
      cmcSignal: signal,
      recommendation: {
        action: signal.action,
        confidence: signal.confidence,
        rationale: signal.reasons.join("; "),
        backtestAligned: backtest
          ? (signal.action === "BUY" && backtest.pnlPercent > 0) ||
            (signal.action === "SELL" && backtest.pnlPercent < 0) ||
            signal.action === "HOLD"
          : null,
      },
      backtest,
      generatedAt: new Date().toISOString(),
    };
  }

  async saveSignalSnapshot(ownerId, params, signal, { previousBacktest = null } = {}) {
    const StrategyRun = require("../models/StrategyRun");
    const backtest = previousBacktest || {
      pnlPercent: 0,
      pnlUsd: 0,
      finalEquityUsd: params.initialUsd ?? 1000,
      tradeCount: 0,
      winRate: 0,
    };

    const skillOutput = this.buildSignalSkillOutput(params.symbol, signal, backtest);

    const run = await StrategyRun.create({
      ownerId,
      name: params.name || "CMC Momentum MA Crossover",
      symbol: (params.symbol || "BNB").toUpperCase(),
      strategyType: skillOutput.skill,
      params: {
        fastPeriod: params.fastPeriod ?? 9,
        slowPeriod: params.slowPeriod ?? 21,
        initialUsd: params.initialUsd ?? 1000,
        snapshot: true,
      },
      skillOutput,
      pnlPercent: backtest.pnlPercent ?? 0,
      tradeCount: backtest.tradeCount ?? 0,
    });

    return run;
  }

  async syncAgentsFromSignal(ownerId, signal, symbol) {
    const Agent = require("../models/Agent");
    const Trade = require("../models/Trade");
    const twakService = require("./twakService");

    const agents = await Agent.find({
      ownerId,
      symbol: (symbol || "BNB").toUpperCase(),
    });

    for (const agent of agents) {
      const prevAction = agent.lastSignal?.action;
      const actionChanged = prevAction !== signal.action;

      agent.lastSignal = signal;
      agent.lastRunAt = new Date();
      if (agent.isAutomated) {
        agent.status = "running";
      }
      await agent.save();

      if (actionChanged) {
        await Trade.create({
          agentId: agent._id,
          symbol: agent.symbol,
          action: signal.action,
          amountUsd: 0,
          priceUsd: signal.metrics?.priceUsd,
          confidence: signal.confidence,
          reasoning: signal.reasons?.join("; ") || `Strategy skill: ${signal.action}`,
          signal,
          executionMode: twakService.getMode(),
          status: "advisory",
        });
      }
    }

    return agents.length;
  }

  async refreshSignalMonitor(ownerId, params, { alwaysLog = false, previousBacktest = null } = {}) {
    const StrategySchedule = require("../models/StrategySchedule");
    const symbol = (params.symbol || "BNB").toUpperCase();
    const signal = await cmcService.getTradingSignal(symbol);

    const schedule = await StrategySchedule.findOne({ ownerId });
    const prevAction = schedule?.lastSignal?.action;
    const actionChanged = prevAction !== signal.action;

    await StrategySchedule.findOneAndUpdate(
      { ownerId },
      { lastRunAt: new Date(), lastSignal: signal },
      { upsert: false }
    );

    const syncedAgents = await this.syncAgentsFromSignal(ownerId, signal, symbol);

    let run = null;
    if (alwaysLog || actionChanged) {
      run = await this.saveSignalSnapshot(ownerId, params, signal, { previousBacktest });
    }

    return {
      signal,
      run,
      logged: Boolean(run),
      actionChanged,
      syncedAgents,
    };
  }
}

module.exports = new StrategyService();
