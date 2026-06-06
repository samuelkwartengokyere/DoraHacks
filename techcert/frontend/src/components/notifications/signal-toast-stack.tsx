"use client";

import { useCallback, useState } from "react";
import { X, TrendingUp, TrendingDown, Minus } from "lucide-react";
import { cn } from "@/lib/utils";
import type { SignalToast } from "@/lib/signal-notifications";

interface SignalToastStackProps {
  toasts: SignalToast[];
  onDismiss: (id: string) => void;
}

function ToastIcon({ action }: { action: SignalToast["action"] }) {
  if (action === "BUY") return <TrendingUp className="h-5 w-5 text-green-500" />;
  if (action === "SELL") return <TrendingDown className="h-5 w-5 text-red-500" />;
  return <Minus className="h-5 w-5 text-amber-500" />;
}

export function SignalToastStack({ toasts, onDismiss }: SignalToastStackProps) {
  if (toasts.length === 0) return null;

  return (
    <div
      className="pointer-events-none fixed bottom-4 right-4 z-[100] flex w-[min(100vw-2rem,22rem)] flex-col gap-2"
      aria-live="polite"
      aria-label="Trading signal notifications"
    >
      {toasts.map((toast) => (
        <div
          key={toast.id}
          className={cn(
            "pointer-events-auto motion-safe:animate-fade-in rounded-lg border bg-white p-4 shadow-lg dark:bg-slate-900",
            toast.action === "BUY" && "border-green-200 dark:border-green-900",
            toast.action === "SELL" && "border-red-200 dark:border-red-900",
            toast.action === "HOLD" && "border-amber-200 dark:border-amber-900",
          )}
        >
          <div className="flex items-start gap-3">
            <ToastIcon action={toast.action} />
            <div className="min-w-0 flex-1">
              <p className="text-sm font-semibold text-gray-900 dark:text-slate-100">
                {toast.action} {toast.symbol}
              </p>
              <p className="text-xs text-gray-500 dark:text-slate-400">{toast.source}</p>
              {(toast.confidence != null || toast.status) && (
                <p className="mt-1 text-xs text-gray-600 dark:text-slate-300">
                  {toast.confidence != null && `${Math.round(toast.confidence * 100)}% confidence`}
                  {toast.confidence != null && toast.status && " · "}
                  {toast.status}
                </p>
              )}
              {toast.durationAdvice && (
              <p className="mt-1 line-clamp-4 text-xs text-amber-700 dark:text-amber-300">
                {toast.durationAdvice}
              </p>
            )}
            {toast.message && (
                <p className="mt-1 line-clamp-2 text-xs text-gray-500 dark:text-slate-400">
                  {toast.message}
                </p>
              )}
            </div>
            <button
              type="button"
              onClick={() => onDismiss(toast.id)}
              className="cursor-pointer rounded p-1 text-gray-400 hover:bg-gray-100 hover:text-gray-600 dark:hover:bg-slate-800 dark:hover:text-slate-200"
              aria-label="Dismiss notification"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        </div>
      ))}
    </div>
  );
}

export function useSignalToasts() {
  const [toasts, setToasts] = useState<SignalToast[]>([]);

  const dismissToast = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const pushToast = useCallback((payload: Omit<SignalToast, "id" | "createdAt">) => {
    const id = crypto.randomUUID();
    const toast: SignalToast = { ...payload, id, createdAt: Date.now() };
    setToasts((prev) => [...prev.slice(-4), toast]);
    const dismissMs = payload.action === "BUY" || payload.action === "SELL" ? 20_000 : 10_000;
    window.setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, dismissMs);
    return id;
  }, []);

  return { toasts, pushToast, dismissToast };
}
