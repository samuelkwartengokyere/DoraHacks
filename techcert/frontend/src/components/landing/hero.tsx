"use client";

import Image from "next/image";
import { useCallback, useEffect, useState } from "react";
import { ArrowRight, ChevronLeft, ChevronRight, Zap } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn, navigateToSection } from "@/lib/utils";

const SLIDE_INTERVAL_MS = 6000;

const slides = [
  {
    id: "cmc-bsc-stack",
    image: "/hero/hero-blockchain.png",
    alt: "AI trading on BNB Chain",
    badge: "BNB Hack — AI Trading Agent Edition",
    headline: "Read CMC Signals. Decide.",
    highlight: "Execute on BSC",
    description:
      "SignalForge AI stacks CoinMarketCap Agent Hub, Trust Wallet Agent Kit, and BNB Chain into one autonomous trading console.",
  },
  {
    id: "strategy-skills",
    image: "/hero/hero-verification.png",
    alt: "Strategy skills backtesting",
    badge: "Track 2 — Strategy Skills",
    headline: "Backtestable CMC",
    highlight: "Strategy Pipelines",
    description:
      "Run pre-built skill workflows that turn market data into structured signals and backtested MA crossover strategies.",
  },
  {
    id: "twak-agents",
    image: "/hero/hero-certificates.png",
    alt: "Trust Wallet agent execution",
    badge: "Track 1 — Autonomous Agents",
    headline: "Self-Custody Execution via",
    highlight: "Trust Wallet Agent Kit",
    description:
      "Agents operate within your rules — paper trade locally or go live on BNB Smart Chain testnet when TWAK is configured.",
  },
] as const;

export function HeroSection() {
  const [activeIndex, setActiveIndex] = useState(0);
  const [paused, setPaused] = useState(false);

  const goTo = useCallback((index: number) => {
    setActiveIndex((index + slides.length) % slides.length);
  }, []);

  const goNext = useCallback(() => goTo(activeIndex + 1), [activeIndex, goTo]);
  const goPrev = useCallback(() => goTo(activeIndex - 1), [activeIndex, goTo]);

  useEffect(() => {
    if (paused) return;
    const prefersReducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (prefersReducedMotion) return;
    const timer = window.setInterval(goNext, SLIDE_INTERVAL_MS);
    return () => window.clearInterval(timer);
  }, [goNext, paused]);

  const slide = slides[activeIndex];

  return (
    <section
      className="relative min-h-[32rem] overflow-hidden sm:min-h-[36rem] lg:min-h-[42rem]"
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
      aria-roledescription="carousel"
      aria-label="SignalForge AI highlights"
    >
      {slides.map((item, index) => (
        <div
          key={item.id}
          className={cn(
            "absolute inset-0 transition-opacity duration-1000 ease-in-out",
            index === activeIndex ? "opacity-100" : "opacity-0"
          )}
          aria-hidden={index !== activeIndex}
        >
          <Image
            src={item.image}
            alt={item.alt}
            fill
            priority={index === 0}
            sizes="100vw"
            className="object-cover object-center"
          />
        </div>
      ))}

      <div className="pointer-events-none absolute inset-0 bg-gradient-to-b from-slate-900/75 via-slate-900/60 to-slate-950/85" />
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_top,rgba(245,158,11,0.2),transparent_55%)]" />

      <div className="relative z-10 mx-auto flex min-h-[32rem] max-w-7xl items-center px-4 py-16 sm:min-h-[36rem] sm:px-6 sm:py-20 lg:min-h-[42rem] lg:px-8 lg:py-28">
        <div className="mx-auto w-full max-w-3xl text-center">
          <div
            key={`badge-${activeIndex}`}
            className="motion-safe:animate-fade-in-down mb-5 inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/10 px-3 py-1.5 text-xs font-medium text-amber-100 backdrop-blur-sm sm:mb-6 sm:px-4 sm:text-sm"
          >
            <Zap className="h-4 w-4" />
            {slide.badge}
          </div>

          <h1
            key={`title-${activeIndex}`}
            className="motion-safe:animate-fade-in-up animate-fill-both text-3xl font-bold tracking-tight text-white sm:text-4xl md:text-5xl lg:text-6xl"
          >
            {slide.headline}{" "}
            <span className="text-amber-300">{slide.highlight}</span>
          </h1>

          <p
            key={`desc-${activeIndex}`}
            className="motion-safe:animate-fade-in-up animate-delay-100 animate-fill-both mx-auto mt-5 max-w-2xl text-base text-slate-200 sm:mt-6 sm:text-lg lg:text-xl"
          >
            {slide.description}
          </p>

          <div className="motion-safe:animate-fade-in-up animate-delay-200 animate-fill-both mt-8 flex flex-col items-stretch justify-center gap-3 sm:mt-10 sm:flex-row sm:items-center sm:gap-4">
            <Button
              type="button"
              size="lg"
              className="w-full gap-2 bg-amber-500 hover:bg-amber-600 sm:w-auto"
              onClick={() => navigateToSection("features")}
            >
              Explore the Stack <ArrowRight className="h-4 w-4" />
            </Button>
            <Button
              type="button"
              size="lg"
              variant="outline"
              className="w-full border-white/30 bg-white/10 text-white hover:bg-white/20 hover:text-white sm:w-auto"
              onClick={() => navigateToSection("how-it-works")}
            >
              How the Stack Works
            </Button>
          </div>
        </div>
      </div>

      <button
        type="button"
        onClick={goPrev}
        className="absolute left-3 top-1/2 z-10 hidden -translate-y-1/2 cursor-pointer rounded-full border border-white/20 bg-black/30 p-2 text-white backdrop-blur-sm transition-colors hover:bg-black/50 sm:left-6 sm:flex"
        aria-label="Previous slide"
      >
        <ChevronLeft className="h-5 w-5" />
      </button>

      <button
        type="button"
        onClick={goNext}
        className="absolute right-3 top-1/2 z-10 hidden -translate-y-1/2 cursor-pointer rounded-full border border-white/20 bg-black/30 p-2 text-white backdrop-blur-sm transition-colors hover:bg-black/50 sm:right-6 sm:flex"
        aria-label="Next slide"
      >
        <ChevronRight className="h-5 w-5" />
      </button>

      <div className="absolute bottom-6 left-1/2 z-10 flex -translate-x-1/2 gap-2 sm:bottom-8">
        {slides.map((item, index) => (
          <button
            key={item.id}
            type="button"
            onClick={() => goTo(index)}
            className={cn(
              "h-2.5 cursor-pointer rounded-full transition-all duration-300",
              index === activeIndex ? "w-8 bg-amber-400" : "w-2.5 bg-white/40 hover:bg-white/70"
            )}
            aria-label={`Go to slide ${index + 1}`}
            aria-current={index === activeIndex ? "true" : undefined}
          />
        ))}
      </div>
    </section>
  );
}
