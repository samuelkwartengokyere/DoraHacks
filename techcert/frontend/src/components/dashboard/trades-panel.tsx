"use client";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Activity } from "lucide-react";
import type { Trade } from "@/lib/api";

interface TradesPanelProps {
  trades: Trade[];
}

export function TradesPanel({ trades }: TradesPanelProps) {
  return (
    <div className="mx-auto max-w-5xl space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Activity className="h-5 w-5" />
            Trade Log
          </CardTitle>
          <CardDescription>
            Agent decisions and TWAK executions on BNB Smart Chain testnet
          </CardDescription>
        </CardHeader>
        <CardContent>
          {trades.length === 0 ? (
            <p className="text-sm text-gray-500 dark:text-slate-400">
              No trades logged. Run an agent from the Agent tab.
            </p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[640px] text-left text-sm">
                <thead>
                  <tr className="border-b border-gray-100 text-gray-500 dark:border-slate-800">
                    <th className="pb-2 pr-4 font-medium">Time</th>
                    <th className="pb-2 pr-4 font-medium">Action</th>
                    <th className="pb-2 pr-4 font-medium">Symbol</th>
                    <th className="pb-2 pr-4 font-medium">Amount</th>
                    <th className="pb-2 pr-4 font-medium">Mode</th>
                    <th className="pb-2 pr-4 font-medium">Status</th>
                    <th className="pb-2 font-medium">Tx</th>
                  </tr>
                </thead>
                <tbody>
                  {trades.map((trade) => (
                    <tr key={trade._id} className="border-b border-gray-50 dark:border-slate-800/80">
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
                      <td className="py-3 pr-4">{trade.status}</td>
                      <td className="py-3 font-mono text-xs">
                        {trade.txHash ? `${trade.txHash.slice(0, 10)}...` : "—"}
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
