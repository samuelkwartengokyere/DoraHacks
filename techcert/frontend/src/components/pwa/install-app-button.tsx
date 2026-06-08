"use client";

import {
  Download,
  MoreVertical,
  Share,
  Smartphone,
  Sparkles,
  X,
} from "lucide-react";
import { useEffect, useState } from "react";
import { LogoMark } from "@/components/brand/logo";
import { Button } from "@/components/ui/button";
import { usePwaInstall } from "@/components/pwa/pwa-install-provider";
import { canOfferInstall } from "@/lib/pwa/install";
import { cn } from "@/lib/utils";

const SHRINK_DELAY_MS = 1000;
const SHRINK_DURATION_MS = 500;

const iosSteps = [
  {
    icon: Share,
    text: (
      <>
        Tap the <Share className="inline h-4 w-4 align-[-2px]" /> Share button in
        Safari&apos;s toolbar.
      </>
    ),
  },
  {
    icon: Download,
    text: <>Scroll down and choose &quot;Add to Home Screen&quot;.</>,
  },
  {
    icon: Smartphone,
    text: <>Tap &quot;Add&quot; to install SignalForge on your phone.</>,
  },
] as const;

const androidSteps = [
  {
    icon: MoreVertical,
    text: <>Open your browser menu (usually the three-dot icon).</>,
  },
  {
    icon: Download,
    text: <>Choose &quot;Install app&quot; or &quot;Add to Home screen&quot;.</>,
  },
  {
    icon: Smartphone,
    text: <>Confirm to add SignalForge to your phone.</>,
  },
] as const;

