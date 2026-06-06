"use client";

import { useMemo, useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Activity, ChartCandlestick, Trash2, XCircle } from "lucide-react";
import { api, type Trade } from "@/lib/api";
import { isOpenTrade } from "@/lib/trade-utils";

interface TradesPanelProps {
  trades: Trade[];
  onRefresh: () => Promise<void>;
  onViewOnChart?: (tradeId: string) => void;
}

export function TradesPanel({ trades, onRefresh, onViewOnChart }: TradesPanelProps) {
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(false);
  const [cancellingId, setCancellingId] = useState<string | null>(null);
  const [error, setError] = useState("");

  const allSelected = trades.length > 0 && selected.size === trades.length;
  const someSelected = selected.size > 0;

  const selectedIds = useMemo(() => Array.from(selected), [selected]);

  function toggleOne(id: string) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function toggleAll() {
    if (allSelected) {
      setSelected(new Set());
    } else {
      setSelected(new Set(trades.map((t) => t._id)));
    }
  }

  async function handleDeleteSelected() {
    if (selectedIds.length === 0) return;
    if (!window.confirm(`Delete ${selectedIds.length} selected trade(s)?`)) return;

    setLoading(true);
    setError("");
    try {
      await api.deleteTrades(selectedIds);
      setSelected(new Set());
      await onRefresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to delete trades");
    } finally {
      setLoading(false);
    }
  }

  async function handleCancelTrade(tradeId: string) {
    if (!window.confirm("Cancel this open trade?")) return;
    setCancellingId(tradeId);
    setError("");
    try {
      await api.cancelTrade(tradeId);
      await onRefresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to cancel trade");
    } finally {
      setCancellingId(null);
    }
  }

  function statusLabel(status: string) {
    if (status === "advisory") return "signal";
    if (status === "open") return "open";
    if (status === "cancelled") return "cancelled";
    return status;
  }

  function statusVariant(status: string) {
    if (status === "open") return "success" as const;
    if (status === "advisory") return "outline" as const;
    if (status === "completed") return "success" as const;
    if (status === "cancelled") return "outline" as const;
    if (status === "failed") return "destructive" as const;
    return "outline" as const;
  }

  async function handleClearAll() {
    if (trades.length === 0) return;
    if (!window.confirm(`Delete all ${trades.length} trade log entries? This cannot be undone.`)) return;

    setLoading(true);
    setError("");
    try {
      await api.deleteAllTrades();
      setSelected(new Set());
      await onRefresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to clear trade log");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="mx-auto max-w-5xl space-y-6">
      <Card>
        <CardHeader className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Activity className="h-5 w-5" />
              Trade Log
            </CardTitle>
            <CardDescription>
              Agent decisions and TWAK executions on BNB Smart Chain testnet
            </CardDescription>
          </div>
          {trades.length > 0 && (
            <div className="flex flex-wrap gap-2">
              <Button
                variant="outline"
                size="sm"
                disabled={!someSelected || loading}
                onClick={handleDeleteSelected}
                className="gap-2"
              >
                <Trash2 className="h-4 w-4" />
                Delete selected ({selected.size})
              </Button>
              <Button
                variant="destructive"
                size="sm"
                disabled={loading}
                onClick={handleClearAll}
                className="gap-2"
              >
                <Trash2 className="h-4 w-4" />
                Clear all
              </Button>
            </div>
          )}
        </CardHeader>
        <CardContent>
          {error && (
            <p className="mb-4 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700 dark:border-red-900 dark:bg-red-950 dark:text-red-300">
              {error}
            </p>
          )}

          {trades.length === 0 ? (
            <p className="text-sm text-gray-500 dark:text-slate-400">
              No entries yet. Check a signal from the Agent tab.
            </p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[680px] text-left text-sm">
                <thead>
                  <tr className="border-b border-gray-100 text-gray-500 dark:border-slate-800">
                    <th className="pb-2 pr-3 font-medium">
                      <input
                        type="checkbox"
                        checked={allSelected}
                        onChange={toggleAll}
                        aria-label="Select all trades"
                        className="h-4 w-4 cursor-pointer rounded border-gray-300"
                      />
                    </th>
                    <th className="pb-2 pr-4 font-medium">Time</th>
                    <th className="pb-2 pr-4 font-medium">Action</th>
                    <th className="pb-2 pr-4 font-medium">Symbol</th>
                    <th className="pb-2 pr-4 font-medium">Amount</th>
                    <th className="pb-2 pr-4 font-medium">Mode</th>
                    <th className="pb-2 pr-4 font-medium">Status</th>
                    <th className="pb-2 pr-4 font-medium">Tx</th>
                    <th className="pb-2 font-medium">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {trades.map((trade) => (
                    <tr
                      key={trade._id}
                      className="border-b border-gray-50 dark:border-slate-800/80"
                    >
                      <td className="py-3 pr-3">
                        <input
                          type="checkbox"
                          checked={selected.has(trade._id)}
                          onChange={() => toggleOne(trade._id)}
                          aria-label={`Select trade ${trade._id}`}
                          className="h-4 w-4 cursor-pointer rounded border-gray-300"
                        />
                      </td>
                      <td className="py-3 pr-4 text-gray-600 dark:text-slate-400">
                        {new Date(trade.createdAt).toLocaleString()}
                      </td>
                      <td className="py-3 pr-4">
                        <Badge
                          variant={
                            trade.action === "BUY"
                              ? "success"
                              : trade.action === "SELL"
                                ? "destructive"
                                : "outline"
                          }
                        >
                          {trade.action}
                        </Badge>
                      </td>
                      <td className="py-3 pr-4 font-medium">{trade.symbol}</td>
                      <td className="py-3 pr-4">${trade.amountUsd}</td>
                      <td className="py-3 pr-4">{trade.executionMode}</td>
                      <td className="py-3 pr-4">
                        <Badge variant={statusVariant(trade.status)}>
                          {statusLabel(trade.status)}
                        </Badge>
                      </td>
                      <td className="py-3 pr-4 font-mono text-xs">
                        {trade.txHash ? `${trade.txHash.slice(0, 10)}...` : "—"}
                      </td>
                      <td className="py-3">
                        <div className="flex flex-wrap gap-1">
                          {isOpenTrade(trade) && (
                            <>
                              <Button
                                variant="outline"
                                size="sm"
                                className="h-7 gap-1 px-2"
                                onClick={() => onViewOnChart?.(trade._id)}
                              >
                                <ChartCandlestick className="h-3.5 w-3.5" />
                                Chart
                              </Button>
                              <Button
                                variant="destructive"
                                size="sm"
                                className="h-7 gap-1 px-2"
                                disabled={cancellingId === trade._id}
                                onClick={() => handleCancelTrade(trade._id)}
                              >
                                <XCircle className="h-3.5 w-3.5" />
                                Cancel
                              </Button>
                            </>
                          )}
                          {isOpenTrade(trade) === false &&
                            trade.amountUsd > 0 &&
                            (trade.status === "completed" || trade.status === "open") && (
                              <Button
                                variant="outline"
                                size="sm"
                                className="h-7 gap-1 px-2"
                                onClick={() => onViewOnChart?.(trade._id)}
                              >
                                <ChartCandlestick className="h-3.5 w-3.5" />
                                Chart
                              </Button>
                            )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
