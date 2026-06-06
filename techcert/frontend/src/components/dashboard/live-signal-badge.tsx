"use client";

import { Badge } from "@/components/ui/badge";
import { Radio } from "lucide-react";
import { cn } from "@/lib/utils";
import type { TradingSignal } from "@/lib/api";

function actionVariant(action: string) {
  if (action === "BUY") return "success" as const;
  if (action === "SELL") return "destructive" as const;
  return "outline" as const;
}

export function LiveSignalBadge({
  signal,
  monitoring,
}: {
  signal: TradingSignal | null;
  monitoring?: boolean;
}) {
  if (!signal) {
    return (
      <Badge variant="outline" className="gap-1.5">
        <Radio className="h-3 w-3 animate-pulse" />
        Loading signal…
      </Badge>
    );
  }

  return (
    <Badge
      variant={actionVariant(signal.action)}
      className={cn(
        "gap-1.5",
        monitoring && (signal.action === "BUY" || signal.action === "SELL") && "animate-pulse",
      )}
    >
      <Radio className="h-3 w-3" />
      Live {signal.action} · {Math.round(signal.confidence * 100)}%
      {signal.metrics?.priceUsd != null && (
        <span className="hidden sm:inline">· ${signal.metrics.priceUsd.toFixed(2)}</span>
      )}
    </Badge>
  );
}