export function InstallAppFloatingButton() {
  const { deferredPrompt, isMobile, isIOS, isStandalone, promptInstall } =
    usePwaInstall();
  const [showGuide, setShowGuide] = useState(false);
  const [isCompact, setIsCompact] = useState(false);
  const [compactMotion, setCompactMotion] = useState(false);

  const canInstall = canOfferInstall(isMobile, isStandalone);

  useEffect(() => {
    const shrinkTimer = window.setTimeout(() => setIsCompact(true), SHRINK_DELAY_MS);
    const motionTimer = window.setTimeout(
      () => setCompactMotion(true),
      SHRINK_DELAY_MS + SHRINK_DURATION_MS
    );

    return () => {
      window.clearTimeout(shrinkTimer);
      window.clearTimeout(motionTimer);
    };
  }, []);

  if (!canInstall) return null;

  async function handleClick() {
    if (deferredPrompt) {
      await promptInstall();
      return;
    }

    setShowGuide(true);
  }

  const steps = isIOS ? iosSteps : androidSteps;

  return (
    <>
      <div
        className={cn(
          "fixed right-4 z-40 md:hidden",
          "bottom-[max(1.25rem,env(safe-area-inset-bottom,0px))]",
          !isCompact && "motion-safe:animate-install-fab-enter"
        )}
      >
        <button
          type="button"
          onClick={handleClick}
          aria-label="Install SignalForge on your phone"
          className={cn(
            "group relative flex cursor-pointer items-center overflow-hidden border border-white/25 text-left text-white",
            "bg-linear-to-br from-amber-500 via-amber-500 to-orange-600",
            "shadow-[0_12px_28px_-8px_rgba(245,158,11,0.55)]",
            "transition-[width,height,padding,border-radius,gap,transform,box-shadow] duration-500 ease-[cubic-bezier(0.22,1,0.36,1)]",
            "hover:from-amber-400 hover:to-orange-500",
            "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-300 focus-visible:ring-offset-2 focus-visible:ring-offset-white dark:focus-visible:ring-offset-slate-950",
            "motion-safe:active:scale-[0.96]",
            isCompact
              ? cn(
                  "h-14 w-14 justify-center rounded-full p-0",
                  compactMotion && "motion-safe:animate-install-fab-shrink-pulse",
                  !compactMotion && "motion-safe:animate-install-fab-glow"
                )
              : cn(
                  "w-[min(17rem,calc(100vw-2rem))] gap-3 rounded-2xl px-3.5 py-3",
                  "motion-safe:animate-install-fab-glow",
                  "hover:scale-[1.02]"
                )
          )}
        >
          <span
            aria-hidden
            className={cn(
              "pointer-events-none absolute rounded-full bg-white/15 blur-2xl transition-all duration-500",
              isCompact
                ? "-right-4 -top-4 h-16 w-16 opacity-80"
                : "-right-6 -top-8 h-24 w-24 group-hover:opacity-90"
            )}
          />
          <span
            aria-hidden
            className={cn(
              "pointer-events-none absolute rounded-full bg-orange-300/20 blur-xl transition-all duration-500",
              isCompact ? "-bottom-6 -left-3 h-14 w-14" : "-bottom-10 -left-4 h-20 w-20"
            )}
          />

          <span
            className={cn(
              "relative flex shrink-0 items-center justify-center rounded-xl border border-white/30 bg-white/15 shadow-inner backdrop-blur-sm transition-all duration-500",
              isCompact ? "h-10 w-10 rounded-full" : "h-11 w-11"
            )}
          >
            <LogoMark
              size={isCompact ? 24 : 28}
              className={cn("rounded-md transition-all duration-500", isCompact && "rounded-full")}
            />
          </span>

          <span
            className={cn(
              "relative min-w-0 overflow-hidden transition-all duration-500",
              isCompact ? "max-w-0 flex-none opacity-0" : "max-w-full flex-1 opacity-100"
            )}
          >
            <span className="flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-[0.14em] text-amber-100/90">
              <Sparkles className="h-3 w-3 shrink-0" aria-hidden />
              Free install
            </span>
            <span className="mt-0.5 block truncate text-[15px] font-bold leading-tight">
              Add to Home Screen
            </span>
            <span className="mt-0.5 block truncate text-xs font-medium text-amber-50/85">
              Open like a native app
            </span>
          </span>

          <span
            className={cn(
              "relative flex shrink-0 items-center justify-center rounded-full border border-white/25 bg-white/15 backdrop-blur-sm transition-all duration-500",
              isCompact
                ? "pointer-events-none absolute -bottom-0.5 -right-0.5 h-5 w-5 border-amber-200/40 bg-amber-400"
                : "h-9 w-9 group-hover:translate-y-0.5"
            )}
          >
            <Download
              className={cn("transition-all duration-500", isCompact ? "h-2.5 w-2.5" : "h-4 w-4")}
              aria-hidden
            />
          </span>
        </button>
      </div>

      {showGuide ? (
        <div
          className="fixed inset-0 z-100 flex items-end justify-center bg-slate-950/60 p-0 backdrop-blur-[2px] sm:items-center sm:p-4"
          role="dialog"
          aria-modal="true"
          aria-labelledby="install-guide-title"
          onClick={() => setShowGuide(false)}
        >
          <div
            className={cn(
              "w-full max-w-sm overflow-hidden bg-white shadow-2xl dark:bg-slate-900",
              "rounded-t-3xl sm:rounded-2xl",
              "motion-safe:animate-install-sheet-up sm:motion-safe:animate-scale-in"
            )}
            onClick={(event) => event.stopPropagation()}
          >
            <div className="relative overflow-hidden border-b border-amber-500/20 bg-linear-to-br from-amber-500 via-amber-500 to-orange-600 px-5 pb-5 pt-6 text-white">
              <span
                aria-hidden
                className="pointer-events-none absolute -right-8 -top-10 h-32 w-32 rounded-full bg-white/10 blur-2xl"
              />
              <div className="relative flex items-start justify-between gap-3">
                <div className="flex items-center gap-3">
                  <span className="flex h-12 w-12 items-center justify-center rounded-2xl border border-white/25 bg-white/15 shadow-inner backdrop-blur-sm">
                    <LogoMark size={32} className="rounded-lg" />
                  </span>
                  <div>
                    <h2 id="install-guide-title" className="text-lg font-bold">
                      Install SignalForge
                    </h2>
                    <p className="mt-0.5 text-sm text-amber-50/90">
                      {isIOS
                        ? "Add to your iPhone home screen"
                        : "Add to your Android home screen"}
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setShowGuide(false)}
                  className="cursor-pointer rounded-full border border-white/20 bg-black/10 p-1.5 text-white/90 transition-colors hover:bg-black/20"
                  aria-label="Close"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
            </div>

            <div className="space-y-3 px-5 py-5">
              <p className="text-sm text-gray-600 dark:text-slate-400">
                {isIOS
                  ? "Follow these steps in Safari to install the app."
                  : "Follow these steps in your browser to install the app."}
              </p>

              <ol className="space-y-2.5">
                {steps.map((step, index) => (
                  <li
                    key={index}
                    className="flex items-start gap-3 rounded-xl border border-gray-100 bg-gray-50/80 p-3 dark:border-slate-800 dark:bg-slate-800/50"
                  >
                    <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-linear-to-br from-amber-500 to-orange-500 text-xs font-bold text-white shadow-sm">
                      {index + 1}
                    </span>
                    <div className="min-w-0 pt-0.5">
                      <step.icon className="mb-1.5 h-4 w-4 text-amber-600 dark:text-amber-400" />
                      <p className="text-sm leading-relaxed text-gray-700 dark:text-slate-300">
                        {step.text}
                      </p>
                    </div>
                  </li>
                ))}
              </ol>

              <Button
                type="button"
                className="mt-1 w-full gap-2 bg-amber-500 hover:bg-amber-600"
                onClick={() => setShowGuide(false)}
              >
                <Smartphone className="h-4 w-4" />
                Got it
              </Button>
            </div>

            <div className="h-[max(0.75rem,env(safe-area-inset-bottom,0px))] bg-white dark:bg-slate-900 sm:hidden" />
          </div>
        </div>
      ) : null}
    </>
  );
}
