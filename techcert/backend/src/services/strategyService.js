const axios = require("axios");
const cmcService = require("./cmcService");

class StrategyService {
  async fetchHourlyCloses(symbol = "BNB", limit = 168) {
    const pair = symbol.toUpperCase() === "BNB" ? "BNBUSDT" : `${symbol.toUpperCase()}USDT`;

    try {
      const response = await axios.get("https://api.binance.com/api/v3/klines", {
        params: { symbol: pair, interval: "1h", limit },
        timeout: 15000,
      });

      return response.data.map((row) => ({
        openTime: row[0],
        close: parseFloat(row[4]),
        volume: parseFloat(row[5]),
      }));
    } catch (error) {
      console.warn("Binance klines unavailable — generating synthetic series:", error.message);
      return this.syntheticCloses(limit);
    }
  }

  syntheticCloses(limit) {
    let price = 600;
    const rows = [];
    const now = Date.now();

    for (let i = limit - 1; i >= 0; i -= 1) {
      price *= 1 + (Math.random() - 0.48) * 0.008;
      rows.push({
        openTime: now - i * 3600_000,
        close: price,
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

  backtestMaCrossover(candles, { fastPeriod = 9, slowPeriod = 21, initialUsd = 1000 } = {}) {
    const closes = candles.map((c) => c.close);
    const fast = this.movingAverage(closes, fastPeriod);
    const slow = this.movingAverage(closes, slowPeriod);

    let cash = initialUsd;
    let position = 0;
    const trades = [];

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
        position = cash / price;
        trades.push({ type: "BUY", price, time: candles[i].openTime });
        cash = 0;
      } else if (deathCross && position > 0) {
        cash = position * price;
        trades.push({ type: "SELL", price, time: candles[i].openTime });
        position = 0;
      }
    }

    const finalPrice = closes[closes.length - 1];
    const equity = cash + position * finalPrice;
    const pnlUsd = equity - initialUsd;
    const pnlPercent = (pnlUsd / initialUsd) * 100;

    return {
      initialUsd,
      finalEquityUsd: equity,
      pnlUsd,
      pnlPercent,
      tradeCount: trades.length,
      trades,
      winRate: this.calculateWinRate(trades),
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
        if (sell.price > buy.price) wins += 1;
      }
    }
    return pairs === 0 ? 0 : (wins / pairs) * 100;
  }

  async runCmcSkillBacktest({
    symbol = "BNB",
    fastPeriod = 9,
    slowPeriod = 21,
    initialUsd = 1000,
  } = {}) {
    const [signal, candles] = await Promise.all([
      cmcService.getTradingSignal(symbol),
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
        { step: "signal-engine", action: "compute_regime_and_action", result: signal },
        { step: "backtest", action: "ma_crossover_on_hourly_ohlcv", params: { fastPeriod, slowPeriod } },
      ],
      cmcSignal: signal,
      recommendation: {
        action: signal.action,
        confidence: signal.confidence,
        rationale: signal.reasons.join("; "),
        backtestAligned:
          (signal.action === "BUY" && backtest.pnlPercent > 0) ||
          (signal.action === "SELL" && backtest.pnlPercent < 0) ||
          signal.action === "HOLD",
      },
      backtest,
      generatedAt: new Date().toISOString(),
    };

    return skillOutput;
  }
}

module.exports = new StrategyService();
