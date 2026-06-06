"use client";

import { Clock, HelpCircle, Timer } from "lucide-react";
import type { TradingSignal } from "@/lib/api";

function formatFriendlyDate(iso: string) {
  return new Date(iso).toLocaleString(undefined, {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

function DurationMetric({
  title,
  value,
  help,
  detail,
}: {
  title: string;
  value: string;
  help: string;
  detail?: string;
}) {
  return (
    <div className="rounded-lg bg-white/80 p-3 dark:bg-slate-900/50">
      <p className="text-sm font-medium text-gray-900 dark:text-slate-100">{title}</p>
      <p className="mt-1 text-lg font-semibold text-amber-700 dark:text-amber-400">{value}</p>
      <p className="mt-1 text-xs leading-relaxed text-gray-500 dark:text-slate-400">{help}</p>
      {detail && (
        <p className="mt-1 text-xs text-gray-400 dark:text-slate-500">{detail}</p>
      )}
    </div>
  );
}

export function SignalDurationPanel({ signal }: { signal: TradingSignal }) {
  const duration = signal.duration;
  if (!duration) return null;

  const action = signal.action;

  if (action === "HOLD") {
    return (
      <div className="mt-3 rounded-lg border border-gray-200 bg-gray-50/80 p-4 dark:border-slate-700 dark:bg-slate-900/40">
        <div className="flex items-start gap-2">
          <HelpCircle className="mt-0.5 h-4 w-4 shrink-0 text-gray-500" />
          <div>
            <p className="text-sm font-medium text-gray-900 dark:text-slate-100">
              {duration.summary || "No timing guidance yet"}
            </p>
            <p className="mt-1 text-sm leading-relaxed text-gray-600 dark:text-slate-400">
              {duration.beginnerGuide ||
                duration.advice ||
                "Wait for a clear BUY or SELL before deciding when to enter or exit."}
            </p>
          </div>
        </div>
      </div>
    );
  }

  const isBuy = action === "BUY";
  const activeValue = duration.activeDurationLabel || "Just started";
  const typicalValue = duration.typicalHoldLabel;
  const remainingValue = duration.remainingLabel;
  const progress = duration.progressPercent;

  return (
    <div className="mt-3 space-y-3 rounded-lg border border-amber-200/70 bg-amber-50/50 p-4 dark:border-amber-900/50 dark:bg-amber-950/20">
      <div className="flex items-start gap-2">
        <Timer className="mt-0.5 h-4 w-4 shrink-0 text-amber-600 dark:text-amber-400" />
        <div>
          <p className="text-xs font-semibold uppercase tracking-wide text-amber-700 dark:text-amber-400">
            {isBuy ? "How long to hold a BUY" : "How long to wait on a SELL"}
          </p>
          <p className="mt-1 text-sm font-medium text-gray-900 dark:text-slate-100">
            {duration.summary || duration.advice}
          </p>
          {duration.beginnerGuide && (
            <p className="mt-2 text-sm leading-relaxed text-gray-700 dark:text-slate-300">
              {duration.beginnerGuide}
            </p>
          )}
        </div>
      </div>

      {progress != null && typicalValue && (
        <div>
          <div className="mb-1 flex justify-between text-xs text-gray-500 dark:text-slate-400">
            <span>Time in this signal</span>
            <span>
              {activeValue} of ~{typicalValue} typical
            </span>
          </div>
          <div className="h-2 overflow-hidden rounded-full bg-amber-100 dark:bg-amber-950">
            <div
              className="h-full rounded-full bg-amber-500 transition-all dark:bg-amber-400"
              style={{ width: `${Math.max(4, progress)}%` }}
            />
          </div>
          <p className="mt-1 text-xs text-gray-500 dark:text-slate-400">
            Based on past 1-hour chart backtests — not a guarantee of future timing.
          </p>
        </div>
      )}

      <div className="grid gap-2 sm:grid-cols-2">
        <DurationMetric
          title={isBuy ? "Signal active for" : "Avoid buying for"}
          value={activeValue}
          help={
            isBuy
              ? "How long the market has looked favorable for buying."
              : "How long conditions have looked unfavorable for buying."
          }
          detail={
            duration.activeSince
              ? `Started around ${formatFriendlyDate(duration.activeSince)}`
              : undefined
          }
        />
        {typicalValue && (
          <DurationMetric
            title={isBuy ? "Typical hold (backtest)" : "Typical wait (backtest)"}
            value={`~${typicalValue}`}
            help={
              isBuy
                ? "On average, similar BUY signals in our test were held this long before selling."
                : "On average, traders in our test waited this long after a SELL before buying again."
            }
            detail={
              duration.samples != null && duration.samples > 0
                ? `From ${duration.samples} similar periods in the backtest`
                : undefined
            }
          />
        )}
        {remainingValue && (
          <DurationMetric
            title={isBuy ? "Check again in about" : "May improve in about"}
            value={`~${remainingValue}`}
            help={
              isBuy
                ? "Rough time until similar trades often reached their average exit point."
                : "Rough time until similar periods often turned favorable for buying again."
            }
          />
        )}
        {duration.suggestedExitAt && (
          <DurationMetric
            title={isBuy ? "Suggested review time" : "Suggested re-check time"}
            value={formatFriendlyDate(duration.suggestedExitAt)}
            help={
              isBuy
                ? "A reminder to review your position — consider selling if the signal changes."
                : "A reminder to check if a BUY signal has returned."
            }
          />
        )}
      </div>

      <p className="flex items-start gap-1.5 text-xs text-gray-500 dark:text-slate-400">
        <Clock className="mt-0.5 h-3.5 w-3.5 shrink-0" />
        These times come from historical backtests on 1-hour charts. They help you plan — you always
        choose when to execute.
      </p>
    </div>
  );
}
