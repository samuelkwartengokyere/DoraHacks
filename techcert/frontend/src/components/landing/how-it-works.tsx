import { AnimatedSection } from "@/components/ui/animated-section";

const steps = [
  {
    step: "01",
    title: "CMC Agent Hub",
    description: "Pull structured BNB market signals — regime, momentum, volume — from CoinMarketCap.",
  },
  {
    step: "02",
    title: "Agent Decision",
    description: "SignalForge scores confidence and chooses BUY, SELL, or HOLD within your risk limits.",
  },
  {
    step: "03",
    title: "TWAK Execution",
    description: "Trust Wallet Agent Kit signs and submits swaps on BNB Smart Chain testnet (or paper mode).",
  },
  {
    step: "04",
    title: "Audit & Backtest",
    description: "Review trade logs on-chain and run Track 2 strategy skills with backtested P&L.",
  },
];

export function HowItWorksSection() {
  return (
    <section id="how-it-works" className="scroll-mt-24 bg-white py-16 dark:bg-slate-950 sm:py-20 lg:py-24">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <AnimatedSection className="text-center">
          <h2 className="text-2xl font-bold text-gray-900 dark:text-slate-100 sm:text-3xl lg:text-4xl">How It Works</h2>
          <p className="mt-3 text-base text-gray-600 dark:text-slate-400 sm:mt-4 sm:text-lg">
            The autonomous trading agent loop for BNB Hack
          </p>
        </AnimatedSection>
        <div className="mt-12 grid gap-8 sm:mt-16 sm:grid-cols-2 lg:grid-cols-4">
          {steps.map((item, index) => (
            <AnimatedSection key={item.step} delay={(index * 100) as 0 | 100 | 200 | 300} className="relative text-center">
              <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-amber-500 text-base font-bold text-white transition-transform duration-300 hover:scale-110 sm:h-14 sm:w-14 sm:text-lg">
                {item.step}
              </div>
              <h3 className="mt-3 text-base font-semibold text-gray-900 dark:text-slate-100 sm:mt-4 sm:text-lg">{item.title}</h3>
              <p className="mt-2 text-sm text-gray-600 dark:text-slate-400">{item.description}</p>
            </AnimatedSection>
          ))}
        </div>
      </div>
    </section>
  );
}
