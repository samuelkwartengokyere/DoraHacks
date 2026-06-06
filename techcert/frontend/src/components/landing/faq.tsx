"use client";

import { useState } from "react";
import { ChevronDown } from "lucide-react";
import { cn } from "@/lib/utils";
import { AnimatedSection } from "@/components/ui/animated-section";

const faqs = [
  {
    q: "What is SignalForge AI?",
    a: "SignalForge is an autonomous trading agent platform built for the BNB Hack. It reads CoinMarketCap market data, generates trading signals, and executes (or paper-trades) on BNB Smart Chain via Trust Wallet Agent Kit.",
  },
  {
    q: "Which hackathon tracks does it support?",
    a: "Track 1 — Autonomous Agents: CMC signal → agent decision → TWAK execution. Track 2 — Strategy Skills: CMC skill pipeline with backtestable MA crossover on BNB hourly data.",
  },
  {
    q: "Do I need testnet BNB to demo?",
    a: "No. Paper mode simulates execution without tBNB. Add a funded BSC testnet wallet and set AGENT_EXECUTION_MODE=live when you are ready for on-chain swaps.",
  },
  {
    q: "What is the CoinMarketCap integration?",
    a: "SignalForge uses the CMC Pro API (Agent Hub) for live BNB quotes, global market metrics, and structured BUY/SELL/HOLD signals. Without an API key, mock signals are used for development.",
  },
  {
    q: "What is Trust Wallet Agent Kit (TWAK)?",
    a: "TWAK is the execution layer. When configured, the agent routes swap intents through TWAK on BSC testnet within your max trade size and confidence rules.",
  },
];

export function FAQSection() {
  const [open, setOpen] = useState<number | null>(0);

  return (
    <section id="faq" className="scroll-mt-24 bg-gray-50 py-16 dark:bg-slate-900 sm:py-20 lg:py-24">
      <div className="mx-auto max-w-3xl px-4 sm:px-6 lg:px-8">
        <AnimatedSection className="text-center">
          <h2 className="text-2xl font-bold text-gray-900 dark:text-slate-100 sm:text-3xl lg:text-4xl">
            Frequently Asked Questions
          </h2>
        </AnimatedSection>
        <div className="mt-10 space-y-3 sm:mt-12 sm:space-y-4">
          {faqs.map((faq, i) => (
            <AnimatedSection key={faq.q} delay={(i % 3) * 100 as 0 | 100 | 200} animation="scale-in">
              <div className="overflow-hidden rounded-lg border border-gray-200 bg-white transition-shadow duration-300 hover:shadow-sm dark:border-slate-700 dark:bg-slate-800">
                <button
                  className="flex w-full cursor-pointer items-center justify-between gap-4 px-4 py-4 text-left sm:px-6"
                  onClick={() => setOpen(open === i ? null : i)}
                  aria-expanded={open === i}
                >
                  <span className="font-medium text-gray-900 dark:text-slate-100">{faq.q}</span>
                  <ChevronDown
                    className={cn(
                      "h-5 w-5 shrink-0 text-gray-400 transition-transform duration-200",
                      open === i && "rotate-180"
                    )}
                  />
                </button>
                {open === i && (
                  <div className="border-t border-gray-100 px-4 py-4 sm:px-6 dark:border-slate-700">
                    <p className="text-sm text-gray-600 dark:text-slate-400">{faq.a}</p>
                  </div>
                )}
              </div>
            </AnimatedSection>
          ))}
        </div>
      </div>
    </section>
  );
}
