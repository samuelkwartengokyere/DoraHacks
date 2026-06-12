const cmcMcpClient = require("./cmcMcpClient");

function mockIndicators(symbol) {
  return {
    mock: true,
    symbol: symbol.toUpperCase(),
    technical: {
      mock: true,
      symbol: symbol.toUpperCase(),
      movingAverages: { sma30: 620, sma200: 580, ema30: 615 },
      macd: { line: 1.2, signal: 0.8, histogram: 0.4 },
      rsi: { rsi14: 52 },
      source: "cmc-mock-indicators",
    },
    globalSentiment: {
      fearGreedIndex: 45,
      fearGreedLabel: "Neutral",
      marketCapChange24h: 0.8,
      source: "cmc-mock-indicators",
    },
    source: "cmc-mock-indicators",
  };
}

function scoreTechnicalIndicators(technical, priceUsd) {
  let score = 0;
  const reasons = [];
  const rsi14 = technical?.rsi?.rsi14;
  const histogram = technical?.macd?.histogram;
  const macdLine = technical?.macd?.line;
  const signalLine = technical?.macd?.signal;
  const sma200 = technical?.movingAverages?.sma200;
  const ema30 = technical?.movingAverages?.ema30;

  if (rsi14 != null) {
    if (rsi14 <= 30) {
      score += 0.85;
      reasons.push(`RSI(14) oversold at ${rsi14.toFixed(1)} — contrarian buy zone`);
    } else if (rsi14 >= 70) {
      score -= 0.85;
      reasons.push(`RSI(14) overbought at ${rsi14.toFixed(1)} — take-profit bias`);
    } else if (rsi14 >= 55) {
      score += 0.25;
      reasons.push(`RSI(14) bullish momentum at ${rsi14.toFixed(1)}`);
    } else if (rsi14 <= 45) {
      score -= 0.25;
      reasons.push(`RSI(14) weak momentum at ${rsi14.toFixed(1)}`);
    }
  }

  if (histogram != null && macdLine != null && signalLine != null) {
    if (histogram > 0 && macdLine > signalLine) {
      score += 0.6;
      reasons.push("MACD bullish crossover (line above signal, positive histogram)");
    } else if (histogram < 0 && macdLine < signalLine) {
      score -= 0.6;
      reasons.push("MACD bearish crossover (line below signal, negative histogram)");
    }
  }

  if (priceUsd != null && sma200 != null) {
    if (priceUsd > sma200) {
      score += 0.35;
      reasons.push(`Price above SMA200 (${sma200.toFixed(2)}) — long-term uptrend`);
    } else {
      score -= 0.35;
      reasons.push(`Price below SMA200 (${sma200.toFixed(2)}) — long-term downtrend`);
    }
  }

  if (priceUsd != null && ema30 != null) {
    if (priceUsd > ema30) {
      score += 0.2;
      reasons.push(`Price above EMA30 (${ema30.toFixed(2)})`);
    } else {
      score -= 0.2;
      reasons.push(`Price below EMA30 (${ema30.toFixed(2)})`);
    }
  }

  return { score, reasons };
}

function scoreGlobalSentiment(globalSentiment) {
  let score = 0;
  const reasons = [];
  const index = globalSentiment?.fearGreedIndex;

  if (index != null) {
    if (index <= 25) {
      score += 0.5;
      reasons.push(
        `CMC Fear & Greed ${index} (${globalSentiment.fearGreedLabel || "Extreme fear"}) — contrarian opportunity`
      );
    } else if (index >= 75) {
      score -= 0.5;
      reasons.push(
        `CMC Fear & Greed ${index} (${globalSentiment.fearGreedLabel || "Greed"}) — crowded risk`
      );
    } else if (index >= 60) {
      score -= 0.2;
      reasons.push(`CMC Fear & Greed ${index} — elevated greed`);
    } else if (index <= 40) {
      score += 0.2;
      reasons.push(`CMC Fear & Greed ${index} — cautious market`);
    }
  }

  return { score, reasons };
}

function applyIndicatorsToSignal(signal, indicators) {
  if (!indicators) return signal;

  const technicalScore = scoreTechnicalIndicators(indicators.technical, signal.metrics?.priceUsd);
  const sentimentScore = scoreGlobalSentiment(indicators.globalSentiment);
  const indicatorScore = Number((technicalScore.score + sentimentScore.score).toFixed(2));
  const reasons = [...signal.reasons, ...technicalScore.reasons, ...sentimentScore.reasons];

  const weight = { BUY: 1, HOLD: 0, SELL: -1 };
  const basePart = weight[signal.action] * signal.confidence;
  const indicatorPart = Math.max(-1, Math.min(1, indicatorScore / 2));
  const composite = basePart * 0.65 + indicatorPart * 0.35;

  let action = signal.action;
  let confidence = signal.confidence;

  if (composite >= 0.35) {
    action = "BUY";
    confidence = Math.min(0.92, 0.58 + composite * 0.35);
  } else if (composite <= -0.35) {
    action = "SELL";
    confidence = Math.min(0.92, 0.58 + Math.abs(composite) * 0.35);
  } else if (Math.abs(indicatorPart) > 0.25 && signal.action === "HOLD") {
    action = indicatorPart > 0 ? "BUY" : "SELL";
    confidence = Math.min(0.78, 0.55 + Math.abs(indicatorPart) * 0.3);
  }

  return {
    ...signal,
    action,
    confidence: Number(confidence.toFixed(2)),
    reasons: [...new Set(reasons)],
    source: `${signal.source}+mcp-indicators`,
    mcpIndicators: {
      technical: indicators.technical,
      globalSentiment: indicators.globalSentiment,
      indicatorScore,
      mock: indicators.mock,
      source: indicators.source,
    },
    metrics: {
      ...signal.metrics,
      rsi14: indicators.technical?.rsi?.rsi14 ?? null,
      macdHistogram: indicators.technical?.macd?.histogram ?? null,
      fearGreedIndex: indicators.globalSentiment?.fearGreedIndex ?? null,
      sma200: indicators.technical?.movingAverages?.sma200 ?? null,
      indicatorScore,
    },
  };
}

async function fetchMcpIndicators(symbol, { priceUsd = null } = {}) {
  if (!cmcMcpClient.isConfigured()) {
    return mockIndicators(symbol);
  }

  try {
    const [technicalRaw, globalRaw] = await Promise.all([
      cmcMcpClient.getTechnicalAnalysis(symbol),
      cmcMcpClient.getGlobalMetrics(),
    ]);

    const technical = cmcMcpClient.normalizeTechnicalAnalysis(technicalRaw, symbol);
    const globalNormalized = cmcMcpClient.normalizeGlobalMetrics(globalRaw);

    return {
      mock: false,
      symbol: symbol.toUpperCase(),
      technical,
      globalSentiment: {
        fearGreedIndex: globalNormalized.fearGreedIndex,
        fearGreedLabel: globalNormalized.fearGreedLabel,
        marketCapChange24h: globalNormalized.marketCapChange24h,
        btcDominance: globalNormalized.btcDominance,
        source: globalNormalized.source,
      },
      source: "cmc-agent-hub-mcp",
    };
  } catch (error) {
    console.warn("CMC MCP indicators unavailable — using mock:", error.message);
    return mockIndicators(symbol);
  }
}

module.exports = {
  fetchMcpIndicators,
  applyIndicatorsToSignal,
  scoreTechnicalIndicators,
  scoreGlobalSentiment,
  mockIndicators,
};
