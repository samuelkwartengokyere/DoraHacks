class TransactionCostService {
  getCostParams(overrides = {}) {
    const { getEvaluationConfig } = require("../config/evaluationConfig");
    const config = getEvaluationConfig();
    return {
      feeBps: overrides.feeBps ?? config.feeBps,
      slippageBps: overrides.slippageBps ?? config.slippageBps,
    };
  }

  /**
   * Simulate a BUY: fees and slippage reduce notional and worsen fill price.
   */
  simulateBuy({ amountUsd, priceUsd, feeBps, slippageBps }) {
    const params = this.getCostParams({ feeBps, slippageBps });
    const feeUsd = (amountUsd * params.feeBps) / 10_000;
    const slippageUsd = (amountUsd * params.slippageBps) / 10_000;
    const netUsd = Math.max(0, amountUsd - feeUsd - slippageUsd);
    const effectivePriceUsd = priceUsd * (1 + params.slippageBps / 10_000);
    const quantity = effectivePriceUsd > 0 ? netUsd / effectivePriceUsd : 0;

    return {
      feeUsd,
      slippageUsd,
      totalCostUsd: feeUsd + slippageUsd,
      netUsd,
      effectivePriceUsd,
      quantity,
      feeBps: params.feeBps,
      slippageBps: params.slippageBps,
    };
  }

  /**
   * Simulate a SELL: fees and slippage reduce proceeds and worsen fill price.
   */
  simulateSell({ quantity, priceUsd, feeBps, slippageBps }) {
    const params = this.getCostParams({ feeBps, slippageBps });
    const grossUsd = quantity * priceUsd;
    const effectivePriceUsd = priceUsd * (1 - params.slippageBps / 10_000);
    const proceedsUsd = quantity * effectivePriceUsd;
    const feeUsd = (proceedsUsd * params.feeBps) / 10_000;
    const slippageUsd = grossUsd - proceedsUsd;
    const netUsd = Math.max(0, proceedsUsd - feeUsd);

    return {
      feeUsd,
      slippageUsd,
      totalCostUsd: feeUsd + Math.max(0, slippageUsd),
      grossUsd,
      netUsd,
      effectivePriceUsd,
      quantity,
      feeBps: params.feeBps,
      slippageBps: params.slippageBps,
    };
  }
}

module.exports = new TransactionCostService();
