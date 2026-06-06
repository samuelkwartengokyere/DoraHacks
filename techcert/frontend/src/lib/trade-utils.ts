import type { Trade } from "@/lib/api";

export function isExecutedChartTrade(trade: Trade) {
  return (
    trade.amountUsd > 0 &&
    (trade.action === "BUY" || trade.action === "SELL") &&
    (trade.status === "open" || trade.status === "completed")
  );
}

export function isOpenTrade(trade: Trade) {
  return trade.status === "open" && trade.amountUsd > 0;
}
