"use client";

import { Download, Share, X } from "lucide-react";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { canOfferInstall } from "@/lib/pwa/install";
import { cn } from "@/lib/utils";
import { usePwaInstall } from "@/components/pwa/pwa-install-provider";

type InstallAppButtonVariant = "button" | "menu-item" | "compact";

interface InstallAppButtonProps {
  variant?: InstallAppButtonVariant;
  className?: string;
  onAction?: () => void;
}

export function InstallAppButton({
  variant = "button",
  className,
  onAction,
}: InstallAppButtonProps) {
  const { deferredPrompt, isMobile, isIOS, isStandalone, promptInstall } =
    usePwaInstall();
  const [showIOSGuide, setShowIOSGuide] = useState(false);

  const canInstall = canOfferInstall(isMobile, isStandalone);

  if (!canInstall) return null;

  async function handleClick() {
    onAction?.();

    if (deferredPrompt) {
      await promptInstall();
      return;
    }

    setShowIOSGuide(true);
  }

  const label = "Install App";

  return (
    <>
      {variant === "menu-item" ? (
        <button
          type="button"
          onClick={handleClick}
          className={cn(
            "flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-left text-sm font-medium text-gray-600 transition-colors hover:bg-blue-50 hover:text-blue-600 dark:text-slate-400 dark:hover:bg-slate-800 dark:hover:text-blue-400",
            className
          )}
        >
          <Download className="h-4 w-4 shrink-0" />
          {label}
        </button>
      ) : variant === "compact" ? (
        <button
          type="button"
          onClick={handleClick}
          aria-label={label}
          className={cn(
            "cursor-pointer rounded-lg border border-gray-200 p-2 text-gray-600 transition-colors hover:bg-gray-50 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800",
            className
          )}
        >
          <Download className="h-5 w-5" />
        </button>
      ) : (
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={handleClick}
          className={className}
        >
          <Download className="h-4 w-4" />
          {label}
        </Button>
      )}

      {showIOSGuide ? (
        <div
          className="fixed inset-0 z-[100] flex items-end justify-center bg-black/50 p-4 sm:items-center"
          role="dialog"
          aria-modal="true"
          aria-labelledby="ios-install-title"
          onClick={() => setShowIOSGuide(false)}
        >
          <div
            className="w-full max-w-sm rounded-2xl bg-white p-5 shadow-xl dark:bg-slate-900"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="mb-4 flex items-start justify-between gap-3">
              <div>
                <h2
                  id="ios-install-title"
                  className="text-lg font-semibold text-gray-900 dark:text-slate-100"
                >
                  Install SignalForge
                </h2>
                <p className="mt-1 text-sm text-gray-500 dark:text-slate-400">
                  {isIOS
                    ? "Add this app to your home screen for quick access."
                    : "Install this app from your browser menu for quick access."}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setShowIOSGuide(false)}
                className="cursor-pointer rounded-lg p-1 text-gray-500 hover:bg-gray-100 dark:text-slate-400 dark:hover:bg-slate-800"
                aria-label="Close"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
            {isIOS ? (
              <ol className="space-y-3 text-sm text-gray-700 dark:text-slate-300">
                <li className="flex items-start gap-3">
                  <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-amber-100 text-xs font-bold text-amber-800 dark:bg-amber-950 dark:text-amber-300">
                    1
                  </span>
                  <span>
                    Tap the <Share className="inline h-4 w-4" /> Share button in
                    Safari&apos;s toolbar.
                  </span>
                </li>
                <li className="flex items-start gap-3">
                  <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-amber-100 text-xs font-bold text-amber-800 dark:bg-amber-950 dark:text-amber-300">
                    2
                  </span>
                  <span>Scroll down and choose &quot;Add to Home Screen&quot;.</span>
                </li>
                <li className="flex items-start gap-3">
                  <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-amber-100 text-xs font-bold text-amber-800 dark:bg-amber-950 dark:text-amber-300">
                    3
                  </span>
                  <span>Tap &quot;Add&quot; to install SignalForge on your phone.</span>
                </li>
              </ol>
            ) : (
              <ol className="space-y-3 text-sm text-gray-700 dark:text-slate-300">
                <li className="flex items-start gap-3">
                  <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-amber-100 text-xs font-bold text-amber-800 dark:bg-amber-950 dark:text-amber-300">
                    1
                  </span>
                  <span>Open your browser menu (usually the three-dot icon).</span>
                </li>
                <li className="flex items-start gap-3">
                  <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-amber-100 text-xs font-bold text-amber-800 dark:bg-amber-950 dark:text-amber-300">
                    2
                  </span>
                  <span>
                    Choose &quot;Install app&quot; or &quot;Add to Home screen&quot;.
                  </span>
                </li>
                <li className="flex items-start gap-3">
                  <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-amber-100 text-xs font-bold text-amber-800 dark:bg-amber-950 dark:text-amber-300">
                    3
                  </span>
                  <span>Confirm to add SignalForge to your phone.</span>
                </li>
              </ol>
            )}
            <Button
              type="button"
              className="mt-5 w-full"
              onClick={() => setShowIOSGuide(false)}
            >
              Got it
            </Button>
          </div>
        </div>
      ) : null}
    </>
  );
}
